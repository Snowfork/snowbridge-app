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
import { AppContext, getEnvironmentName } from "@/lib/snowbridge";
import {
  toEthereumV2,
  toEthereumFromEVMV2,
  toPolkadotV2,
  forInterParachain,
  toEthereumSnowbridgeV2,
  toPolkadotSnowbridgeV2,
  toKusamaSnowbridgeV2,
  fromKusamaSnowbridgeV2,
  assetsV2,
} from "@snowbridge/api";
import { bridgeInfoFor } from "@snowbridge/registry";
import { ERC20FromAH as ERC20FromAHToL2 } from "@snowbridge/api/src/transfers/polkadotToL2/erc20ToL2";
import { ERC20ToAH as ERC20FromL2ToAH } from "@snowbridge/api/src/transfers/l2ToPolkadot/erc20ToAH";
import { EthersProviderTypes } from "@snowbridge/provider-ethers";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

function buildRoute(
  source: { kind: string; id: number },
  destination: { kind: string; id: number },
) {
  return {
    from: { kind: source.kind, id: source.id },
    to: { kind: destination.kind, id: destination.id },
    assets: [],
  };
}

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
  context: AppContext,
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
  const route = buildRoute(source, destination);

  switch (transferType) {
    case "ethereum->ethereum": {
      const { parachain, ethChain } = validateEvmSubstrateDestination(data);
      const sourceEthChain =
        assetRegistry.ethereumChains[`ethereum_${source.id}`];
      const destinationEthChain =
        assetRegistry.ethereumChains[`ethereum_${destination.id}`];
      const transferImpl = new toEthereumFromEVMV2.V1ToEthereumEvmAdapter(
        context,
        assetRegistry,
        route as any,
        sourceEthChain,
        destinationEthChain,
      );
      const tx = await transferImpl.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee.delivery as toEthereumV2.DeliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    case "polkadot->ethereum": {
      const parachain = validateSubstrateDestination(data);
      const destinationEthChain =
        assetRegistry.ethereumChains[`ethereum_${destination.id}`];

      const useV2 = assetsV2.supportsPolkadotToEthereumV2(parachain);
      let transferImpl: toEthereumSnowbridgeV2.TransferToEthereum<EthersProviderTypes> | toEthereumV2.V1ToEthereumAdapter<EthersProviderTypes>;
      if (useV2) {
        console.log(
          `[planSend] Snowbridge V2: Source parachain ${parachain.id} to Ethereum.`,
        );
        transferImpl = new toEthereumSnowbridgeV2.TransferToEthereum(
          context,
          route as any,
          assetRegistry,
          parachain,
          destinationEthChain,
        );
      } else {
        transferImpl = new toEthereumV2.V1ToEthereumAdapter(
          context,
          assetRegistry,
          route as any,
          parachain,
          destinationEthChain,
        );
      }
      const tx = await transferImpl.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee.delivery as toEthereumV2.DeliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    case "ethereum->polkadot": {
      const paraInfo = validateEthereumDestination(data);
      const sourceEthChain =
        assetRegistry.ethereumChains[`ethereum_${source.id}`];

      const useV2 = assetsV2.supportsEthereumToPolkadotV2(paraInfo);
      let transferImpl: toPolkadotSnowbridgeV2.TransferToPolkadot<EthersProviderTypes> | toPolkadotV2.V1ToPolkadotAdapter<EthersProviderTypes>;
      if (useV2) {
        console.log(
          `[planSend] Snowbridge V2: Ethereum to Destination parachain ${paraInfo.id}.`,
        );
        transferImpl = new toPolkadotSnowbridgeV2.TransferToPolkadot(
          context,
          route as any,
          assetRegistry,
          sourceEthChain,
          paraInfo,
        );
      } else {
        transferImpl = new toPolkadotV2.V1ToPolkadotAdapter(
          context,
          assetRegistry,
          route as any,
          sourceEthChain,
          paraInfo,
        );
      }
      const tx = await transferImpl.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee.delivery as toPolkadotSnowbridgeV2.DeliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    case "polkadot->polkadot": {
      const { source: s, destination: d } =
        validateInterParachainTransfer(data);
      const info = bridgeInfoFor(getEnvironmentName());
      const transferImpl = new forInterParachain.InterParachainTransfer(
        info,
        context,
        route as any,
        s,
        d,
      );
      const tx = await transferImpl.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        fee.delivery as forInterParachain.DeliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    case "ethereum->kusama": {
      const kusamaPara =
        assetRegistry.kusama?.parachains[`kusama_${destination.id}`];
      if (!kusamaPara)
        throw Error(`Kusama parachain ${destination.id} not found in registry.`);

      const transferImpl = new toKusamaSnowbridgeV2.TransferToKusama(
        context,
        route as any,
        assetRegistry,
        assetRegistry.ethereumChains[`ethereum_${source.id}`],
        kusamaPara,
      );
      const deliveryFee = await transferImpl.fee(formData.token);
      const tx = await transferImpl.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        deliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    case "kusama->ethereum": {
      const kusamaPara =
        assetRegistry.kusama?.parachains[`kusama_${source.id}`];
      if (!kusamaPara)
        throw Error(`Kusama parachain ${source.id} not found in registry.`);

      const transferImpl = new fromKusamaSnowbridgeV2.TransferFromKusama(
        context,
        route as any,
        assetRegistry,
        kusamaPara,
        assetRegistry.ethereumChains[`ethereum_${destination.id}`],
      );
      const deliveryFee = await transferImpl.fee(formData.token);
      const tx = await transferImpl.tx(
        formData.sourceAccount,
        formData.beneficiary,
        formData.token,
        amountInSmallestUnit,
        deliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    case "polkadot->ethereum_l2": {
      const parachain = validateSubstrateDestination(data);
      const destinationEthChain =
        assetRegistry.ethereumChains[`ethereum_l2_${destination.id}`];
      if (!destinationEthChain)
        throw Error(
          `Ethereum L2 chain ${destination.id} not found in registry.`,
        );

      const transferImpl = new ERC20FromAHToL2(
        context as any,
        assetRegistry,
        route as any,
        parachain,
        destinationEthChain,
      );
      const tx = await transferImpl.tx(
        formData.token,
        amountInSmallestUnit,
        formData.sourceAccount,
        formData.beneficiary,
        fee.delivery as toEthereumV2.DeliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    case "ethereum_l2->polkadot": {
      if (source.kind !== "ethereum_l2")
        throw `Invalid source ${source.key}, expected ethereum_l2 source.`;
      const l2asset = Object.values(source.ethChain!.assets).find(
        (x) =>
          x.swapTokenAddress?.toLowerCase() === formData.token.toLowerCase(),
      );
      if (!l2asset)
        throw Error(`Could not find l2 token for l1 token ${formData.token}`);

      const sourceEthChain =
        assetRegistry.ethereumChains[`ethereum_l2_${source.id}`];
      if (!sourceEthChain)
        throw Error(`Ethereum L2 chain ${source.id} not found in registry.`);
      const destParachain =
        assetRegistry.parachains[`polkadot_${destination.id}`];
      if (!destParachain)
        throw Error(`Parachain ${destination.id} not found in registry.`);

      const transferImpl = new ERC20FromL2ToAH(
        context as any,
        assetRegistry,
        route as any,
        sourceEthChain,
        destParachain,
      );
      const tx = await transferImpl.tx(
        l2asset.token,
        amountInSmallestUnit,
        formData.sourceAccount,
        formData.beneficiary,
        fee.delivery as toPolkadotSnowbridgeV2.DeliveryFee,
      );
      const plan = await transferImpl.validate(tx);
      console.log(plan);
      return { ...plan, kind: transferType };
    }
    default:
      throw Error(`Cannot infer source ${transferType}.`);
  }
}

async function sendToken(
  context: AppContext,
  data: ValidationData,
  plan: ValidationResult,
  signerInfo: SignerInfo,
): Promise<MessageReceipt> {
  if (!plan.success) {
    throw Error(`Cannot execute a failed plan.`, {
      cause: plan,
    });
  }
  const { source, destination, assetRegistry } = data;
  const route = buildRoute(source, destination);

  switch (plan.kind) {
    case "polkadot->polkadot": {
      const { paraInfo, polkadotAccount } = validateSubstrateSigner(
        data,
        signerInfo,
        true,
      );
      const { destination: d } = validateInterParachainTransfer(data);
      const info = bridgeInfoFor(getEnvironmentName());
      const transferImpl = new forInterParachain.InterParachainTransfer(
        info,
        context,
        route as any,
        paraInfo,
        d,
      );
      const tx = plan as unknown as forInterParachain.Transfer;
      const result = await transferImpl.signAndSend(
        tx,
        polkadotAccount.address,
        {
          signer: polkadotAccount.signer! as any,
          withSignedTransaction: true,
        },
      );
      console.log(result);
      return { kind: plan.kind, ...result };
    }
    case "ethereum->ethereum": {
      const { signer } = await validateEvmSubstrateSigner(data, signerInfo);
      const sourceEthChain =
        assetRegistry.ethereumChains[`ethereum_${source.id}`];
      const destinationEthChain =
        assetRegistry.ethereumChains[`ethereum_${destination.id}`];
      const transferImpl = new toEthereumFromEVMV2.V1ToEthereumEvmAdapter(
        context,
        assetRegistry,
        route as any,
        sourceEthChain,
        destinationEthChain,
      );
      const response = await signer.sendTransaction((plan as any).tx);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const result = await transferImpl.messageId(receipt);
      console.log(result);
      return { kind: plan.kind, ...result };
    }
    case "polkadot->ethereum": {
      const { paraInfo, polkadotAccount } = validateSubstrateSigner(
        data,
        signerInfo,
        false,
      );
      const destinationEthChain =
        assetRegistry.ethereumChains[`ethereum_${destination.id}`];

      const useV2 = assetsV2.supportsPolkadotToEthereumV2(paraInfo);
      let transferImpl: toEthereumSnowbridgeV2.TransferToEthereum<EthersProviderTypes> | toEthereumV2.V1ToEthereumAdapter<EthersProviderTypes>;
      if (useV2) {
        console.log(
          `[sendToken] Snowbridge V2: Source parachain ${paraInfo.id} to Ethereum.`,
        );
        transferImpl = new toEthereumSnowbridgeV2.TransferToEthereum(
          context,
          route as any,
          assetRegistry,
          paraInfo,
          destinationEthChain,
        );
      } else {
        transferImpl = new toEthereumV2.V1ToEthereumAdapter(
          context,
          assetRegistry,
          route as any,
          paraInfo,
          destinationEthChain,
        );
      }
      const tx = plan as unknown as toEthereumV2.Transfer;
      const result = await transferImpl.signAndSend(
        tx,
        polkadotAccount.address,
        {
          signer: polkadotAccount.signer! as any,
          withSignedTransaction: true,
        },
      );
      console.log(result);
      return { kind: plan.kind, ...result };
    }
    case "ethereum->polkadot": {
      const { signer, paraInfo } = await validateEthereumSignerWithParachain(
        data,
        signerInfo,
      );
      const sourceEthChain =
        assetRegistry.ethereumChains[`ethereum_${source.id}`];

      const useV2 = assetsV2.supportsEthereumToPolkadotV2(paraInfo);
      let transferImpl: toPolkadotSnowbridgeV2.TransferToPolkadot<EthersProviderTypes> | toPolkadotV2.V1ToPolkadotAdapter<EthersProviderTypes>;
      if (useV2) {
        console.log(
          `[sendToken] Snowbridge V2: Destination parachain ${paraInfo.id}`,
        );
        transferImpl = new toPolkadotSnowbridgeV2.TransferToPolkadot(
          context,
          route as any,
          assetRegistry,
          sourceEthChain,
          paraInfo,
        );
      } else {
        transferImpl = new toPolkadotV2.V1ToPolkadotAdapter(
          context,
          assetRegistry,
          route as any,
          sourceEthChain,
          paraInfo,
        );
      }
      const transfer = plan as unknown as toPolkadotSnowbridgeV2.Transfer<EthersProviderTypes>;
      const response = await signer.sendTransaction(transfer.tx as any);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const messageReceipt = await transferImpl.messageId(receipt);
      if (!messageReceipt) {
        throw Error(`Could not fetch message receipt.`);
      }
      let result;
      if (useV2) {
        result = {
          ...messageReceipt,
          messageId: (messageReceipt as any).messageId ?? receipt.hash,
          channelId: (messageReceipt as any).channelId ?? "",
        };
      } else {
        result = messageReceipt;
      }
      console.log(result);
      return { kind: plan.kind, ...result } as MessageReceipt;
    }
    case "ethereum->kusama": {
      const { signer } = await validateEthereumSigner(data, signerInfo);
      const transfer = plan as unknown as toKusamaSnowbridgeV2.Transfer<any>;
      const response = await signer.sendTransaction(transfer.tx as any);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const kusamaPara =
        data.assetRegistry.kusama?.parachains[`kusama_${data.destination.id}`];
      if (!kusamaPara) throw Error(`Kusama parachain not found.`);
      const transferImpl = new toKusamaSnowbridgeV2.TransferToKusama(
        context,
        route as any,
        data.assetRegistry,
        data.assetRegistry.ethereumChains[`ethereum_${data.source.id}`],
        kusamaPara,
      );
      const messageReceipt = await transferImpl.messageId(receipt);
      if (!messageReceipt) {
        throw Error(`Could not fetch message receipt.`);
      }
      console.log(messageReceipt);
      return { kind: plan.kind, ...messageReceipt };
    }
    case "kusama->ethereum": {
      if (!signerInfo.polkadotAccount) {
        throw Error(`Polkadot Wallet not connected.`);
      }
      const kusamaPara =
        data.assetRegistry.kusama?.parachains[`kusama_${data.source.id}`];
      if (!kusamaPara) throw Error(`Kusama parachain not found.`);
      const transferImpl = new fromKusamaSnowbridgeV2.TransferFromKusama(
        context,
        route as any,
        data.assetRegistry,
        kusamaPara,
        data.assetRegistry.ethereumChains[`ethereum_${data.destination.id}`],
      );
      const transfer = plan as unknown as fromKusamaSnowbridgeV2.Transfer;
      const result = await transferImpl.signAndSend(
        transfer,
        signerInfo.polkadotAccount.address,
        {
          signer: signerInfo.polkadotAccount.signer! as any,
          withSignedTransaction: true,
        },
      );
      console.log(result);
      return { kind: plan.kind, ...result };
    }
    case "polkadot->ethereum_l2": {
      const { polkadotAccount } = validateSubstrateSigner(
        data,
        signerInfo,
        false,
      );
      const parachain = validateSubstrateDestination(data);
      const destinationEthChain =
        assetRegistry.ethereumChains[`ethereum_l2_${destination.id}`];
      if (!destinationEthChain)
        throw Error(
          `Ethereum L2 chain ${destination.id} not found in registry.`,
        );

      const transferImpl = new ERC20FromAHToL2(
        context as any,
        assetRegistry,
        route as any,
        parachain,
        destinationEthChain,
      );
      const result = await transferImpl.signAndSend(
        plan as unknown as toEthereumV2.Transfer,
        polkadotAccount.address,
        {
          signer: polkadotAccount.signer! as any,
          withSignedTransaction: true,
        },
      );
      console.log(result);
      return { kind: plan.kind, ...result };
    }
    case "ethereum_l2->polkadot": {
      const { signer } = await validateEthereumSigner(data, signerInfo);
      const sourceEthChain =
        assetRegistry.ethereumChains[`ethereum_l2_${source.id}`];
      if (!sourceEthChain)
        throw Error(`Ethereum L2 chain ${source.id} not found in registry.`);
      const destParachain =
        assetRegistry.parachains[`polkadot_${destination.id}`];
      if (!destParachain)
        throw Error(`Parachain ${destination.id} not found in registry.`);

      const transferImpl = new ERC20FromL2ToAH(
        context as any,
        assetRegistry,
        route as any,
        sourceEthChain,
        destParachain,
      );
      const transfer = plan as unknown as toPolkadotSnowbridgeV2.Transfer<EthersProviderTypes>;
      const response = await signer.sendTransaction(transfer.tx as any);
      const receipt = await response.wait();
      if (!receipt) {
        throw Error(`Could not fetch transaction receipt.`);
      }
      const messageReceipt = await transferImpl.messageId(receipt);
      let result;
      if (messageReceipt) {
        result = {
          ...messageReceipt,
          messageId: (messageReceipt as any).messageId ?? receipt.hash,
          channelId: "",
        };
      } else {
        result = {
          nonce: 0n,
          payload: "",
          messageId: (transfer as any).computed?.topic ?? receipt.hash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          txHash: receipt.hash,
          txIndex: receipt.index,
          channelId: "",
        };
      }
      console.log(result);
      return { kind: plan.kind, ...result };
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
