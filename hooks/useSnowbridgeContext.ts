import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { Context } from "@snowbridge/api";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { getDefaultProvider } from "ethers";
import { createContext } from "@/lib/snowbridge";
import {
  parachainConfigs,
  SnowbridgeEnvironmentNames,
} from "@/utils/parachainConfigs";
import { Environment } from "@snowbridge/base-types";

const createSnowbridgeContext = async (
  env: Environment,
  alchemyKey: string,
) => {
  // Hack: Remove when npm build is working again.
  let url: string;
  switch (env.ethChainId) {
    case 1:
      url = `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
      break;
    case 11155111:
      url = `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
      break;
    default:
      throw Error(`Alchemy Error`);
  }
  const ethereumProvider = getDefaultProvider(url);
  const parachains: { [paraId: string]: string } = {};
  Object.keys(env.parachains).forEach(
    (paraId) => (parachains[paraId] = env.parachains[paraId]),
  );
  // merge transfer and switch component parachain endpoints
  parachainConfigs[env.name as SnowbridgeEnvironmentNames].forEach(
    ({ parachainId, endpoint }) => (parachains[parachainId] = endpoint),
  );
  return await createContext(ethereumProvider, env, {
    bridgeHub: process.env.NEXT_PUBLIC_BRIDGE_HUB_URL,
    assetHub: process.env.NEXT_PUBLIC_ASSET_HUB_URL,
    relaychain: process.env.NEXT_PUBLIC_RELAY_CHAIN_URL,
    parachains,
    graphqlApiUrl: process.env.NEXT_PUBLIC_GRAPHQL_API_URL,
  });
};

export const useSnowbridgeContext = (): [
  Context | null,
  boolean,
  string | null,
] => {
  const [context, setContext] = useAtom(snowbridgeContextAtom);

  const env = useAtomValue(snowbridgeEnvironmentAtom);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (context !== null) return;
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
    if (!alchemyKey) {
      setContext(null);
      return;
    }
    setLoading(true);
    createSnowbridgeContext(env, alchemyKey)
      .then((context) => {
        setLoading(false);
        setContext(context);
      })
      .catch((error) => {
        console.error(error);
        let message = "Unknown Error";
        if (error instanceof Error) message = error.message;
        setLoading(false);
        setError(message);
      });
  }, [context, env, setContext, setError, setLoading]);

  return [context, loading, error];
};
