import {
  assetErc20MetaDataAtom,
  relayChainNativeAssetAtom,
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { Context, assets, environment } from "@snowbridge/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { AbstractProvider } from "ethers";
import { ethereumChainIdAtom, ethersProviderAtom } from "@/store/ethereum";
import { createContext } from "@/lib/snowbridge";

const connectSnowbridgeContext = async (
  env: environment.SnowbridgeEnvironment,
  ethereumProvider: AbstractProvider,
) => {
  const context = await createContext(ethereumProvider, env);

  const tokens = [
    ...new Set(
      env.locations
        .flatMap((l) => l.erc20tokensReceivable)
        .map((l) => l.address.toLowerCase()),
    ),
  ];
  const [network, relayChainNativeToken, assetMetadataList] = await Promise.all(
    [
      context.ethereum.api.getNetwork(),
      assets.parachainNativeAsset(context.polkadot.api.relaychain),
      Promise.all(
        tokens.map((t) =>
          assets
            .assetErc20Metadata(context, t)
            .then((m) => ({ token: t, metadata: m }))
            .catch((_) => null),
        ),
      ),
    ],
  );

  const assetMetadata: { [tokenAddress: string]: assets.ERC20Metadata } = {};
  assetMetadataList
    .filter((am) => am !== null)
    .forEach((am) => (assetMetadata[am!.token] = am!.metadata));

  return {
    context,
    chainId: Number(network.chainId.toString()),
    relayChainNativeToken,
    assetMetadata,
  };
};

export const useSnowbridgeContext = (): [
  Context | null,
  boolean,
  string | null,
] => {
  const [context, setContext] = useAtom(snowbridgeContextAtom);
  const setRelayChainNativeAsset = useSetAtom(relayChainNativeAssetAtom);
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
        setRelayChainNativeAsset(result.relayChainNativeToken);
        setAssetErc20MetaData(result.assetMetadata);
      })
      .catch((error) => {
        let message = "Unknown Error";
        if (error instanceof Error) {
          message = error.message;
        }
        setLoading(false);
        setError(message);
      });
  }, [
    env,
    chainId,
    setRelayChainNativeAsset,
    setAssetErc20MetaData,
    setContext,
    setError,
    setLoading,
    ethereumProvider,
  ]);

  return [context, loading, error];
};
