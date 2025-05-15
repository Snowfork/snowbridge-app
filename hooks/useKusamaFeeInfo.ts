import { snowbridgeContextAtom } from "@/store/snowbridge";
import { assetsV2, Context, forKusama } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";
import { KusamaFeeInfo } from "@/utils/types";
import { Direction } from "../../snowbridge/web/packages/api/src/forKusama";
import { ApiPromise } from "@polkadot/api";

async function fetchKusamaFeeInfo([context, registry, direction]: [
  Context | null,
  assetsV2.AssetRegistry,
  Direction,
]): Promise<KusamaFeeInfo | undefined> {
  if (context === null) {
    return;
  }
  let sourceAssetHub: ApiPromise | undefined;
  if (direction == Direction.ToPolkadot) {
    sourceAssetHub = await context.kusamaAssetHub();
  } else {
    sourceAssetHub = await context.assetHub();
  }

  if (!sourceAssetHub) {
    return;
  }

  const deliveryFee = await forKusama.getDeliveryFee(
    sourceAssetHub,
    direction,
    registry,
  );
  return {
    fee: deliveryFee.totalFeeInDot,
    decimals: registry.relaychain.tokenDecimals ?? 0,
    symbol: registry.relaychain.tokenSymbols ?? "",
    delivery: deliveryFee,
  };
}

export function useKusamaFeeInfo(source: string) {
  let direction: Direction;
  if (source === "polkadotAssethub") {
    direction = Direction.ToKusama;
  } else {
    direction = Direction.ToPolkadot;
  }

  const context = useAtomValue(snowbridgeContextAtom);
  const { data: registry } = useAssetRegistry();
  return useSWR(
    [context, registry, direction, "kusamaFeeInfo"],
    fetchKusamaFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
