import { assets, Context, environment, historyV2 } from "@snowbridge/api";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { AbstractProvider } from "ethers";

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
  parachains?: { [paraId: string]: string };
  graphqlApiUrl?: string;
};

export async function createContext(
  ethereumProvider: AbstractProvider,
  { kusamaConfig, config, ethChainId, name }: SnowbridgeEnvironment,
  overrides?: ContextOverrides,
) {
  const parachains = {
    ...config.PARACHAINS,
    ...overrides?.parachains,
  };
  const assetHubParaKey = config.ASSET_HUB_PARAID.toString();
  parachains[assetHubParaKey] =
    overrides?.assetHub ?? config.PARACHAINS[assetHubParaKey];
  const bridgeHubParaKey = config.BRIDGE_HUB_PARAID.toString();
  parachains[bridgeHubParaKey] =
    overrides?.bridgeHub ?? config.PARACHAINS[bridgeHubParaKey];

  const ethChains: { [ethChainId: string]: string | AbstractProvider } = {};
  Object.keys(config.ETHEREUM_CHAINS).forEach(
    (ethChainId) =>
      (ethChains[ethChainId.toString()] =
        config.ETHEREUM_CHAINS[ethChainId]("")),
  );
  ethChains[ethChainId.toString()] = ethereumProvider;

  let context: any = {
    environment: name,
    ethereum: {
      ethChainId,
      ethChains,
      beacon_url: config.BEACON_HTTP_API,
    },
    polkadot: {
      relaychain: overrides?.relaychain ?? config.RELAY_CHAIN_URL,
      assetHubParaId: config.ASSET_HUB_PARAID,
      bridgeHubParaId: config.BRIDGE_HUB_PARAID,
      parachains,
    },
    appContracts: {
      gateway: config.GATEWAY_CONTRACT,
      beefy: config.BEEFY_CONTRACT,
    },
    graphqlApiUrl: overrides?.graphqlApiUrl ?? config.GRAPHQL_API_URL,
  };

  if (name === "polkadot_mainnet" && kusamaConfig) {
    context.kusama = {
      assetHubParaId: kusamaConfig.ASSET_HUB_PARAID,
      bridgeHubParaId: kusamaConfig.BRIDGE_HUB_PARAID,
      parachains: kusamaConfig.PARACHAINS,
    };
  }

  return new Context(context);
}

export function getErrorMessage(err: any) {
  let message = "Unknown error";
  if (err instanceof Error) {
    message = err.message;
  }
  console.error(message, err);
  return message;
}

export async function getTransferHistoryV2() {
  console.log("Fetching transfer history.");

  const toEthereum = await historyV2.toEthereumHistory();
  console.log("To Ethereum transfers V2:", toEthereum.length);

  const toPolkadot = await historyV2.toPolkadotHistory();
  console.log("To Polkadot transfers V2:", toPolkadot.length);

  const transfers = [...toEthereum, ...toPolkadot];
  transfers.sort((a, b) => b.info.when.getTime() - a.info.when.getTime());
  return transfers;
}
