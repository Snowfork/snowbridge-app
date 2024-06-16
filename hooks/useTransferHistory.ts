import {
  HISTORY_IN_SECONDS,
  SKIP_LIGHT_CLIENT_UPDATES,
  getTransferHistory,
} from "@/lib/snowbridge";
import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { Transfer } from "@/store/transferHistory";
import { environment } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 15 * 60 * 1000; // 15 minutes
export const ERROR_RETRY_INTERVAL: number = 1 * 60 * 1000; // 1 minute

export const USE_CLIENT_SIDE_FETCH: boolean = true;

const fetchTranferHistory = async ([env]: [
  environment.SnowbridgeEnvironment,
]): Promise<Transfer[] | null> => {
  if (process.env.NEXT_PUBLIC_USE_CLIENT_SIDE_HISTORY_FETCH === "true") {
    console.log("Fetching history client side");
    return await getTransferHistory(
      env,
      SKIP_LIGHT_CLIENT_UPDATES,
      HISTORY_IN_SECONDS,
    );
  } else {
    console.log("Fetching history server side");
    const result = await fetch("/history/api");
    if (result.status == 200) {
      return await result.json();
    } else {
      throw Error(
        `Could not fetch history. ${result.status} ${result.statusText} ${result.body}`,
      );
    }
  }
};

export const useTransferHistory = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  return useSWR([env, context, "history"], fetchTranferHistory, {
    refreshInterval: REFRESH_INTERVAL,
    suspense: true,
    fallbackData: null,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    errorRetryInterval: ERROR_RETRY_INTERVAL,
    errorRetryCount: 120, // Retry 120 times every minute (2 hours)
  });
};
