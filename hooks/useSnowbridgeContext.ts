import {
  assetErc20MetaDataAtom,
  assetHubNativeTokenAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import {
  Context,
  assets,
  contextFactory,
  destroyContext,
  environment,
} from "@snowbridge/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { AbstractProvider } from "ethers";
import { ethereumChainIdAtom, ethersProviderAtom } from "@/store/ethereum";

const connectSnowbridgeContext = async (
  { config, locations }: environment.SnowbridgeEnvironment,
  ethereumProvider: AbstractProvider,
) => {
  const context = await contextFactory({
    ethereum: {
      execution_url: ethereumProvider,
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
          .then((m) => ({ token: t, metadata: m }))
          .catch((_) => null),
      ),
    ),
  ]);

  const assetMetadata: { [tokenAddress: string]: assets.ERC20Metadata } = {};
  assetMetadataList
    .filter((am) => am !== null)
    .forEach((am) => (assetMetadata[am!.token] = am!.metadata));

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
  const setAssetHubNativeToken = useSetAtom(assetHubNativeTokenAtom);
  const setAssetErc20MetaData = useSetAtom(assetErc20MetaDataAtom);

  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const chainId = useAtomValue(ethereumChainIdAtom);
  const env = useAtomValue(snowbridgeEnvironmentAtom);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (env.ethChainId !== chainId) {
      setContext(null);
      return;
    }
    if (ethereumProvider === null) {
      setContext(null);
      return;
    }
    setLoading(true);
    connectSnowbridgeContext(env, ethereumProvider)
      .then((result) => {
        setLoading(false);
        setContext(result.context);
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
    chainId,
    setAssetHubNativeToken,
    setAssetErc20MetaData,
    setContext,
    setError,
    setLoading,
    ethereumProvider,
  ]);

  return [context, loading, error];
};
