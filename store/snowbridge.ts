import { getEnvironment, getEnvironmentName } from "@/lib/snowbridge";
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

export const snowbridgeEnvNameAtom = atom((_) => getEnvironmentName());
export const snowbridgeEnvironmentAtom = atom((_) => getEnvironment());
