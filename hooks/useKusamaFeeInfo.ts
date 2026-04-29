import { BridgeInfoContext } from "@/app/providers";
import { type SnowbridgeClient } from "@/lib/snowbridge";
import { snowbridgeApiAtom } from "@/store/snowbridge";
import { AssetHub } from "@/utils/types";
import { AssetRegistry } from "@snowbridge/base-types";
import { useAtomValue } from "jotai";
import { useContext } from "react";
import useSWR from "swr";
import { KusamaDeliveryFee } from "@/utils/deliveryFee";

async function fetchKusamaFeeInfo([api, registry, source, token]: [
  SnowbridgeClient | null,
  AssetRegistry,
  string,
  string | undefined,
]): Promise<KusamaDeliveryFee | undefined> {
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

  return await sender.fee(token);
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
