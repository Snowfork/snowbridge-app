import { RegistryContext } from "@/app/providers";
import { parse } from "@/lib/json";
import { getEnvironmentName } from "@/lib/snowbridge";
import { AssetRegistry } from "@snowbridge/api/dist/assets_v2";
import { useContext } from "react";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 2 * 60 * 60 * 1000; // 2 hour
export const ERROR_RETRY_INTERVAL: number = 10 * 60 * 1000; // 10 minute

const fetchAssetMetadata = async (): Promise<AssetRegistry | null> => {
  console.log("Fetching history server side");
  const result = await fetch("/assets/api");
  if (result.status == 200) {
    return parse(await result.text());
  } else {
    throw Error(
      `Could not asset metadata. ${result.status} ${result.statusText} ${result.body}`,
    );
  }
};

export const useAssetRegistry = () => {
  let registry = useContext(RegistryContext);
  const env = getEnvironmentName();
  const { data, error } = useSWR([env, "assetRegistry"], fetchAssetMetadata, {
    refreshInterval: REFRESH_INTERVAL,
    suspense: true,
    fallbackData: registry,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 12, // Retry 120 times every minute (2 hours)
  });
  return { data: data!, error };
};
