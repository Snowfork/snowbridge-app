import { getServerContext } from "./context";
import { unstable_cache } from "next/cache";
import { stringify, parse } from "../json";
import { assetsV2 } from "@snowbridge/api";
import { getEnvironmentName } from "../snowbridge";
import { cache } from "react";
import process from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

function cacheOnDisk<T>(
  filePath: string,
  generator: () => T | Promise<T>,
): Promise<T> {
  return (async () => {
    if (existsSync(filePath)) {
      // Read and parse existing cache file
      const data = await readFile(filePath);
      return JSON.parse(data.toString("utf-8"), (key, value) => {
        if (
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
        ) {
          return new Date(value);
        }
        if (typeof value === "string" && /^bigint:\d+$/.test(value)) {
          return BigInt(value.slice(7));
        }
        return value;
      }) as T;
    }

    // Generate new data and cache it
    const result = await generator();
    const json = JSON.stringify(
      result,
      (key, value) => {
        if (typeof value === "bigint") {
          return `bigint:${value.toString()}`;
        }
        return value;
      },
      2,
    );

    await writeFile(filePath, json);
    return result;
  })();
}

export const getAssetRegistry = cache(async () => {
  const fetch = async () => {
    const context = await getServerContext();
    const registry = await assetsV2.buildRegistry(
      await assetsV2.fromContext(context),
    );
    return registry;
  };
  if (process.env.NODE_ENV === "development") {
    const cacheFile = `public/.${getEnvironmentName()}.registry.json`;
    console.log(`using registry cache ${cacheFile}`);
    return await cacheOnDisk(cacheFile, fetch);
  }
  return await fetch();
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
