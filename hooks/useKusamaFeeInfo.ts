import { snowbridgeContextAtom } from "@/store/snowbridge";
import { assetsV2, Context, toKusama } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";
import { FeeInfo, KusamaFeeInfo } from "@/utils/types";

async function fetchKusamaFeeInfo([
  context,
  registry,
]: [
  Context | null,
  assetsV2.AssetRegistry,
]): Promise<KusamaFeeInfo | undefined> {
  if (context === null) {
    return;
  }
  const fee = await toKusama.getDeliveryFee(
    await context.assetHub(),
    1000000000n,
  );
  return {
    fee: fee.totalFeeInDot,
    decimals: registry.relaychain.tokenDecimals ?? 0,
    symbol: registry.relaychain.tokenSymbols ?? "",
  };
}

export function useKusamaFeeInfo(
  source: string,
  destination: string,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const { data: registry } = useAssetRegistry();
  return useSWR([context, registry, "kusamaFeeInfo"], fetchKusamaFeeInfo, {
    errorRetryCount: 10,
  });
}
