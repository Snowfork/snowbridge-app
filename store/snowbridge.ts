import { getEnvironment, getEnvironmentName } from "@/lib/snowbridge";
import { Context, assets } from "@snowbridge/api";
import { atom } from "jotai";

(() => {
  // remove old storage keys
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem("erc20_metadata");
    localStorage.removeItem("relaychain_native_asset");
  }
})();

export const relayChainNativeAssetAtom = atom<assets.NativeAsset | null>(null);
export const assetErc20MetaDataAtom = atom<{
  [tokenAddress: string]: assets.ERC20Metadata;
} | null>(null);
export const snowbridgeContextAtom = atom<Context | null>(null);

export const snowbridgeEnvNameAtom = atom((_) => getEnvironmentName());
export const snowbridgeEnvironmentAtom = atom((_) => getEnvironment());
