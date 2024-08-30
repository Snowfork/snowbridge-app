import { getEnvironment, getEnvironmentName } from "@/lib/snowbridge";
import { Context, assets } from "@snowbridge/api";
import { atom } from "jotai";

export const relayChainNativeAssetAtom = atom<assets.NativeAsset | null>(null);
export const assetErc20MetaDataAtom = atom<{
  [tokenAddress: string]: assets.ERC20Metadata;
} | null>(null);
export const snowbridgeContextAtom = atom<Context | null>(null);

export const snowbridgeEnvNameAtom = atom((_) => getEnvironmentName()); // this one is unnecessary. snowbridgeEnvironmentAtom.name can be used instead
export const snowbridgeEnvironmentAtom = atom((_) => getEnvironment());
