import {
  AssetRegistry,
  buildRegistry,
  fromContext,
} from "@snowbridge/api/dist/assets_v2";
import { getServerContext } from "./context";
import { getEnvironmentName } from "../snowbridge";
import { unstable_cache } from "next/cache";
import { Context } from "@snowbridge/api";
import { stringify, parse } from "../json";

const CACHE_REVALIDATE_IN_SECONDS = 12 * 60 * 60; // 12 hour

async function buildAssetRegistry(context: Context, env: string) {
  let overrides = {};
  switch (env) {
    case "paseo_sepolia":
      {
        // Add override for mythos token and add precompile for moonbeam
        overrides = {
          destinationFeeOverrides: {
            "3369": 200_000_000_000n,
          },
          assetOverrides: {
            "3369": [
              {
                token:
                  "0xb34a6924a02100ba6ef12af1c798285e8f7a16ee".toLowerCase(),
                name: "Muse",
                minimumBalance: 10_000_000_000_000_000n,
                symbol: "MUSE",
                decimals: 18,
                isSufficient: true,
              },
            ],
          },
        };
      }
      break;
    case "polkadot_mainnet":
      {
        // Add override for mythos token and add precompile for moonbeam
        overrides = {
          precompiles: { "2004": "0x000000000000000000000000000000000000081A" },
          destinationFeeOverrides: {
            "3369": 500_000_000n,
          },
          assetOverrides: {
            "3369": [
              {
                token:
                  "0xba41ddf06b7ffd89d1267b5a93bfef2424eb2003".toLowerCase(),
                name: "Mythos",
                minimumBalance: 10_000_000_000_000_000n,
                symbol: "MYTH",
                decimals: 18,
                isSufficient: true,
              },
            ],
          },
        };
      }
      break;
  }
  const assetRegistry = await buildRegistry({
    ...(await fromContext(context)),
    ...overrides,
  });
  return assetRegistry;
}

export async function assetRegistry() {
  const cache = unstable_cache(
    async () => {
      const env = getEnvironmentName();
      try {
        const context = await getServerContext();
        const registry = await buildAssetRegistry(context, env);
        return stringify(registry);
      } catch (err) {
        reportError(err);
        return Promise.resolve(null);
      }
    },
    ["asset-registry"],
    {
      tags: ["assets"],
      revalidate: CACHE_REVALIDATE_IN_SECONDS,
    },
  );
  const result = await cache();
  if (result === null) {
    return null;
  }
  return parse<AssetRegistry>(result);
}
