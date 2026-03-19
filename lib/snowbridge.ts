import { createApi, historyV2, SnowbridgeApi } from "@snowbridge/api";
import { Environment } from "@snowbridge/base-types";
import { bridgeInfoFor } from "@snowbridge/registry";
import { AbstractProvider } from "ethers";
import { EthersEthereumProvider } from "@snowbridge/provider-ethers";

export function getEnvironmentName() {
  const name = process.env.NEXT_PUBLIC_SNOWBRIDGE_ENV;
  if (!name) throw new Error("NEXT_PUBLIC_SNOWBRIDGE_ENV var not configured.");
  return name;
}

export function getEnvironment() {
  const envName = getEnvironmentName();
  const env: Environment = bridgeInfoFor(envName).environment;

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

export type ContextOverrides = {
  bridgeHub?: string;
  assetHub?: string;
  relaychain?: string;
  parachains?: { [paraId: string]: string };
  graphqlApiUrl?: string;
};

export type SnowbridgeClient = SnowbridgeApi<EthersEthereumProvider>;
export type SnowbridgeContext = SnowbridgeClient["context"];

export function createSnowbridgeApi(
  ethereumProvider: AbstractProvider | undefined,
  envName: string,
  overrides?: ContextOverrides,
) {
  const info = bridgeInfoFor(envName);
  const env = info.environment;
  const allParachains = {
    ...env.parachains,
    ...overrides?.parachains,
  };
  const assetHubParaKey = env.assetHubParaId.toString();
  allParachains[assetHubParaKey] =
    overrides?.assetHub ?? env.parachains[assetHubParaKey];
  const bridgeHubParaKey = env.bridgeHubParaId.toString();
  allParachains[bridgeHubParaKey] =
    overrides?.bridgeHub ?? env.parachains[bridgeHubParaKey];

  const overrideEnv = { ...env };
  overrideEnv.parachains = allParachains;
  overrideEnv.relaychainUrl = overrides?.relaychain ?? env.relaychainUrl;
  overrideEnv.indexerGraphQlUrl =
    overrides?.graphqlApiUrl ?? env.indexerGraphQlUrl;
  if (overrides?.bridgeHub) {
    overrideEnv.parachains[env.bridgeHubParaId.toString()] =
      overrides.bridgeHub;
  }
  if (overrides?.assetHub) {
    overrideEnv.parachains[env.assetHubParaId.toString()] = overrides.assetHub;
  }

  const api = createApi({
    info: {
      ...info,
      environment: overrideEnv,
    },
    ethereumProvider: new EthersEthereumProvider(),
  });
  if (ethereumProvider) {
    api.context.setEthProvider(env.ethChainId, ethereumProvider);
  }
  return api;
}

export function getErrorMessage(err: any) {
  let message = "Unknown error";
  if (err instanceof Error) {
    message = err.message;
  }
  console.error(message, err);
  return message;
}

export async function getTransferActivityV2() {
  const env = getEnvironment();
  console.log("Fetching transfer activity.");

  const toEthereum = await historyV2.toEthereumHistory(env.indexerGraphQlUrl);
  console.log("To Ethereum transfers V2:", toEthereum.length);

  const toPolkadot = await historyV2.toPolkadotHistory(env.indexerGraphQlUrl);
  console.log("To Polkadot transfers V2:", toPolkadot.length);

  const transfers = [...toEthereum, ...toPolkadot];
  transfers.sort((a, b) => b.info.when.getTime() - a.info.when.getTime());
  return transfers;
}
