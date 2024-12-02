// Next.js serverless options
export const fetchCache = "default-no-store"; // Dont cache fetches unless asked.
export const dynamic = "force-dynamic"; // Always run dynamically
export const revalidate = 120; // Keep cache for 2 minutes
export const maxDuration = 90; // Timout adter

import { getBridgeStatus } from "@/lib/bridgeStatus";
import { getServerContext } from "@/lib/server/context";
import { getEnvironment, getErrorMessage } from "@/lib/snowbridge";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const CACHE_REVALIDATE_IN_SECONDS = 60; // 1 minutes

const getCachedBridgeStatus = unstable_cache(
  async () => {
    const env = getEnvironment();
    try {
      const context = await getServerContext();
      const status = await getBridgeStatus(context, env);
      return status;
    } catch (err) {
      getErrorMessage(err);
      return Promise.resolve(null);
    }
  },
  ["bridge-status"],
  {
    tags: ["status"],
    revalidate: CACHE_REVALIDATE_IN_SECONDS,
  },
);

export async function GET() {
  try {
    const status = await getCachedBridgeStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
