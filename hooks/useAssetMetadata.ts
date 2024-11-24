import { BridgedAssetsMetadata } from "@/lib/snowbridge";
import {
  assetErc20MetaDataAtom as assetErc20MetadataAtom,
  relayChainNativeAssetAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 60 * 60 * 1000; // 1 hour
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

const fetchAssetMetadata = async (): Promise<BridgedAssetsMetadata | null> => {
  console.log("Fetching history server side");
  const result = await fetch("/assets/api");
  if (result.status == 200) {
    return await result.json();
  } else {
    throw Error(
      `Could not asset metadata. ${result.status} ${result.statusText} ${result.body}`,
    );
  }
};

export const useAssetMetadata = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const [relaychainNativeAsset, setRelayChainNativeAsset] = useAtom(
    relayChainNativeAssetAtom,
  );
  const [erc20Metadata, setErc20Metadata] = useAtom(assetErc20MetadataAtom);
  const { data, error } = useSWR([env, "assetMetaData"], fetchAssetMetadata, {
    refreshInterval: REFRESH_INTERVAL,
    suspense: true,
    fallbackData: null,
    revalidateOnFocus: false,
    revalidateOnMount: true,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
  useEffect(() => {
    if (data !== null) {
      setErc20Metadata(data.erc20Metadata);
      setRelayChainNativeAsset(data.relaychainNativeAsset);
    }
  }, [setErc20Metadata, setRelayChainNativeAsset, data]);
  return { relaychainNativeAsset, erc20Metadata, data, error };
};
