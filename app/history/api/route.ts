// Next.js serverless options
export const fetchCache = "default-no-store"; // Dont cache fetches unless asked.
export const dynamic = "force-dynamic"; // Always run dynamically
export const revalidate = 120; // Keep cache for 2 minutes

import {
  HISTORY_IN_SECONDS,
  SKIP_LIGHT_CLIENT_UPDATES,
  getEnvironment,
  getTransferHistory,
} from "@/lib/snowbridge";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const CACHE_REVALIDATE_IN_SECONDS = 10; // 5 minutes

const getCachedTransferHistory = unstable_cache(
  () => {
    const env = getEnvironment();
    try {
      return getTransferHistory(
        env,
        SKIP_LIGHT_CLIENT_UPDATES,
        HISTORY_IN_SECONDS,
      );
    } catch (err) {
      reportError(err);
      return Promise.resolve([]);
    }
  },
  ["transfer-history"],
  {
    tags: ["history"],
    revalidate: CACHE_REVALIDATE_IN_SECONDS,
  },
);

function reportError(err: any) {
  let message = "Unknown error";
  if (err instanceof Error) {
    message = err.message;
  }
  console.error(message, err);
  return message;
}

let lastKnownHistory: any | null = null;
let lastSetTime: number | null = null;

export async function GET() {
  try {
    const waitForTime = (CACHE_REVALIDATE_IN_SECONDS + 5) * 1000;
    const now = new Date().getTime();
    let promise = null;
    if (
      lastSetTime === null ||
      lastKnownHistory === null ||
      lastSetTime < now - waitForTime
    ) {
      console.log("Fetching");
      promise = getCachedTransferHistory()
        .then((history) => {
          lastKnownHistory = history;
          lastSetTime = now;
          console.log("History set at ", lastSetTime);
          return history;
        })
        .catch(reportError);
    }
    let returnValue;
    if (lastKnownHistory == null && promise !== null) {
      console.log("Waiting");
      returnValue = await promise;
    } else {
      console.log("Return from local");
      returnValue = lastKnownHistory;
    }
    return NextResponse.json(returnValue);
  } catch (err) {
    return NextResponse.json({ error: reportError(err) }, { status: 500 });
  }
}
