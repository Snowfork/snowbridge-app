import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { Context, environment } from "@snowbridge/api";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { AlchemyProvider } from "ethers";
import { createContext } from "@/lib/snowbridge";
import {
  parachainConfigs,
  SnowbridgeEnvironmentNames,
} from "@/utils/parachainConfigs";

const createSnowbridgeContext = async (
  env: environment.SnowbridgeEnvironment,
  alchemyKey: string,
) => {
  const ethereumProvider = new AlchemyProvider(env.ethChainId, alchemyKey);
  const parachains: { [paraId: string]: string } = {};
  Object.keys(env.config.PARACHAINS).forEach(
    (paraId) => (parachains[paraId] = env.config.PARACHAINS[paraId]),
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
