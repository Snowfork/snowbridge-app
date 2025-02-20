import { snowbridgeContextAtom } from "@/store/snowbridge";
import { assetsV2, Context, toEthereumV2, toPolkadotV2 } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";
import { TransferLocation } from "@/utils/types";

export interface FeeInfo {
  fee: bigint;
  decimals: number;
  symbol: string;
  delivery: toEthereumV2.DeliveryFee | toPolkadotV2.DeliveryFee;
  type: assetsV2.SourceType;
}

async function fetchBridgeFeeInfo([
  context,
  source,
  destination,
  registry,
  token,
]: [
  Context | null,
  TransferLocation,
  TransferLocation,
  assetsV2.AssetRegistry,
  string,
  string,
]): Promise<FeeInfo | undefined> {
  if (context === null) {
    return;
  }
  if (source.type === "substrate" && source.parachain) {
    const fee = await toEthereumV2.getDeliveryFee(
      await context.assetHub(),
      source.parachain?.parachainId,
      registry,
    );
    return {
      fee: fee.totalFeeInDot,
      decimals: registry.relaychain.tokenDecimals ?? 0,
      symbol: registry.relaychain.tokenSymbols ?? "",
      delivery: fee,
      type: source.type,
    };
  } else if (source.type === "ethereum") {
    const para = registry.parachains[destination.key];
    const fee = await toPolkadotV2.getDeliveryFee(
      context.gateway(),
      registry,
      token,
      para.parachainId,
    );
    return {
      fee: fee.deliveryFeeInWei,
      decimals: 18,
      symbol: "ETH",
      delivery: fee,
      type: source.type,
    };
  } else {
    console.warn("Could not fetch fee for source:", source);
    return undefined;
  }
}

export function useBridgeFeeInfo(
  source: TransferLocation,
  destination: TransferLocation,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const { data: registry } = useAssetRegistry();
  return useSWR(
    [context, source, destination, registry, token, "feeInfo"],
    fetchBridgeFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
