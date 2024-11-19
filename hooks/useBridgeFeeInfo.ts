import {
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
} from "@/store/snowbridge";
import {
  assets,
  Context,
  environment,
  toEthereum,
  toPolkadot,
} from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";

export interface FeeInfo {
  fee: bigint;
  decimals: number;
  symbol: string;
}

async function fetchBridgeFeeInfo([
  context,
  source,
  destination,
  assetHubNativeToken,
  token,
]: [
  Context | null,
  "substrate" | "ethereum",
  environment.TransferLocation,
  assets.NativeAsset | null,
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
        decimals: assetHubNativeToken?.tokenDecimal ?? 0,
        symbol: assetHubNativeToken?.tokenSymbol ?? "",
      };
    }
    case "ethereum": {
      if (destination.paraInfo === undefined) {
        throw Error("No paraInfo set for parachain.");
      }
      const fee = await toPolkadot.getSendFee(
        context,
        token,
        destination.paraInfo.paraId,
        destination.paraInfo.destinationFeeDOT,
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
  destination: environment.TransferLocation,
  token: string,
) {
  const context = useAtomValue(snowbridgeContextAtom);
  const assetHubNativeToken = useAtomValue(relayChainNativeAssetAtom);
  return useSWR(
    [context, source, destination, assetHubNativeToken, token, "feeInfo"],
    fetchBridgeFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
