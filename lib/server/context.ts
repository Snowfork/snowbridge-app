import { Context } from "@snowbridge/api";
import { getDefaultProvider } from "ethers";
import { createContext, getEnvironment } from "@/lib/snowbridge";

let context: Context | null = null;
export async function getServerContext(): Promise<Context> {
  if (context) return context;
  const env = getEnvironment();

  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  if (!alchemyKey) {
    throw Error("Missing Alchemy Key");
  }
  const ethereumProvider = getDefaultProvider(env.ethChainId, {
    alchemy: alchemyKey,
  });
  const ctx = await createContext(ethereumProvider, env, {
    bridgeHub:
      process.env.NEXT_PUBLIC_BRIDGE_HUB_HTTP_URL ??
      process.env.NEXT_PUBLIC_BRIDGE_HUB_URL,
    assetHub:
      process.env.NEXT_PUBLIC_ASSET_HUB_HTTP_URL ??
      process.env.NEXT_PUBLIC_ASSET_HUB_URL,
    relaychain:
      process.env.NEXT_PUBLIC_RELAY_CHAIN_HTTP_URL ??
      process.env.NEXT_PUBLIC_RELAY_CHAIN_URL,
    graphqlApiUrl: process.env.NEXT_PUBLIC_GRAPHQL_API_URL,
  });
  context = ctx;
  return ctx;
}
