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
import { AbstractProvider } from "ethers";
import { ethersProviderAtom } from "@/store/ethereum";

const connectSnowbridgeContext = async (
  { config, locations }: environment.SnowbridgeEnvironment,
  ethereumProvider: AbstractProvider,
) => {
  const context = await contextFactory(
    {
      ethereum: {
        execution_url: "badurl",
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
    },
    {
      ethereum: ethereumProvider,
    },
  );

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

  const ethereumProvider = useAtomValue(ethersProviderAtom);
  const env = useAtomValue(snowbridgeEnvironmentAtom);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ethereumProvider === null) {
      return;
    }
    setLoading(true);
    connectSnowbridgeContext(env, ethereumProvider)
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
    ethereumProvider,
  ]);

  return [context, loading, error];
};
