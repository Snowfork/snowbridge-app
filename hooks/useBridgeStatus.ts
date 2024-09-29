"use client";

import useSWR from "swr";
import { useAtomValue } from "jotai";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { BridgeStatus } from "@/lib/snowbridge";

export const REFRESH_INTERVAL: number = 5 * 60 * 1000; // 5 minutes
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

const fetchStatus = async (): Promise<BridgeStatus | null> => {
  console.log("Fetching bridge status server side");
  const result = await fetch("/status/api");
  if (result.status == 200) {
    return await result.json();
  } else {
    throw Error(
      `Could not status history. ${result.status} ${result.statusText} ${result.body}`,
    );
  }
};

export const useBridgeStatus = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  return useSWR([env, "bridgeStatus"], fetchStatus, {
    refreshInterval: REFRESH_INTERVAL,
    revalidateOnFocus: false,
    revalidateOnMount: true,
    suspense: true,
    fallbackData: null,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
