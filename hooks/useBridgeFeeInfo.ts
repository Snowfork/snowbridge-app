import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  assetsV2,
  Context,
  forInterParachain,
  toEthereumV2,
  toPolkadotV2,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { FeeInfo } from "@/utils/types";
import { useContext } from "react";
import { RegistryContext } from "@/app/providers";
import { AssetRegistry } from "@snowbridge/base-types";
import { inferTransferType } from "@/utils/inferTransferType";
import { getEnvironmentName } from "@/lib/snowbridge";

const feeEstimateAccounts: { [env: string]: string } = {
  polkadot_mainnet: "0xd803472c47a87d7b63e888de53f03b4191b846a8",
  westend_sepolia: "0x180c269c4a5211aa4bab78abdf6e4d87263febe6",
  paseo_sepolia: "0x34e67708f073dda5cb3670826ecc2ac667b44994",
};

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
  const env = getEnvironmentName();

  switch (inferTransferType(source, destination)) {
    case "toPolkadotV2": {
      const para = registry.parachains[destination.key];
      const fee = await toPolkadotV2.getDeliveryFee(
        {
          gateway: context.gateway(),
          assetHub: await context.assetHub(),
          destination: await context.parachain(para.parachainId),
        },
        registry,
        token,
        para.parachainId,
      );
      let executionFeeInWei = 0n;
      if (env in feeEstimateAccounts) {
        const sourceAccount = feeEstimateAccounts[env];
        const testTransfer = await toPolkadotV2.createTransfer(
          registry,
          sourceAccount,
          "5DXUu6jrA9Yz5RM1VsUppHAvXgEyVHFYcUjVWYyfVaxc57zs",
          assetsV2.ETHER_TOKEN_ADDRESS,
          para.parachainId,
          1n,
          fee,
        );
        try {
          const [estimatedGas, feeData] = await Promise.all([
            context.ethereum().estimateGas(testTransfer.tx),
            context.ethereum().getFeeData(),
          ]);
          executionFeeInWei = (feeData.gasPrice ?? 0n) * estimatedGas;
        } catch (err) {
          console.warn("Could not estimate execution fee:", err);
        }
      }
      return {
        fee: fee.totalFeeInWei,
        totalFee: fee.totalFeeInWei + executionFeeInWei,
        decimals: 18,
        symbol: "ETH",
        delivery: fee,
        type: source.type,
      };
    }
    case "toEthereumV2": {
      const fee = await toEthereumV2.getDeliveryFee(
        {
          assetHub: await context.assetHub(),
          source: await context.parachain(source.parachain!.parachainId),
        },
        source.parachain!.parachainId,
        registry,
        token,
      );
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
