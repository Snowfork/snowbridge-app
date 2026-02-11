import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  assetsV2,
  Context,
  forInterParachain,
  toEthereumV2,
  toPolkadotV2,
  toEthereumSnowbridgeV2,
  toPolkadotSnowbridgeV2,
  xcmBuilder,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { FeeInfo } from "@/utils/types";
import { useContext } from "react";
import { BridgeInfoContext } from "@/app/providers";
import {
  AssetRegistry,
  Parachain,
  TransferLocation,
} from "@snowbridge/base-types";
import { inferTransferType } from "@/utils/inferTransferType";
import { getEnvironmentName } from "@/lib/snowbridge";
import { parseUnits } from "ethers";

async function estimateExecutionFee(
  context: Context,
  registry: AssetRegistry,
  para: Parachain,
  deliveryFee: toPolkadotV2.DeliveryFee | toPolkadotSnowbridgeV2.DeliveryFee,
) {
  const feeEstimateAccounts: { [env: string]: { src: string; dst: string } } = {
    polkadot_mainnet: {
      src: "0xd803472c47a87d7b63e888de53f03b4191b846a8",
      dst: "5GwwB3hLZP7z5siAtBiF4Eq52nhTfTrDqWLCSjP8G1ZtJqH3",
    },
    westend_sepolia: {
      src: "0x180c269c4a5211aa4bab78abdf6e4d87263febe6",
      dst: "5CcEcgHEHPbQUX4ad5eT5mMoNrER3ftoKxqjfZRT9Xub9SKb",
    },
    paseo_sepolia: {
      src: "0x34e67708f073dda5cb3670826ecc2ac667b44994",
      dst: "5DG4oudPJxUpxTkQ7mR5b1pDrX1EeoFpyMyP9PgDR1DmKEPC",
    },
  };
  const env = getEnvironmentName();
  if (env in feeEstimateAccounts) {
    try {
      const { src: sourceAccount, dst: destAccount } = feeEstimateAccounts[env];

      const useV2 = assetsV2.supportsEthereumToPolkadotV2(para);

      let testTransfer;
      if (useV2) {
        const transferImpl =
          toPolkadotSnowbridgeV2.createTransferImplementation(
            para.id,
            registry,
            assetsV2.ETHER_TOKEN_ADDRESS,
          );
        testTransfer = await transferImpl.createTransfer(
          context,
          registry,
          para.id,
          sourceAccount,
          destAccount,
          assetsV2.ETHER_TOKEN_ADDRESS,
          1n,
          deliveryFee as toPolkadotSnowbridgeV2.DeliveryFee,
        );
      } else {
        testTransfer = await toPolkadotV2.createTransfer(
          registry,
          sourceAccount,
          destAccount,
          assetsV2.ETHER_TOKEN_ADDRESS,
          para.id,
          1n,
          deliveryFee as toPolkadotV2.DeliveryFee,
        );
      }

      const [estimatedGas, feeData] = await Promise.all([
        context.ethereum().estimateGas(testTransfer.tx),
        context.ethereum().getFeeData(),
      ]);
      return (feeData.gasPrice ?? 0n) * estimatedGas;
    } catch (err) {
      console.warn("Could not estimate execution fee:", err);
    }
  }
  return 0n;
}

