import { snowbridgeContextAtom } from "@/store/snowbridge";
import { assetsV2, Context, forKusama } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";
import {
  AssetHub,
  DOT_DECIMALS,
  DOT_SYMBOL,
  KSM_DECIMALS,
  KSM_SYMBOL,
  KusamaFeeInfo,
} from "@/utils/types";

import { ApiPromise } from "@polkadot/api";
import { Direction } from "@snowbridge/api/dist/forKusama";

async function fetchKusamaFeeInfo([context, registry, direction, token]: [
  Context | null,
  assetsV2.AssetRegistry,
  Direction,
  string,
]): Promise<KusamaFeeInfo | undefined> {
  if (context === null) {
    return;
  }
  let sourceAssetHub: ApiPromise | undefined;
  let destAssetHub: ApiPromise | undefined;
  if (direction == Direction.ToPolkadot) {
    sourceAssetHub = await context.kusamaAssetHub();
    destAssetHub = await context.assetHub();
  } else {
    sourceAssetHub = await context.assetHub();
    destAssetHub = await context.kusamaAssetHub();
  }

  if (!sourceAssetHub || !destAssetHub) {
    return;
  }

  const deliveryFee = await forKusama.getDeliveryFee(
    sourceAssetHub,
    destAssetHub,
    direction,
    registry,
    token,
  );
  const isPolkadot = direction == Direction.ToKusama;
  const tokenSymbol = isPolkadot ? DOT_SYMBOL : KSM_SYMBOL;
  const tokenDecimals = isPolkadot ? DOT_DECIMALS : KSM_DECIMALS;

  return {
    fee: deliveryFee.totalFeeInNative,
    decimals: tokenDecimals,
    symbol: tokenSymbol,
    delivery: deliveryFee,
  };
}

export function useKusamaFeeInfo(source: string, token: string | undefined) {
  let direction: Direction;
  if (source === AssetHub.Polkadot) {
    direction = Direction.ToKusama;
  } else {
    direction = Direction.ToPolkadot;
  }

  const context = useAtomValue(snowbridgeContextAtom);
  const { data: registry } = useAssetRegistry();
  return useSWR(
    [context, registry, direction, token, "kusamaFeeInfo"],
    fetchKusamaFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
