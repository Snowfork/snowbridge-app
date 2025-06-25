import { getTransferHistoryV2 } from "@/lib/snowbridge";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 2 * 60 * 1000; // 2 minutes
export const ERROR_RETRY_INTERVAL: number = 2 * 60 * 1000; // 2 minute

export const useTransferHistory = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  return useSWR([env, "history"], getTransferHistoryV2, {
    refreshInterval: REFRESH_INTERVAL,
    suspense: true,
    fallbackData: [],
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
