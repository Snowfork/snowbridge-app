import { BridgeInfoContext } from "@/app/providers";
import { type SnowbridgeClient } from "@/lib/snowbridge";
import { snowbridgeApiAtom } from "@/store/snowbridge";
import {
  AssetHub,
  DOT_DECIMALS,
  DOT_SYMBOL,
  KSM_DECIMALS,
  KSM_SYMBOL,
  KusamaFeeInfo,
} from "@/utils/types";
import { AssetRegistry } from "@snowbridge/base-types";
import { useAtomValue } from "jotai";
import { useContext } from "react";
import useSWR from "swr";

async function fetchKusamaFeeInfo([api, registry, source, token]: [
  SnowbridgeClient | null,
  AssetRegistry,
  string,
  string | undefined,
]): Promise<KusamaFeeInfo | undefined> {
  if (!api || !token || !registry.kusama) {
    return;
  }

  const from =
    source === AssetHub.Polkadot
      ? { kind: "polkadot" as const, id: registry.assetHubParaId }
      : { kind: "kusama" as const, id: registry.kusama.assetHubParaId };
  const to =
    source === AssetHub.Polkadot
      ? { kind: "kusama" as const, id: registry.kusama.assetHubParaId }
      : { kind: "polkadot" as const, id: registry.assetHubParaId };
  const sender = api.sender(from, to);
  if (
    sender.kind !== "polkadot->kusama" &&
    sender.kind !== "kusama->polkadot"
  ) {
    throw Error(`Unexpected Kusama route ${sender.kind}.`);
  }

  const deliveryFee = await sender.fee(token);
  const isPolkadot = sender.kind === "polkadot->kusama";
  const nativeSymbol = isPolkadot ? DOT_SYMBOL : KSM_SYMBOL;
  const nativeFee = deliveryFee.totals.find(
    (total) => total.symbol === nativeSymbol,
  );
  if (!nativeFee) {
    throw Error(`Kusama fee total missing ${nativeSymbol}.`);
  }

  return {
    fee: nativeFee.amount,
    decimals: isPolkadot ? DOT_DECIMALS : KSM_DECIMALS,
    symbol: nativeSymbol,
    delivery: deliveryFee,
  };
}

export function useKusamaFeeInfo(source: string, token: string | undefined) {
  const api = useAtomValue(snowbridgeApiAtom);
  const { registry } = useContext(BridgeInfoContext)!;
  return useSWR(
    [api, registry, source, token, "kusamaFeeInfo"],
    fetchKusamaFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
