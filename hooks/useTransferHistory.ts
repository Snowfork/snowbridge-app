import {
  snowbridgeContextAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import { Context, environment, history, subscan } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import useSWR from "swr";

export const REFRESH_INTERVAL: number = 15 * 60 * 1000; // 15 minutes

export type Transfer =
  | history.ToEthereumTransferResult
  | history.ToPolkadotTransferResult;

const fetchTranferHistory = async ([env, context]: [
  environment.SnowbridgeEnvironment,
  Context | null,
]): Promise<Transfer[] | null> => {
  if (!context) return null;
  if (!env.config.SUBSCAN_API) return [];
  const k = process.env.NEXT_PUBLIC_SUBSCAN_KEY || "";

  const ethBlockTimeSeconds = 12;
  const polkadotBlockTimeSeconds = 9;
  const ethereumSearchPeriodBlocks =
    (60 * 60 * 24 * 7 * 2) / ethBlockTimeSeconds; // 2 Weeks
  const polkadotSearchPeriodBlocks =
    (60 * 60 * 24 * 7 * 2) / polkadotBlockTimeSeconds; // 2 Weeks

  const assetHubScan = subscan.createApi(
    env.config.SUBSCAN_API.ASSET_HUB_URL,
    k,
  );
  const bridgeHubScan = subscan.createApi(
    env.config.SUBSCAN_API.BRIDGE_HUB_URL,
    k,
  );
  const relaychainScan = subscan.createApi(
    env.config.SUBSCAN_API.RELAY_CHAIN_URL,
    k,
  );

  const [ethNowBlock, assetHubNowBlock, bridgeHubNowBlock] = await Promise.all([
    (async () => {
      const ethNowBlock = await context.ethereum.api.getBlock("latest");
      if (ethNowBlock == null) throw Error("Cannot fetch block");
      return ethNowBlock;
    })(),
    context.polkadot.api.assetHub.rpc.chain.getHeader(),
    context.polkadot.api.bridgeHub.rpc.chain.getHeader(),
  ]);
  const toEthereum = await history.toEthereumHistory(
    context,
    assetHubScan,
    bridgeHubScan,
    relaychainScan,
    {
      assetHub: {
        fromBlock:
          assetHubNowBlock.number.toNumber() - polkadotSearchPeriodBlocks,
        toBlock: assetHubNowBlock.number.toNumber(),
      },
      bridgeHub: {
        fromBlock:
          bridgeHubNowBlock.number.toNumber() - polkadotSearchPeriodBlocks,
        toBlock: bridgeHubNowBlock.number.toNumber(),
      },
      ethereum: {
        fromBlock: ethNowBlock.number - ethereumSearchPeriodBlocks,
        toBlock: ethNowBlock.number,
      },
    },
  );

  const toPolkadot = await history.toPolkadotHistory(
    context,
    assetHubScan,
    bridgeHubScan,
    {
      assetHub: {
        fromBlock:
          assetHubNowBlock.number.toNumber() - polkadotSearchPeriodBlocks,
        toBlock: assetHubNowBlock.number.toNumber(),
      },
      bridgeHub: {
        fromBlock:
          bridgeHubNowBlock.number.toNumber() - polkadotSearchPeriodBlocks,
        toBlock: bridgeHubNowBlock.number.toNumber(),
      },
      ethereum: {
        fromBlock: ethNowBlock.number - ethereumSearchPeriodBlocks,
        toBlock: ethNowBlock.number,
      },
    },
  );

  const transfers = [...toEthereum, ...toPolkadot];
  transfers.sort((a, b) => b.info.when.getTime() - a.info.when.getTime());
  return transfers;
};

export const useTransferHistory = () => {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const context = useAtomValue(snowbridgeContextAtom);
  return useSWR([env, context, "history"], fetchTranferHistory, {
    refreshInterval: REFRESH_INTERVAL,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    suspense: true,
    fallbackData: null,
  });
};
