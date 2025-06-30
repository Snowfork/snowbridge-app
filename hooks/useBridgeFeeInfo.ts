import { snowbridgeContextAtom } from "@/store/snowbridge";
import { assetsV2, Context, toEthereumV2, toPolkadotV2 } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";
import { FeeInfo } from "@/utils/types";
import { useContext } from "react";
import { RegistryContext } from "@/app/providers";
import { AssetRegistry } from "@snowbridge/base-types";

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
  AssetRegistry,
  string,
  string,
]): Promise<FeeInfo | undefined> {
  if (context === null) {
    return;
  }
  if (destination.type === "ethereum" && source.parachain) {
    const fee = await toEthereumV2.getDeliveryFee(
      {
        assetHub: await context.assetHub(),
        source: await context.parachain(source.parachain.parachainId),
      },
      source.parachain.parachainId,
      registry,
      token,
    );
    let feeValue = fee.totalFeeInDot;
    let decimals = registry.relaychain.tokenDecimals ?? 0;
    let symbol = registry.relaychain.tokenSymbols ?? "";
    if (fee.totalFeeInNative) {
      feeValue = fee.totalFeeInNative;
      decimals = source.parachain.info.tokenDecimals;
      symbol = source.parachain.info.tokenSymbols;
    }
    return {
      fee: feeValue,
      decimals,
      symbol,
      delivery: fee,
      type: source.type,
    };
  } else if (destination.type === "substrate") {
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
  const registry = useContext(RegistryContext)!;
  return useSWR(
    [context, source, destination, registry, token, "feeInfo"],
    fetchBridgeFeeInfo,
    {
      errorRetryCount: 10,
    },
  );
}