async function fetchBridgeFeeInfo([
  context,
  source,
  destination,
  registry,
  token,
  amount,
]: [
  Context | null,
  TransferLocation,
  TransferLocation,
  AssetRegistry,
  string,
  string,
]): Promise<FeeInfo | undefined> {
  if (context === null) {
    return;
  }
  const asset =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[token];

  const amountInSmallestUnit = parseUnits(
    amount || amount.trim() !== "" ? amount.trim() : "0",
    asset.decimals,
  );

  const transferType = inferTransferType(source, destination);
  switch (transferType) {
    case "ethereum->polkadot": {
      const para = registry.parachains[`polkadot_${destination.id}`];

      const useV2 = assetsV2.supportsEthereumToPolkadotV2(para);

      let fee;
      if (useV2) {
        const transferImpl =
          toPolkadotSnowbridgeV2.createTransferImplementation(
            para.id,
            registry,
            token,
          );
        fee = await transferImpl.getDeliveryFee(
          context,
          registry,
          token,
          para.id,
        );
      } else {
        fee = await toPolkadotV2.getDeliveryFee(
          {
            gateway: context.gateway(),
            assetHub: await context.assetHub(),
            destination: await context.parachain(para.id),
          },
          registry,
          token,
          para.id,
        );
      }

      const estimatedExecution: bigint = await estimateExecutionFee(
        context,
        registry,
        para,
        fee,
      );
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei + estimatedExecution,
        decimals: 18,
        symbol: "ETH",
        delivery: { kind: transferType, ...fee },
        kind: source.kind,
      };
    }
    case "ethereum->ethereum":
    case "polkadot->ethereum": {
      const useV2 = assetsV2.supportsPolkadotToEthereumV2(source.parachain!);

      let fee;
      if (useV2) {
        const transferImpl =
          toEthereumSnowbridgeV2.createTransferImplementation(
            source.parachain!.id,
            registry,
            token,
          );
        fee = await transferImpl.getDeliveryFee(
          { sourceParaId: source.parachain!.id, context },
          registry,
          token,
          { feeTokenLocation: xcmBuilder.DOT_LOCATION }, // Use DOT for now
        );
      } else {
        fee = await toEthereumV2.getDeliveryFee(
          {
            assetHub: await context.assetHub(),
            source: await context.parachain(source.parachain!.id),
          },
          source.parachain!.id,
          registry,
          token,
        );
      }

      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      if (fee.totalFeeInNative) {
        feeValue = fee.totalFeeInNative;
        decimals = source.parachain!.info.tokenDecimals;
        symbol = source.parachain!.info.tokenSymbols;
      }
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: { kind: transferType, ...fee },
        kind: source.kind,
      };
    }
    case "polkadot->polkadot": {
      const fee = await forInterParachain.getDeliveryFee(
        {
          context,
          sourceParaId: source.parachain!.id,
          destinationParaId: destination.parachain!.id,
        },
        registry,
        token,
      );
      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: { kind: transferType, ...fee },
        kind: source.kind,
      };
    }
    case "ethereum_l2->polkadot": {
      if (source.kind !== "ethereum_l2")
        throw `Invalid source ${source.key}, expected ethereum_l2 source.`;
      const l2asset = Object.values(source.ethChain.assets).find(
        (x) => x.swapTokenAddress?.toLowerCase() === token.toLowerCase(),
      );
      if (!l2asset)
        throw Error(`Could not find l2 token for l1 token ${token}`);
      const l2transfer = toPolkadotSnowbridgeV2.createL2TransferImplementation(
        source.id,
        destination.id,
        registry,
        token,
      );
      const fee = await l2transfer.getDeliveryFee(
        context,
        registry,
        source.id,
        l2asset.token,
        amountInSmallestUnit,
        destination.id,
      );
      // TODO: fee information
      //fee.bridgeFeeInL2Token
      //fee.swapFeeInL1Token
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei,
        decimals: 18,
        symbol: "ETH",
        delivery: { kind: transferType, ...fee },
        kind: source.kind,
      };
    }
    case "polkadot->ethereum_l2": {
      const l2transfer = toEthereumSnowbridgeV2.createL2TransferImplementation(
        source.id,
        registry,
        token,
      );
      const fee = await l2transfer.getDeliveryFee(
        context,
        registry,
        destination.id,
        token,
        amountInSmallestUnit,
      );
      let feeValue = fee.totalFeeInDot;
      let decimals = registry.relaychain.tokenDecimals ?? 0;
      let symbol = registry.relaychain.tokenSymbols ?? "";
      return {
        fee: feeValue,
        totalFee: feeValue,
        decimals,
        symbol,
        delivery: { kind: transferType, ...fee },
        kind: source.kind,
      };
    }
    default:
      throw Error(`Unknown transfer type ${transferType}`);
  }
}

export function useBridgeFeeInfo(
  source: TransferLocation,
  destination: TransferLocation,
  token: string,
  amount: string,
) {
  if (amount === undefined) throw Error(`abc`);
  const context = useAtomValue(snowbridgeContextAtom);
  const { registry } = useContext(BridgeInfoContext)!;
  return useSWR(
    [context, source, destination, registry, token, amount, "feeInfo"],
    fetchBridgeFeeInfo,
    {
      errorRetryCount: 30,
    },
  );
}
