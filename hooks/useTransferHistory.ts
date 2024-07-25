import {
  HISTORY_IN_SECONDS,
  SKIP_LIGHT_CLIENT_UPDATES,
  getTransferHistory,
} from "@/lib/snowbridge";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { Transfer } from "@/store/transferHistory";
import { useAtomValue } from "jotai";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 5 * 1000; //15 * 60 * 1000; // 15 minutes
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

export const USE_CLIENT_SIDE_FETCH: boolean = true;

const fetchTranferHistory = async (): Promise<Transfer[] | null> => {
  console.log("Fetching history server side");
  const result = await fetch("/history/api");
  if (result.status == 200) {
    return await result.json();
  } else {
    throw Error(
      `Could not fetch history. ${result.status} ${result.statusText} ${result.body}`
    );
  }
};

export const useTransferHistory = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  return useSWR([env, "history"], fetchTranferHistory, {
    refreshInterval: REFRESH_INTERVAL,
    suspense: true,
    fallbackData: null,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
