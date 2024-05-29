import {
  assetErc20MetaDataAtom,
  assetHubNativeTokenAtom,
  snowbridgeContextAtom,
  snowbridgeContextEthChainIdAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { Context, assets, contextFactory, environment } from "@snowbridge/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";

const connectSnowbridgeContext = async ({
  config,
  locations,
}: environment.SnowbridgeEnvironment) => {
  const k = process.env.NEXT_PUBLIC_ALCHEMY_KEY || "";
  const context = await contextFactory({
    ethereum: {
      execution_url: config.ETHEREUM_WS_API(k),
      beacon_url: config.BEACON_HTTP_API,
    },
    polkadot: {
      url: {
        bridgeHub: config.BRIDGE_HUB_WS_URL,
        assetHub: config.ASSET_HUB_WS_URL,
        relaychain: config.RELAY_CHAIN_WS_URL,
        parachains: config.PARACHAINS,
      },
    },
    appContracts: {
      gateway: config.GATEWAY_CONTRACT,
      beefy: config.BEEFY_CONTRACT,
    },
  });

  const tokens = [
    ...new Set(
      locations
        .flatMap((l) => Object.values(l.erc20tokensReceivable))
        .map((l) => l.toLowerCase()),
    ),
  ];
  const [network, assetHubNativeToken, assetMetadataList] = await Promise.all([
    context.ethereum.api.getNetwork(),
    assets.parachainNativeToken(context.polkadot.api.assetHub),
    Promise.all(
      tokens.map((t) =>
        assets
          .assetErc20Metadata(context, t)
          .then((m) => ({ token: t, metadata: m })),
      ),
    ),
  ]);

  const assetMetadata: { [tokenAddress: string]: assets.ERC20Metadata } = {};
  assetMetadataList.forEach((am) => (assetMetadata[am.token] = am.metadata));

  return {
    context,
    chainId: Number(network.chainId.toString()),
    assetHubNativeToken,
    assetMetadata,
  };
};

export const useSnowbridgeContext = (): [
  Context | null,
  boolean,
  string | null,
] => {
  const [context, setContext] = useAtom(snowbridgeContextAtom);
  const setChainId = useSetAtom(snowbridgeContextEthChainIdAtom);
  const setAssetHubNativeToken = useSetAtom(assetHubNativeTokenAtom);
  const setAssetErc20MetaData = useSetAtom(assetErc20MetaDataAtom);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const env = useAtomValue(snowbridgeEnvironmentAtom);

  useEffect(() => {
    setLoading(true);
    connectSnowbridgeContext(env)
      .then((result) => {
        setLoading(false);
        setContext(result.context);
        setChainId(result.chainId);
        setAssetHubNativeToken(result.assetHubNativeToken);
        setAssetErc20MetaData(result.assetMetadata);
      })
      .catch((error) => {
        let message = "Unknown Error";
        if (error instanceof Error) message = error.message;
        setLoading(false);
        setError(message);
      });
  }, [
    env,
    setAssetHubNativeToken,
    setAssetErc20MetaData,
    setChainId,
    setContext,
    setError,
    setLoading,
  ]);

  return [context, loading, error];
};
