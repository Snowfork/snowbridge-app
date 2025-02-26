import { getServerContext } from "./context";
import { unstable_cache } from "next/cache";
import { stringify, parse } from "../json";
import { assetsV2 } from "@snowbridge/api";
import { getEnvironmentName } from "../snowbridge";
import { cache } from "react";

export const getAssetRegistry = cache(async () => {
  const context = await getServerContext();
  const registry = await assetsV2.buildRegistry(
    await assetsV2.fromContext(context),
  );
  return registry;
});

const CACHE_REVALIDATE_IN_SECONDS = 12 * 60 * 60; // 12 hour

export async function assetRegistryAsString() {
  const env = getEnvironmentName();
  const cache = unstable_cache(
    async () => {
      try {
        const context = await getServerContext();
        const registry = await assetsV2.buildRegistry(
          await assetsV2.fromContext(context),
        );
        return stringify(registry);
      } catch (err) {
        console.error(err);
        return Promise.resolve(null);
      }
    },
    [env, "asset-registry"],
    {
      tags: ["assets"],
      revalidate: CACHE_REVALIDATE_IN_SECONDS,
    },
  );
  const result = await cache();
  if (result === null) {
    return null;
  }
  return result;
}

export async function assetRegistry() {
  const result = await assetRegistryAsString();
  if (result === null) {
    return null;
  }
  return parse<assetsV2.AssetRegistry>(result);
}
