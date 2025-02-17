import { snowbridgeContextAtom } from "@/store/snowbridge";
import {
  assets,
  assetsV2,
  Context,
  toEthereum,
  toPolkadot,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";
import { Destination } from "@/utils/types";

export interface FeeInfo {
  fee: bigint;
  decimals: number;
  symbol: string;
}

async function fetchBridgeFeeInfo([
  context,
  source,
  destination,
  registry,
  token,
]: [
  Context | null,
  "substrate" | "ethereum",
  Destination,
  assetsV2.AssetRegistry,
  string,
  string,
]): Promise<FeeInfo | undefined> {
  if (context === null) {
    return;
  }
  switch (source) {
    case "substrate": {
      const fee = await toEthereum.getSendFee(context);
      return {
        fee,
        decimals: registry.relaychain.tokenDecimals ?? 0,
        symbol: registry.relaychain.tokenSymbols ?? "",
      };
    }
    case "ethereum": {
      const para = registry.parachains[destination.key];
      const fee = await toPolkadot.getSendFee(
        context,
        token,
        para.parachainId,
        para.destinationFeeInDOT,
      );
      return {
        fee,
        decimals: 18,
        symbol: "ETH",
      };
    }
    default:
      throw Error("Unknown source");
  }
}

export function useBridgeFeeInfo(
  source: "substrate" | "ethereum",
  destination: Destination,
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
