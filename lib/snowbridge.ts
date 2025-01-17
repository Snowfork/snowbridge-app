import {
  assets,
  Context,
  contextFactory,
  environment,
  history,
  historyV2,
  subscan,
} from "@snowbridge/api";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import {
  BeefyClient__factory,
  IGateway__factory,
} from "@snowbridge/contract-types";
import { AbstractProvider, AlchemyProvider } from "ethers";

export const SKIP_LIGHT_CLIENT_UPDATES = true;
export const HISTORY_IN_SECONDS = 60 * 60 * 24 * 7 * 1; // 1 Weeks
export const ETHEREUM_BLOCK_TIME_SECONDS = 12;

export function getEnvironmentName() {
  const name = process.env.NEXT_PUBLIC_SNOWBRIDGE_ENV;
  if (!name) throw new Error("NEXT_PUBLIC_SNOWBRIDGE_ENV var not configured.");
  return name;
}

export function getEnvironment() {
  const envName = getEnvironmentName();
  const env: environment.SnowbridgeEnvironment =
    environment.SNOWBRIDGE_ENV[envName];

  if (env === undefined)
    throw new Error(
      `NEXT_PUBLIC_SNOWBRIDGE_ENV configured for unknown environment '${envName}'`,
    );
  return env;
}

export async function getTransferHistory(
  env: environment.SnowbridgeEnvironment,
  skipLightClientUpdates: boolean,
  historyInSeconds: number,
) {
  console.log("Fetching transfer history.");
  if (!env.config.SUBSCAN_API) {
    console.warn(`No subscan api urls configured for ${env.name}`);
    return [];
  }
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  if (!alchemyKey) {
    throw Error("Missing Alchemy Key");
  }

  const subscanKey = process.env.NEXT_PUBLIC_SUBSCAN_KEY;
  if (!subscanKey) {
    throw Error("Missing Subscan Key");
  }

  const ethereumProvider = new AlchemyProvider(env.ethChainId, alchemyKey);

  const assetHubScan = subscan.createApi(
    env.config.SUBSCAN_API.ASSET_HUB_URL,
    subscanKey,
  );
  const bridgeHubScan = subscan.createApi(
    env.config.SUBSCAN_API.BRIDGE_HUB_URL,
    subscanKey,
  );
  const relaychainScan = subscan.createApi(
    env.config.SUBSCAN_API.RELAY_CHAIN_URL,
    subscanKey,
  );

  const bridgeHubParaId = env.config.BRIDGE_HUB_PARAID;
  const assetHubParaId = env.config.ASSET_HUB_PARAID;
  const beacon_url = env.config.BEACON_HTTP_API;

  const beefyClient = BeefyClient__factory.connect(
    env.config.BEEFY_CONTRACT,
    ethereumProvider,
  );
  const gateway = IGateway__factory.connect(
    env.config.GATEWAY_CONTRACT,
    ethereumProvider,
  );
  const ethereumSearchPeriodBlocks =
    historyInSeconds / ETHEREUM_BLOCK_TIME_SECONDS;

  const ethNowBlock = await ethereumProvider.getBlock("latest", false);
  const now = new Date();
  const utcNowTimestamp = Math.floor(now.getTime() / 1000);

  const toAssetHubBlock = await subscan.fetchBlockNearTimestamp(
    assetHubScan,
    utcNowTimestamp,
  );
  const fromAssetHubBlock = await subscan.fetchBlockNearTimestamp(
    assetHubScan,
    utcNowTimestamp - historyInSeconds,
  );

  const toBridgeHubBlock = await subscan.fetchBlockNearTimestamp(
    bridgeHubScan,
    utcNowTimestamp,
  );
  const fromBridgeHubBlock = await subscan.fetchBlockNearTimestamp(
    bridgeHubScan,
    utcNowTimestamp - historyInSeconds,
  );

  if (ethNowBlock === null) {
    throw Error("Could not fetch latest Ethereum block.");
  }

  const searchRange = {
    assetHub: {
      fromBlock: fromAssetHubBlock.block_num,
      toBlock: toAssetHubBlock.block_num,
    },
    bridgeHub: {
      fromBlock: fromBridgeHubBlock.block_num,
      toBlock: toBridgeHubBlock.block_num,
    },
    ethereum: {
      fromBlock: ethNowBlock.number - ethereumSearchPeriodBlocks,
      toBlock: ethNowBlock.number,
    },
  };
  console.log("Search ranges:", searchRange);

  const toEthereum = await history.toEthereumHistory(
    assetHubScan,
    bridgeHubScan,
    relaychainScan,
    searchRange,
    skipLightClientUpdates,
    env.ethChainId,
    assetHubParaId,
    beefyClient,
    gateway,
  );
  console.log("To Ethereum transfers:", toEthereum.length);

  const toPolkadot = await history.toPolkadotHistory(
    assetHubScan,
    bridgeHubScan,
    searchRange,
    skipLightClientUpdates,
    bridgeHubParaId,
    gateway,
    ethereumProvider,
    beacon_url,
  );
  console.log("To Polkadot transfers:", toPolkadot.length);

  const transfers = [...toEthereum, ...toPolkadot];
  transfers.sort((a, b) => b.info.when.getTime() - a.info.when.getTime());
  return transfers;
}

