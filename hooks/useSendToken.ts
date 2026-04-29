import { ethereumAccountAtom, ethersProviderAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeApiAtom } from "@/store/snowbridge";
import {
  MessageReceipt,
  SignerInfo,
  ValidationData,
  ValidationResult,
} from "@/utils/types";
import { type SnowbridgeClient } from "@/lib/snowbridge";
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
  if (destination.kind !== "ethereum" && destination.kind !== "ethereum_l2") {
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
    signer,
  };
}

async function validateEthereumSignerWithParachain(
  data: ValidationData,
  info: SignerInfo,
) {
  const signer = await validateEthereumSigner(data, info);
  return {
    ...signer,
    paraInfo: validateEthereumDestination(data),
  };
}

async function planSend(
  api: SnowbridgeClient,
  data: ValidationData,
): Promise<ValidationResult> {
  const { source, destination, amountInSmallestUnit, formData, fee } = data;
  const sender = api.sender(source, destination);

  switch (sender.kind) {
    case "ethereum->ethereum": {
      if (fee.kind !== sender.kind) {
        throw Error(`Invalid delivery fee kind ${fee.kind}.`);
      }
      const transfer = await sender.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee,
      );
      return await sender.validate(transfer);
    }
    case "ethereum->polkadot": {
      if (fee.kind !== sender.kind) {
        throw Error(`Invalid delivery fee kind ${fee.kind}.`);
      }
      if (!("feeAsset" in fee)) {
        throw Error(`Invalid delivery fee shape for ${sender.kind}.`);
      }
      const transfer = await sender.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee,
      );
      return await sender.validate(transfer);
    }
    case "polkadot->ethereum": {
      if (fee.kind !== sender.kind) {
        throw Error(`Invalid delivery fee kind ${fee.kind}.`);
      }
      const transfer = await sender.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee,
      );
      return await sender.validate(transfer);
    }
    case "polkadot->polkadot": {
      if (fee.kind !== sender.kind) {
        throw Error(`Invalid delivery fee kind ${fee.kind}.`);
      }
      const transfer = await sender.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee,
      );
      return await sender.validate(transfer);
    }
    case "polkadot->ethereum_l2": {
      if (fee.kind !== sender.kind) {
        throw Error(`Invalid delivery fee kind ${fee.kind}.`);
      }
      const transfer = await sender.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee,
      );
      return await sender.validate(transfer);
    }
    case "ethereum_l2->polkadot": {
      if (source.kind !== "ethereum_l2") {
        throw Error(
          `Invalid source ${source.key}, expected ethereum_l2 source.`,
        );
      }
      if (fee.kind !== sender.kind) {
        throw Error(`Invalid delivery fee kind ${fee.kind}.`);
      }
      const l2asset = Object.values(source.ethChain.assets).find(
        (x) =>
          x.swapTokenAddress?.toLowerCase() === formData.token.toLowerCase(),
      );
      if (!l2asset) {
        throw Error(`Could not find l2 token for l1 token ${formData.token}`);
      }
      return await sender.validate(
        await sender.tx(
          formData.sourceAccount,
          formData.beneficiary,
          l2asset.token,
          amountInSmallestUnit,
          fee,
        ),
      );
    }
    default:
      throw Error(`Cannot route transfer ${sender.kind}.`);
  }
}

async function sendToken(
  api: SnowbridgeClient,
  data: ValidationData,
  plan: ValidationResult,
  signerInfo: SignerInfo,
): Promise<MessageReceipt> {
  if (!plan.success) {
    throw Error(`Cannot execute a failed plan.`, {
      cause: plan,
    });
  }
  const sender = api.sender(data.source, data.destination);

  switch (sender.kind) {
    case "polkadot->polkadot": {
      if (plan.kind !== sender.kind) {
        throw Error(`Invalid validated transfer kind ${plan.kind}.`);
      }
      const { polkadotAccount } = validateSubstrateSigner(
        data,
        signerInfo,
        true,
      );
      const result = await sender.signAndSend(plan, polkadotAccount.address, {
        signer: polkadotAccount.signer as any,
        withSignedTransaction: true,
      });
      console.log(result);
      return { kind: sender.kind, ...result };
    }
    case "ethereum->ethereum": {
      if (plan.kind !== sender.kind) {
        throw Error(`Invalid validated transfer kind ${plan.kind}.`);
      }
      const { signer } = await validateEvmSubstrateSigner(data, signerInfo);
      const response = await signer.sendTransaction(plan.tx);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const result = await sender.messageId(receipt);
      console.log(result);
      return { kind: sender.kind, ...result };
    }
    case "polkadot->ethereum":
    case "polkadot->ethereum_l2": {
      if (plan.kind !== sender.kind) {
        throw Error(`Invalid validated transfer kind ${plan.kind}.`);
      }
      const { paraInfo, polkadotAccount } = validateSubstrateSigner(
        data,
        signerInfo,
        false,
      );
      console.log(`[sendToken] Sending from parachain ${paraInfo.id}.`);
      const result = await sender.signAndSend(plan, polkadotAccount.address, {
        signer: polkadotAccount.signer as any,
        withSignedTransaction: true,
      });
      console.log(result);
      return { kind: sender.kind, ...result };
    }
    case "ethereum->polkadot": {
      if (plan.kind !== sender.kind) {
        throw Error(`Invalid validated transfer kind ${plan.kind}.`);
      }
      const { signer } = await validateEthereumSignerWithParachain(
        data,
        signerInfo,
      );
      const response = await signer.sendTransaction(plan.tx);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const result = await sender.messageId(receipt);
      if (!result) {
        throw Error(`Could not fetch message receipt.`);
      }
      console.log(result);
      return { kind: sender.kind, ...result };
    }
    case "ethereum_l2->polkadot": {
      if (plan.kind !== sender.kind) {
        throw Error(`Invalid validated transfer kind ${plan.kind}.`);
      }
      const { signer } = await validateEthereumSigner(data, signerInfo);
      const response = await signer.sendTransaction(plan.tx);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const result = await sender.messageId(receipt);
      if (!result) {
        throw Error(`Could not fetch message receipt.`);
      }
      console.log(result);
      return { kind: sender.kind, ...result };
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
  const api = useAtomValue(snowbridgeApiAtom);
  const plan = useCallback(
    async (data: ValidationData) => {
      if (api === null) throw Error("No api");
      return await planSend(api, data);
    },
    [api],
  );

  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);
  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const send = useCallback(
    async (data: ValidationData, plan: ValidationResult) => {
      if (api === null) throw Error("No api");
      return await sendToken(api, data, plan, {
        polkadotAccount: (polkadotAccounts ?? []).find(
          (pa) => pa.address === data.formData.sourceAccount,
        ),
        ethereumAccount: ethereumAccount ?? undefined,
        ethereumProvider: ethereumProvider ?? undefined,
      });
    },
    [api, polkadotAccounts, ethereumAccount, ethereumProvider],
  );
  return [plan, send];
}
