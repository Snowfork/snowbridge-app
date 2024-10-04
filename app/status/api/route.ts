// Next.js serverless options
export const fetchCache = "default-no-store"; // Dont cache fetches unless asked.
export const dynamic = "force-dynamic"; // Always run dynamically
export const revalidate = 120; // Keep cache for 2 minutes
export const maxDuration = 90; // Timout adter

import {
  createContext,
  getBridgeStatus,
  getEnvironment,
  getErrorMessage,
} from "@/lib/snowbridge";
import { Context } from "@snowbridge/api";
import { AbstractProvider, AlchemyProvider, WebSocketProvider } from "ethers";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const CACHE_REVALIDATE_IN_SECONDS = 60; // 1 minutes

let context: Context | null = null;
async function getContext() {
  if (context) {
    return context;
  }
  const env = getEnvironment();

  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  if (!alchemyKey) {
    throw Error("Missing Alchemy Key");
  }

  let ethereumProvider: AbstractProvider;
  if (env.name === "local_e2e") {
    ethereumProvider = new WebSocketProvider(
      env.config.ETHEREUM_API(alchemyKey),
      env.ethChainId,
    );
  } else {
    ethereumProvider = new AlchemyProvider(env.ethChainId, alchemyKey);
  }

  context = await createContext(ethereumProvider, env);
  return context;
}

const getCachedBridgeStatus = unstable_cache(
  async () => {
    const env = getEnvironment();
    try {
      const context = await getContext();
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
