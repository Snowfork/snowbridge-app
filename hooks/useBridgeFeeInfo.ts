import { snowbridgeContextAtom } from "@/store/snowbridge";
import { assetsV2, Context, toEthereumV2, toPolkadotV2 } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { useAssetRegistry } from "./useAssetRegistry";
import { FeeInfo } from "@/utils/types";

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
  assetsV2.AssetRegistry,
  string,
  string,
]): Promise<FeeInfo | undefined> {
  if (context === null) {
    return;
  }
  if (source.type === "substrate" && source.parachain) {
    const fee = await toEthereumV2.getDeliveryFee(
      {
        assetHub: await context.assetHub(),
        source: await context.parachain(source.parachain.parachainId),
      },
      source.parachain.parachainId,
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
      {
        gateway: context.gateway(),
        assetHub: await context.assetHub(),
        destination: await context.parachain(para.parachainId),
      },
      registry,
      token,
      para.parachainId,
    );
    return {
      fee: fee.totalFeeInWei,
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
  source: assetsV2.TransferLocation,
  destination: assetsV2.TransferLocation,
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
