// Next.js serverless options
export const fetchCache = "default-no-store"; // Dont cache fetches unless asked.
export const dynamic = "force-dynamic"; // Always run dynamically
export const revalidate = 30; // Keep cache for 30 seconds
export const maxDuration = 90; // Timeout after

import { getErrorMessage, getTransferHistoryV2 } from "@/lib/snowbridge";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const CACHE_REVALIDATE_IN_SECONDS = 30; // 30 seconds

const getCachedTransferHistory = unstable_cache(
  () => {
    try {
      return getTransferHistoryV2();
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
