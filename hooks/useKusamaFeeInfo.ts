import { snowbridgeContextAtom } from "@/store/snowbridge";
import { forKusama } from "@snowbridge/api";
import { AppContext } from "@/lib/snowbridge";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import {
  AssetHub,
  DOT_DECIMALS,
  DOT_SYMBOL,
  KSM_DECIMALS,
  KSM_SYMBOL,
  KusamaFeeInfo,
} from "@/utils/types";

import { Direction } from "@snowbridge/api/dist/forKusama";
import { useContext } from "react";
import { BridgeInfoContext } from "@/app/providers";
import { AssetRegistry } from "@snowbridge/base-types";
import { bridgeInfoFor } from "@snowbridge/registry";
import { getEnvironmentName } from "@/lib/snowbridge";

async function fetchKusamaFeeInfo([context, registry, direction, token]: [
  AppContext | null,
  AssetRegistry,
  Direction,
  string,
]): Promise<KusamaFeeInfo | undefined> {
  if (context === null) {
    return;
  }

  const info = bridgeInfoFor(getEnvironmentName());
  let sourceParachain, destParachain;
  if (direction == Direction.ToKusama) {
    sourceParachain = registry.parachains[`polkadot_${registry.assetHubParaId}`];
    destParachain = registry.kusama?.parachains[`kusama_${registry.kusama?.assetHubParaId}`];
  } else {
    sourceParachain = registry.kusama?.parachains[`kusama_${registry.kusama?.assetHubParaId}`];
    destParachain = registry.parachains[`polkadot_${registry.assetHubParaId}`];
  }
  if (!sourceParachain || !destParachain) {
    return;
  }
  const route = {
    from: { kind: direction === Direction.ToKusama ? "polkadot" as const : "kusama" as const, id: direction === Direction.ToKusama ? registry.assetHubParaId : registry.kusama!.assetHubParaId },
    to: { kind: direction === Direction.ToKusama ? "kusama" as const : "polkadot" as const, id: direction === Direction.ToKusama ? registry.kusama!.assetHubParaId : registry.assetHubParaId },
    assets: [],
  };
  const kusamaTransfer = new forKusama.KusamaTransfer(info, context, route, sourceParachain, destParachain);
  const deliveryFee = await kusamaTransfer.fee(token);
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
  const { registry } = useContext(BridgeInfoContext)!;
  return useSWR(
    [context, registry, direction, token, "kusamaFeeInfo"],
    fetchKusamaFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
