"use client";

import { Context } from "@snowbridge/api";
import useSWR from "swr";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { useAtomValue } from "jotai";
import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { ethereumChainIdAtom } from "@/store/ethereum";
import { BridgeStatus, getBridgeStatus } from "@/lib/snowbridge";

export const REFRESH_INTERVAL: number = 5 * 60 * 1000; // 5 minutes
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

const fetchStatus = async ([env, context]: [
  SnowbridgeEnvironment,
  Context | null,
]): Promise<BridgeStatus | null> => {
  if (process.env.NEXT_PUBLIC_USE_CLIENT_SIDE_HISTORY_FETCH === "true") {
    try {
      if (context === null) {
        return null;
      }
      return await getBridgeStatus(context, env);
    } catch (err) {
      console.error(err);
      throw err;
    }
  } else {
    console.log("Fetching bridge status server side");
    const result = await fetch("/status/api");
    if (result.status == 200) {
      return await result.json();
    } else {
      throw Error(
        `Could not status history. ${result.status} ${result.statusText} ${result.body}`,
      );
    }
  }
};

export const useBridgeStatus = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  const chainId = useAtomValue(ethereumChainIdAtom);
  return useSWR([env, context, chainId, "bridgeStatus"], fetchStatus, {
    refreshInterval: REFRESH_INTERVAL,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    suspense: true,
    fallbackData: null,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
