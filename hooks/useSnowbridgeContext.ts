import {
  snowbridgeApiAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
  snowbridgeEnvNameAtom,
} from "@/store/snowbridge";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { getDefaultProvider } from "ethers";
import { createSnowbridgeApi, type SnowbridgeContext } from "@/lib/snowbridge";
import {
  parachainConfigs,
  SnowbridgeEnvironmentNames,
} from "@/utils/parachainConfigs";
import { Environment } from "@snowbridge/base-types";

const createSnowbridgeContext = async (
  env: Environment,
  alchemyKey?: string,
) => {
  let ethereumProvider;
  if (alchemyKey) {
    ethereumProvider = getDefaultProvider(env.ethChainId, {
      alchemy: alchemyKey,
    });
  }
  const parachains: { [paraId: string]: string } = {};
  Object.keys(env.parachains).forEach(
    (paraId) => (parachains[paraId] = env.parachains[paraId]),
  );
  // merge transfer and switch component parachain endpoints
  parachainConfigs[env.name as SnowbridgeEnvironmentNames].forEach(
    ({ parachainId, endpoint }) => (parachains[parachainId] = endpoint),
  );
  return createSnowbridgeApi(ethereumProvider, env.name, {
    bridgeHub: process.env.NEXT_PUBLIC_BRIDGE_HUB_URL,
    assetHub: process.env.NEXT_PUBLIC_ASSET_HUB_URL,
    relaychain: process.env.NEXT_PUBLIC_RELAY_CHAIN_URL,
    parachains,
    graphqlApiUrl: process.env.NEXT_PUBLIC_GRAPHQL_API_URL,
  });
};

export const useSnowbridgeContext = (): [
  SnowbridgeContext | null,
  boolean,
  string | null,
] => {
  const [api, setApi] = useAtom(snowbridgeApiAtom);
  const context = useAtomValue(snowbridgeContextAtom);

  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const envName = useAtomValue(snowbridgeEnvNameAtom);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (api !== null) return;
    setLoading(true);
    createSnowbridgeContext(env, process.env.NEXT_PUBLIC_ALCHEMY_KEY)
      .then((nextApi) => {
        setLoading(false);
        setApi(nextApi);
      })
      .catch((error) => {
        console.error(error);
        let message = "Unknown Error";
        if (error instanceof Error) message = error.message;
        setLoading(false);
        setError(message);
      });
  }, [api, env, envName, setApi, setError, setLoading]);

  return [context, loading, error];
};
