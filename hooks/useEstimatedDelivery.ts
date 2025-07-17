import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { formatTime } from "@/utils/formatting";
import { environment, subsquid, utils } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";

const REFRESH_INTERVAL = 3 * 60 * 1000;
const ERROR_RETRY_INTERVAL = 1 * 60 * 1000;

interface BridgeLatency {
  toEthereum: number;
  toPolkadot: number;
}

async function getEstimatedDeliveryTime([env]: [
  environment.SnowbridgeEnvironment,
]): Promise<BridgeLatency | null> {
  try {
    const channelId = utils.paraIdToChannelId(env.config.ASSET_HUB_PARAID);
    const estimated = await subsquid.fetchEstimatedDeliveryTime(
      env.config.GRAPHQL_API_URL,
      channelId,
    );
    console.log("Estimated Delivery", estimated);
    if (
      !estimated ||
      !estimated?.toEthereumElapse?.elapse ||
      !estimated?.toPolkadotElapse?.elapse
    ) {
      return null;
    }
    return {
      toEthereum: Number(estimated?.toEthereumElapse?.elapse),
      toPolkadot: Number(estimated?.toPolkadotElapse?.elapse),
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
  source: environment.SourceType,
  latency: BridgeLatency | null,
) {
  if (!latency) {
    return "Could not estimate";
  }
  switch (source) {
    case "ethereum":
      return formatTime(latency.toPolkadot, false);
    case "substrate": {
      return formatTime(latency.toEthereum, false);
    }
    default:
      return "Could not estimate.";
  }
}
