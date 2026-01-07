import { Context, historyV2 } from "@snowbridge/api";
import { Environment } from "@snowbridge/base-types";
import { environmentFor } from "@snowbridge/registry";
import { AbstractProvider } from "ethers";

export function getEnvironmentName() {
  const name = process.env.NEXT_PUBLIC_SNOWBRIDGE_ENV;
  if (!name) throw new Error("NEXT_PUBLIC_SNOWBRIDGE_ENV var not configured.");
  return name;
}

export function getEnvironment() {
  const envName = getEnvironmentName();
  const env: Environment = environmentFor(envName);

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

export async function createContext(
  ethereumProvider: AbstractProvider,
  env: Environment,
  overrides?: ContextOverrides,
) {
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

  let overrideEnv = { ...env };
  overrideEnv.parachains = allParachains;
  overrideEnv.relaychainUrl = overrides?.relaychain ?? env.relaychainUrl;

  const context = new Context(overrideEnv);
  context.setEthProvider(env.ethChainId, ethereumProvider);
  return context;
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
