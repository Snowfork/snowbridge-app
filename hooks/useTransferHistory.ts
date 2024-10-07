import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { Transfer } from "@/store/transferHistory";
import { useAtomValue } from "jotai";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 15 * 60 * 1000; // 15 minutes
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

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
    revalidateOnMount: true,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
