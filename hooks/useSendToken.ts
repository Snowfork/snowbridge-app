import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { inferTransferType } from "@/utils/inferTransferType";
import {
  MessageReceipt,
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
  forInterParachain,
  toEthereumSnowbridgeV2,
  toPolkadotSnowbridgeV2,
  assetsV2,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

function validateEvmSubstrateDestination({
  source,
  destination,
}: ValidationData) {
  if (source.kind !== "ethereum") {
    throw Error(`Invalid form state: source type mismatch.`);
  }
  if (destination.kind !== "ethereum") {
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
  if (source.kind !== "polkadot") {
    throw Error(`Invalid form state: source type mismatch.`);
  }
  if (destination.kind !== "ethereum") {
    throw Error(`Invalid form state: destination type mismatch.`);
  }
  if (source.parachain === undefined) {
    throw Error(`Invalid form state: source does not have parachain info.`);
  }
  return source.parachain;
}

function validateInterParachainTransfer({
  source,
  destination,
}: ValidationData) {
  if (source.kind !== "polkadot") {
    throw Error(`Invalid form state: source type mismatch.`);
  }
  if (destination.kind !== "polkadot") {
    throw Error(`Invalid form state: destination type mismatch.`);
  }
  if (source.parachain === undefined) {
    throw Error(`Invalid form state: source does not have parachain info.`);
  }
  if (destination.parachain === undefined) {
    throw Error(
      `Invalid form state: destination does not have parachain info.`,
    );
  }
  return { source: source.parachain, destination: destination.parachain };
}

function validateEthereumDestination({ source, destination }: ValidationData) {
  if (source.kind !== "ethereum") {
    throw Error(`Invalid form state: source type mismatch.`);
  }
  if (destination.kind !== "polkadot") {
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
  if (network.chainId !== BigInt(ethChain.id)) {
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
  substrateDestination: boolean,
) {
  if (!polkadotAccount) {
    throw Error(`Polkadot Wallet not connected.`);
  }
  if (polkadotAccount.address !== data.formData.sourceAccount) {
    throw Error(`Source account mismatch.`);
  }
  return {
    paraInfo: substrateDestination
      ? validateInterParachainTransfer(data).source
      : validateSubstrateDestination(data),
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
): Promise<ValidationResult> {
  const {
    source,
    destination,
    amountInSmallestUnit,
    formData,
    assetRegistry,
    fee,
  } = data;
  const transferType = inferTransferType(source, destination);
  switch (transferType) {
    case "ethereum->ethereum": {
      const { parachain } = validateEvmSubstrateDestination(data);
      const tx = await toEthereumFromEVMV2.createTransferEvm(
        { sourceParaId: parachain.id, context },
        assetRegistry,
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee.delivery as toEthereumV2.DeliveryFee,
      );
      const plan = await toEthereumFromEVMV2.validateTransferEvm(context, tx);
      console.log(plan);
      return { kind: transferType, ...plan };
    }
    case "polkadot->ethereum": {
      const parachain = validateSubstrateDestination(data);

      const useV2 = assetsV2.supportsPolkadotToEthereumV2(parachain);
      let plan;
      if (useV2) {
        console.log(
          `[planSend] Snowbridge V2: Source parachain ${parachain.id} to Ethereum.`,
        );
        const transferImpl =
          toEthereumSnowbridgeV2.createTransferImplementation(
            parachain.id,
            assetRegistry,
            formData.token,
          );
        const tx = await transferImpl.createTransfer(
          { sourceParaId: parachain.id, context },
          assetRegistry,
          formData.sourceAccount,
          formData.beneficiary,
          formData.token,
          amountInSmallestUnit,
          fee.delivery as toEthereumV2.DeliveryFee,
        );
        plan = await transferImpl.validateTransfer(context, tx);
      } else {
        const tx = await toEthereumV2.createTransfer(
          { sourceParaId: parachain.id, context },
          assetRegistry,
          formData.sourceAccount,
          formData.beneficiary,
          formData.token,
          amountInSmallestUnit,
          fee.delivery as toEthereumV2.DeliveryFee,
        );
        plan = await toEthereumV2.validateTransfer(context, tx);
      }
      console.log(plan);
      return { kind: transferType, ...plan };
    }
    case "ethereum->polkadot": {
      const paraInfo = validateEthereumDestination(data);

      const useV2 = assetsV2.supportsEthereumToPolkadotV2(paraInfo);
      let plan;
      if (useV2) {
        console.log(
          `[planSend] Snowbridge V2: Ethereum to Destination parachain ${paraInfo.id}.`,
        );
        const transferImpl =
          toPolkadotSnowbridgeV2.createTransferImplementation(
            paraInfo.id,
            assetRegistry,
            formData.token,
          );
        const tx = await transferImpl.createTransfer(
          context,
          assetRegistry,
          paraInfo.id,
          formData.sourceAccount,
          formData.beneficiary,
          formData.token,
          amountInSmallestUnit,
          fee.delivery as toPolkadotSnowbridgeV2.DeliveryFee,
        );
        plan = await transferImpl.validateTransfer(context, tx);
      } else {
        const tx = await toPolkadotV2.createTransfer(
          assetRegistry,
          formData.sourceAccount,
          formData.beneficiary,
          formData.token,
          paraInfo.id,
          amountInSmallestUnit,
          fee.delivery as toPolkadotV2.DeliveryFee,
        );
        plan = await toPolkadotV2.validateTransfer(
          {
            assetHub: await context.assetHub(),
            bridgeHub: await context.bridgeHub(),
            ethereum: context.ethereum(),
            gateway: context.gateway(),
            destParachain: await context.parachain(paraInfo.id),
          },
          tx,
        );
      }
      console.log(plan);
      return { kind: transferType, ...plan };
    }
    case "polkadot->polkadot": {
      const { source: s, destination: d } =
        validateInterParachainTransfer(data);
      const tx = await forInterParachain.createTransfer(
        { sourceParaId: s.id, context },
        assetRegistry,
        formData.sourceAccount,
        formData.beneficiary,
        d.id,
        formData.token,
        amountInSmallestUnit,
        fee.delivery as forInterParachain.DeliveryFee,
      );
      const plan = await forInterParachain.validateTransfer(
        {
          sourceParaId: s.id,
          destinationParaId: d.id,
          context,
        },
        tx,
      );
      console.log(plan);
      return { kind: transferType, ...plan };
    }
    case "polkadot->ethereum_l2": {
      const l2transfer = toEthereumSnowbridgeV2.createL2TransferImplementation(
        source.id,
        assetRegistry,
        formData.token,
      );
      const tx = await l2transfer.createTransfer(
        context,
        assetRegistry,
        destination.id,
        formData.token,
        amountInSmallestUnit,
        formData.sourceAccount,
        formData.beneficiary,
        fee.delivery as toEthereumV2.DeliveryFee,
      );
      const plan = await l2transfer.validateTransfer(context, tx);
      console.log(plan);
      return { kind: transferType, ...plan };
    }
    default:
      throw Error(`Invalid form state: cannot infer source ${transferType}.`);
  }
}

async function sendToken(
  context: Context,
  data: ValidationData,
  plan: ValidationResult,
  signerInfo: SignerInfo,
): Promise<MessageReceipt> {
  if (!plan.success) {
    throw Error(`Cannot execute a failed plan.`, {
      cause: plan,
    });
  }
  const { source, destination } = data;

  switch (plan.kind) {
    case "polkadot->polkadot": {
      const { paraInfo, polkadotAccount } = validateSubstrateSigner(
        data,
        signerInfo,
        true,
      );
      const tx = plan.transfer as forInterParachain.Transfer;
      const result = await forInterParachain.signAndSend(
        { sourceParaId: paraInfo.id, context },
        tx,
        polkadotAccount.address,
        {
          signer: polkadotAccount.signer! as Signer,
          withSignedTransaction: true,
        },
      );
      console.log(result);
      return result;
    }
    case "ethereum->ethereum": {
      const { signer } = await validateEvmSubstrateSigner(data, signerInfo);
      const transfer = plan.transfer as toEthereumFromEVMV2.TransferEvm;
      const response = await signer.sendTransaction(transfer.tx);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const result = await toEthereumFromEVMV2.getMessageReceipt(
        { sourceParaId: source.parachain!.id, context },
        receipt,
      );
      console.log(result);
      return result;
    }
    case "polkadot->ethereum": {
      const { paraInfo, polkadotAccount } = validateSubstrateSigner(
        data,
        signerInfo,
        false,
      );

      const useV2 = assetsV2.supportsPolkadotToEthereumV2(paraInfo);
      let result;
      if (useV2) {
        console.log(
          `[sendToken] Snowbridge V2: Source parachain ${paraInfo.id} to Ethereum.`,
        );
        const tx = plan.transfer as toEthereumV2.Transfer;
        result = await toEthereumSnowbridgeV2.signAndSend(
          context,
          tx,
          polkadotAccount.address,
          {
            signer: polkadotAccount.signer! as Signer,
            withSignedTransaction: true,
          },
        );
      } else {
        const tx = plan.transfer as toEthereumV2.Transfer;
        result = await toEthereumV2.signAndSend(
          context,
          tx,
          polkadotAccount.address,
          {
            signer: polkadotAccount.signer! as Signer,
            withSignedTransaction: true,
          },
        );
      }
      console.log(result);
      return result;
    }
    case "ethereum->polkadot": {
      const { signer, paraInfo } = await validateEthereumSigner(
        data,
        signerInfo,
      );

      const useV2 = assetsV2.supportsEthereumToPolkadotV2(paraInfo);
      let result;
      if (useV2) {
        console.log(
          `[sendToken] Snowbridge V2: Destination parachain ${paraInfo.id}`,
        );
        const transfer = plan.transfer as toPolkadotSnowbridgeV2.Transfer;
        const response = await signer.sendTransaction(transfer.tx);
        const receipt = await response.wait();
        if (!receipt) {
          throw Error(`Could not fetch transaction receipt.`);
        }
        result = await toPolkadotSnowbridgeV2.getMessageReceipt(receipt);
        if (!result) {
          throw Error(`Could not fetch message receipt.`);
        }
        result = { ...result, messageId: receipt.hash, channelId: "" };
      } else {
        const transfer = plan.transfer as toPolkadotV2.Transfer;
        const response = await signer.sendTransaction(transfer.tx);
        const receipt = await response.wait();
        if (!receipt) {
          throw Error(`Could not fetch transaction receipt.`);
        }
        result = await toPolkadotV2.getMessageReceipt(receipt);
        if (!result) {
          throw Error(`Could not fetch message receipt.`);
        }
      }
      console.log(result);
      return result;
    }
    default: {
      throw Error(`Invalid form state: cannot infer source type.`);
    }
  }
}

export function useSendToken(): [
  (data: ValidationData) => Promise<ValidationResult>,
  (data: ValidationData, plan: ValidationResult) => Promise<MessageReceipt>,
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
