import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  MessageReciept,
  SignerInfo,
  ValidationData,
  ValidationResult,
} from "@/utils/types";
import { Signer } from "@polkadot/api/types";
import {
  Context,
  toEthereumV2,
  toEthereumFromEVMV2,
  toPolkadotV2,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

function validateEvmSubstrateDestination({
  source,
  destination,
}: ValidationData) {
  if (source.type !== "ethereum") {
    throw Error(`Invalid form state: source type mismatch.`);
  }
  if (destination.type !== "ethereum") {
    throw Error(`Invalid form state: destination type mismatch.`);
  }
  if (source.parachain === undefined) {
    throw Error(`Invalid form state: source does not have parachain info.`);
  }
  if (source.ethChain === undefined) {
    throw Error(`Invalid form state: source does not have ethereum info.`);
  }
  return { parachain: source.parachain, ethChain: source.ethChain };
}

function validateSubstrateDestination({ source, destination }: ValidationData) {
  if (source.type !== "substrate") {
    throw Error(`Invalid form state: source type mismatch.`);
  }
  if (destination.type !== "ethereum") {
    throw Error(`Invalid form state: destination type mismatch.`);
  }
  if (source.parachain === undefined) {
    throw Error(`Invalid form state: source does not have parachain info.`);
  }
  return source.parachain;
}

function validateEthereumDestination({ source, destination }: ValidationData) {
  if (source.type !== "ethereum") {
    throw Error(`Invalid form state: source type mismatch.`);
  }
  if (destination.type !== "substrate") {
    throw Error(`Invalid form state: destination type mismatch.`);
  }
  if (destination.parachain === undefined) {
    throw Error(`Invalid form state: destination does not have parachain id.`);
  }
  return destination.parachain;
}

async function validateEvmSubstrateSigner(
  data: ValidationData,
  { ethereumAccount, ethereumProvider }: SignerInfo,
) {
  if (!ethereumProvider) throw Error(`Ethereum Wallet not connected.`);
  if (!ethereumAccount) throw Error(`Wallet account not selected.`);
  if (ethereumAccount !== data.formData.sourceAccount) {
    throw Error(`Selected account does not match source data.`);
  }
  const signer = await ethereumProvider.getSigner(ethereumAccount);

  const { ethChain, parachain } = validateEvmSubstrateDestination(data);
  const network = await ethereumProvider.getNetwork();
  if (network.chainId !== BigInt(ethChain.chainId)) {
    throw Error(`Ethereum provider chainId mismatch.`);
  }
  if (
    signer.address.toLowerCase() !== data.formData.sourceAccount.toLowerCase()
  ) {
    throw Error(`Source account mismatch.`);
  }
  return {
    ethereumAccount,
    ethereumProvider,
    network,
    ethChain,
    parachain,
    signer,
  };
}

function validateSubstrateSigner(
  data: ValidationData,
  { polkadotAccount }: SignerInfo,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  if (polkadotAccount.address !== data.formData.sourceAccount) {
    throw Error(`Source account mismatch.`);
  }
  return {
    paraInfo: validateSubstrateDestination(data),
    polkadotAccount,
  };
}

async function validateEthereumSigner(
  data: ValidationData,
  { ethereumAccount, ethereumProvider }: SignerInfo,
) {
  if (!ethereumProvider) throw Error(`Ethereum Wallet not connected.`);
  if (!ethereumAccount) throw Error(`Wallet account not selected.`);
  if (ethereumAccount !== data.formData.sourceAccount) {
    throw Error(`Selected account does not match source data.`);
  }
  const signer = await ethereumProvider.getSigner(ethereumAccount);
  if (
    signer.address.toLowerCase() !== data.formData.sourceAccount.toLowerCase()
  ) {
    throw Error(`Source account mismatch.`);
  }
  return {
    ethereumAccount,
    ethereumProvider,
    paraInfo: validateEthereumDestination(data),
    signer,
  };
}

async function planSend(
  context: Context,
  data: ValidationData,
): Promise<
  | toEthereumV2.ValidationResult
  | toPolkadotV2.ValidationResult
  | toEthereumFromEVMV2.ValidationResultEvm
> {
  const {
    source,
    destination,
    amountInSmallestUnit,
    formData,
    assetRegistry,
    fee,
  } = data;
  if (source.type === "ethereum" && destination.type === "ethereum") {
    const { parachain } = validateEvmSubstrateDestination(data);
    const tx = await toEthereumFromEVMV2.createTransferEvm(
      { sourceParaId: parachain.parachainId, context },
      assetRegistry,
      formData.sourceAccount,
      formData.beneficiary,
      formData.token,
      amountInSmallestUnit,
      fee.delivery as toEthereumV2.DeliveryFee,
    );
    const plan = await toEthereumFromEVMV2.validateTransferEvm(context, tx);
    console.log(plan);
    return plan;
  } else if (source.type === "substrate" && destination.type === "ethereum") {
    const parachain = validateSubstrateDestination(data);
    const tx = await toEthereumV2.createTransfer(
      { sourceParaId: parachain.parachainId, context },
      assetRegistry,
      formData.sourceAccount,
      formData.beneficiary,
      formData.token,
      amountInSmallestUnit,
      fee.delivery as toEthereumV2.DeliveryFee,
    );
    const plan = await toEthereumV2.validateTransfer(context, tx);
    console.log(plan);
    return plan;
  } else if (source.type === "ethereum" && destination.type === "substrate") {
    const paraInfo = validateEthereumDestination(data);
    const tx = await toPolkadotV2.createTransfer(
      assetRegistry,
      formData.sourceAccount,
      formData.beneficiary,
      formData.token,
      paraInfo.parachainId,
      amountInSmallestUnit,
      fee.delivery as toPolkadotV2.DeliveryFee,
    );
    const plan = await toPolkadotV2.validateTransfer(
      {
        assetHub: await context.assetHub(),
        bridgeHub: await context.bridgeHub(),
        ethereum: context.ethereum(),
        gateway: context.gateway(),
        destParachain: await context.parachain(paraInfo.parachainId),
      },
      tx,
    );
    console.log(plan);
    return plan;
  } else {
    throw Error(`Invalid form state: cannot infer source type.`);
  }
}

async function sendToken(
  context: Context,
  data: ValidationData,
  plan: ValidationResult,
  signerInfo: SignerInfo,
): Promise<MessageReciept> {
  if (!plan.success) {
    throw Error(`Cannot execute a failed plan.`, {
      cause: plan,
    });
  }
  const { source, destination } = data;
  if (source.type === "ethereum" && destination.type === "ethereum") {
    const { signer } = await validateEvmSubstrateSigner(data, signerInfo);
    const transfer = plan.transfer as toEthereumFromEVMV2.TransferEvm;
    const response = await signer.sendTransaction(transfer.tx);
    const receipt = await response.wait();
    if (!receipt) {
      throw Error(`Could not fetch transaction receipt.`);
    }
    const result = await toEthereumFromEVMV2.getMessageReceipt(
      { sourceParaId: source.parachain!.parachainId, context },
      receipt,
    );
    console.log(result);
    return result;
  } else if (source.type === "substrate" && destination.type === "ethereum") {
    const { paraInfo, polkadotAccount } = validateSubstrateSigner(
      data,
      signerInfo,
    );
    const tx = plan.transfer as toEthereumV2.Transfer;
    const result = await toEthereumV2.signAndSend(
      context,
      tx,
      polkadotAccount.address,
      {
        signer: polkadotAccount.signer! as Signer,
        withSignedTransaction: true,
      },
    );
    console.log(result);
    return result;
  } else if (source.type === "ethereum" && destination.type === "substrate") {
    const { signer } = await validateEthereumSigner(data, signerInfo);
    const transfer = plan.transfer as toPolkadotV2.Transfer;
    const response = await signer.sendTransaction(transfer.tx);
    const receipt = await response.wait();
    if (!receipt) {
      throw Error(`Could not fetch transaction receipt.`);
    }
    const result = await toPolkadotV2.getMessageReceipt(receipt);
    if (!result) {
      throw Error(`Could not fetch message receipt.`);
    }
    console.log(result);
    return result;
  } else {
    throw Error(`Invalid form state: cannot infer source type.`);
  }
}

export function useSendToken(): [
  (data: ValidationData) => Promise<ValidationResult>,
  (data: ValidationData, plan: ValidationResult) => Promise<MessageReciept>,
] {
  const context = useAtomValue(snowbridgeContextAtom);
  const plan = useCallback(
    async (data: ValidationData) => {
      if (context === null) throw Error("No context");
      return await planSend(context, data);
    },
    [context],
  );

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const send = useCallback(
    async (data: ValidationData, plan: ValidationResult) => {
      if (context === null) throw Error("No context");
      return await sendToken(context, data, plan, {
        polkadotAccount: (polkadotAccounts ?? []).find(
          (pa) => pa.address === data.formData.sourceAccount,
        ),
        ethereumAccount: ethereumAccount ?? undefined,
        ethereumProvider: ethereumProvider ?? undefined,
      });
    },
    [context, polkadotAccounts, ethereumAccount, ethereumProvider],
  );
  return [plan, send];
}
