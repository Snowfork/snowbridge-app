import { getEnvironment, getEnvironmentName } from "@/lib/snowbridge";
import { Context, assets } from "@snowbridge/api";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const relayChainNativeAssetAtom =
  atomWithStorage<assets.NativeAsset | null>("relaychain_native_asset", null);
export const assetErc20MetaDataAtom = atomWithStorage<{
  [tokenAddress: string]: assets.ERC20Metadata;
} | null>("erc20_metadata", null);
export const snowbridgeContextAtom = atom<Context | null>(null);

export const snowbridgeEnvNameAtom = atom((_) => getEnvironmentName());
export const snowbridgeEnvironmentAtom = atom((_) => getEnvironment());
