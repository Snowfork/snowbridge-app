import { getServerContext } from "@/lib/server/context";
import {
  assetMetadata,
  getEnvironment,
  getErrorMessage,
} from "@/lib/snowbridge";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const CACHE_REVALIDATE_IN_SECONDS = 60 * 60; // 1 hour

const getCachedAssetMetadata = unstable_cache(
  async () => {
    const env = getEnvironment();
    try {
      const context = await getServerContext();
      const metadata = await assetMetadata(context, env);
      return metadata;
    } catch (err) {
      reportError(err);
      return Promise.resolve(null);
    }
  },
  ["bridge-status"],
  {
    tags: ["status"],
    revalidate: CACHE_REVALIDATE_IN_SECONDS,
  }
);

export async function GET() {
  try {
    const assets = await getCachedAssetMetadata();
    return NextResponse.json(assets);
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
