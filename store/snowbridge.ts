import { Context, environment, assets } from "@snowbridge/api";
import { atom } from "jotai";

export interface NativeToken {
  tokenSymbol: string;
  tokenDecimal: number;
  ss58Format: number | null;
}

export const assetHubNativeTokenAtom = atom<NativeToken | null>(null);
export const assetErc20MetaDataAtom = atom<{
  [tokenAddress: string]: assets.ERC20Metadata;
} | null>(null);
export const snowbridgeContextAtom = atom<Context | null>(null);

export const snowbridgeEnvNameAtom = atom(
  (_) => process.env.NEXT_PUBLIC_SNOWBRIDGE_ENV || "local_e2e",
);

export const snowbridgeEnvironmentAtom =
  atom<environment.SnowbridgeEnvironment>((get) => {
    const env = environment.SNOWBRIDGE_ENV[get(snowbridgeEnvNameAtom)];
    if (env === undefined) throw new Error(`Unknown environment '${env}'`);
    return env;
  });
