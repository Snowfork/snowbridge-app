import { BridgedAssetsMetadata } from "@/lib/snowbridge";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 60 * 60 * 1000; // 1 hour
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

const fetchAssetMetaData = async (): Promise<BridgedAssetsMetadata | null> => {
  console.log("Fetching history server side");
  const result = await fetch("/assets/api");
  if (result.status == 200) {
    return await result.json();
  } else {
    throw Error(
      `Could not asset metadata. ${result.status} ${result.statusText} ${result.body}`
    );
  }
};

export const useAssetMetaData = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  return useSWR([env, "assetMetaData"], fetchAssetMetaData, {
    refreshInterval: REFRESH_INTERVAL,
    suspense: true,
    fallbackData: null,
    revalidateOnFocus: false,
    revalidateOnMount: true,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
