import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { formatTime } from "@/utils/formatting";
import { inferTransferType } from "@/utils/inferTransferType";
import { subsquidV2 } from "@snowbridge/api";
import { Environment, TransferLocation } from "@snowbridge/base-types";
import { useAtomValue } from "jotai";
import useSWR from "swr";

const REFRESH_INTERVAL = 3 * 60 * 1000;
const ERROR_RETRY_INTERVAL = 1 * 60 * 1000;

interface BridgeLatency {
  toEthereum: number;
  toPolkadot: number;
}

async function getEstimatedDeliveryTime([env]: [
  Environment,
]): Promise<BridgeLatency | null> {
  try {
    const estimated = await subsquidV2.fetchEstimatedDeliveryTime(
      env.indexerGraphQlUrl,
    );
    console.log("Estimated Delivery", estimated);
    if (
      !estimated ||
      !estimated?.toEthereumV2Elapse?.elapse ||
      !estimated?.toPolkadotV2Elapse?.elapse
    ) {
      return null;
    }
    return {
      toEthereum: Number(estimated?.toEthereumV2Elapse?.elapse),
      toPolkadot: Number(estimated?.toPolkadotV2Elapse?.elapse),
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

export const useEstimatedDelivery = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  return useSWR([env, "estimatedDelivery"], getEstimatedDeliveryTime, {
    refreshInterval: REFRESH_INTERVAL,
    fallbackData: null,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};

export function estimateDelivery(
  source: TransferLocation,
  destination: TransferLocation,
  latency: BridgeLatency | null,
) {
  if (!latency) {
    return "Could not estimate";
  }
  switch (inferTransferType(source, destination)) {
    case "toPolkadotV2":
      return formatTime(latency.toPolkadot, false);
    case "toEthereumV2": {
      return formatTime(latency.toEthereum, false);
    }
    case "forInterParachain": {
      // Inter parachain transfers takes 30s-1min. At most 2 minutes.
      return formatTime(120, false);
    }
    default:
      return "Could not estimate.";
  }
}