export interface AccountInfo {
  name: string;
  type: "ethereum" | "substrate";
  account: string;
  balance: string;
}

export type BridgedAssetsMetadata = {
  relaychainNativeAsset: assets.NativeAsset;
  erc20Metadata: {
    [tokenAddress: string]: assets.ERC20Metadata;
  };
};

export type ContextOverrides = {
  bridgeHub?: string;
  assetHub?: string;
  relaychain?: string;
  parachains?: string[];
  graphqlApiUrl?: string;
};

export async function createContext(
  ethereumProvider: AbstractProvider,
  { config }: SnowbridgeEnvironment,
  overrides?: ContextOverrides,
) {
  return contextFactory({
    ethereum: {
      execution_url: ethereumProvider,
      beacon_url: config.BEACON_HTTP_API,
    },
    polkadot: {
      url: {
        bridgeHub: overrides?.bridgeHub ?? config.BRIDGE_HUB_URL,
        assetHub: overrides?.assetHub ?? config.ASSET_HUB_URL,
        relaychain: overrides?.relaychain ?? config.RELAY_CHAIN_URL,
        parachains: overrides?.parachains ?? config.PARACHAINS,
      },
    },
    appContracts: {
      gateway: config.GATEWAY_CONTRACT,
      beefy: config.BEEFY_CONTRACT,
    },
    graphqlApiUrl: overrides?.graphqlApiUrl ?? config.GRAPHQL_API_URL,
  });
}

export function getErrorMessage(err: any) {
  let message = "Unknown error";
  if (err instanceof Error) {
    message = err.message;
  }
  console.error(message, err);
  return message;
}

export async function assetMetadata(
  context: Context,
  env: SnowbridgeEnvironment,
): Promise<BridgedAssetsMetadata> {
  const tokens = [
    ...new Set(
      env.locations
        .flatMap((l) => l.erc20tokensReceivable)
        .map((l) => l.address.toLowerCase()),
    ),
  ];

  const erc20Metadata: { [tokenAddress: string]: assets.ERC20Metadata } = {};
  const [relaychainNativeAsset] = await Promise.all([
    assets.parachainNativeAsset(context.polkadot.api.relaychain),
    (async () => {
      for (const token of tokens) {
        try {
          erc20Metadata[token.toLowerCase()] = await assets.assetErc20Metadata(
            context,
            token,
          );
        } catch (error) {
          getErrorMessage(error);
        }
      }
    })(),
  ]);

  return {
    relaychainNativeAsset,
    erc20Metadata,
  };
}

export async function getTransferHistoryV2(
  env: environment.SnowbridgeEnvironment,
) {
  console.log("Fetching transfer history.");

  const toEthereum = await historyV2.toEthereumHistory();
  console.log("To Ethereum transfers V2:", toEthereum.length);

  const toPolkadot = await historyV2.toPolkadotHistory();
  console.log("To Polkadot transfers V2:", toPolkadot.length);

  const transfers = [...toEthereum, ...toPolkadot];
  transfers.sort((a, b) => b.info.when.getTime() - a.info.when.getTime());
  return transfers;
}
