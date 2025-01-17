// Next.js serverless options
export const fetchCache = "default-no-store"; // Dont cache fetches unless asked.
export const dynamic = "force-dynamic"; // Always run dynamically
export const revalidate = 120; // Keep cache for 2 minutes
export const maxDuration = 90; // Timout adter

import {
  HISTORY_IN_SECONDS,
  SKIP_LIGHT_CLIENT_UPDATES,
  getEnvironment,
  getErrorMessage,
  getTransferHistory,
  getTransferHistoryV2,
} from "@/lib/snowbridge";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const CACHE_REVALIDATE_IN_SECONDS = 2 * 60; // 2 minutes

const getCachedTransferHistory = unstable_cache(
  () => {
    try {
      let graphqlApiEnabled = process.env["GRAPHQL_API_ENABLED"] == "true";
      const env = getEnvironment();
      if (graphqlApiEnabled) {
        return getTransferHistoryV2(env);
      } else {
        return getTransferHistory(
          env,
          SKIP_LIGHT_CLIENT_UPDATES,
          HISTORY_IN_SECONDS,
        );
      }
    } catch (err) {
      getErrorMessage(err);
      return Promise.resolve([]);
    }
  },
  ["transfer-history"],
  {
    tags: ["history"],
    revalidate: CACHE_REVALIDATE_IN_SECONDS,
  },
);

export async function GET() {
  try {
    const history = await getCachedTransferHistory();
    return NextResponse.json(history);
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
