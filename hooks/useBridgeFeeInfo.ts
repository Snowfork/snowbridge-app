import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  assetsV2,
  Context,
  forInterParachain,
  toEthereumV2,
  toPolkadotV2,
  toEthereumSnowbridgeV2,
  toPolkadotSnowbridgeV2,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { FeeInfo } from "@/utils/types";
import { useContext } from "react";
import { RegistryContext } from "@/app/providers";
import {
  AssetRegistry,
  Parachain,
  supportsEthereumToPolkadotV2,
  supportsPolkadotToEthereumV2,
} from "@snowbridge/base-types";
import { inferTransferType } from "@/utils/inferTransferType";
import { getEnvironmentName } from "@/lib/snowbridge";

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

      const useV2 = supportsEthereumToPolkadotV2(para);
      console.log(`[estimateExecutionFee] Parachain ${para.parachainId} supportsEthereumToPolkadotV2: ${useV2}`);

      let testTransfer;
      if (useV2) {
        const transferImpl =
          toPolkadotSnowbridgeV2.createTransferImplementation(
            para.parachainId,
            registry,
            assetsV2.ETHER_TOKEN_ADDRESS,
          );
        testTransfer = await transferImpl.createTransfer(
          context,
          registry,
          para.parachainId,
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
          para.parachainId,
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
]: [
  Context | null,
  assetsV2.TransferLocation,
  assetsV2.TransferLocation,
  AssetRegistry,
  string,
  string,
]): Promise<FeeInfo | undefined> {
  if (context === null) {
    return;
  }

  switch (inferTransferType(source, destination)) {
    case "toPolkadotV2": {
      const para = registry.parachains[destination.key];

      const useV2 = supportsEthereumToPolkadotV2(para);

      let fee;
      if (useV2) {
        console.log(`[fetchBridgeFeeInfo] Snowbridge V2: Destination parachain ${para.parachainId}`);
        const transferImpl =
          toPolkadotSnowbridgeV2.createTransferImplementation(
            para.parachainId,
            registry,
            token,
          );
        fee = await transferImpl.getDeliveryFee(
          context,
          registry,
          token,
          para.parachainId,
        );
      } else {
        fee = await toPolkadotV2.getDeliveryFee(
          {
            gateway: context.gateway(),
            assetHub: await context.assetHub(),
            destination: await context.parachain(para.parachainId),
          },
          registry,
          token,
          para.parachainId,
        );
      }

      console.log("DELIVERY FEEEE:", fee);

      return {
        fee: fee.totalFeeInWei,
        totalFee:
          fee.totalFeeInWei +
          (await estimateExecutionFee(context, registry, para, fee)),
        decimals: 18,
        symbol: "ETH",
        delivery: fee,
        type: source.type,
      };
    }
    case "toEthereumV2": {
      const useV2 = supportsPolkadotToEthereumV2(source.parachain!);
      console.log(`[fetchBridgeFeeInfo:toEthereumV2] Source parachain ${source.parachain!.parachainId} supportsPolkadotToEthereumV2: ${useV2}`);

      let fee;
      if (useV2) {
        const transferImpl =
          toEthereumSnowbridgeV2.createTransferImplementation(
            source.parachain!.parachainId,
            registry,
            token,
          );
        fee = await transferImpl.getDeliveryFee(
          { sourceParaId: source.parachain!.parachainId, context },
          registry,
          token,
        );
      } else {
        fee = await toEthereumV2.getDeliveryFee(
          {
            assetHub: await context.assetHub(),
            source: await context.parachain(source.parachain!.parachainId),
          },
          source.parachain!.parachainId,
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
        delivery: fee,
        type: source.type,
      };
    }
    case "forInterParachain": {
      const fee = await forInterParachain.getDeliveryFee(
        {
          context,
          sourceParaId: source.parachain!.parachainId,
          destinationParaId: destination.parachain!.parachainId,
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
        delivery: fee,
        type: source.type,
      };
    }
  }
}

export function useBridgeFeeInfo(
  source: assetsV2.TransferLocation,
  destination: assetsV2.TransferLocation,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const registry = useContext(RegistryContext)!;
  return useSWR(
    [context, source, destination, registry, token, "feeInfo"],
    fetchBridgeFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
