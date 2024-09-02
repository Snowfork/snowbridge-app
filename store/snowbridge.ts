import {
  getEnvironment,
  getEnvironmentName,
  parachainConfigs,
  populateParachainConfigs,
} from "@/lib/snowbridge";
import { printify } from "@/utils/printify";
import { Context, assets } from "@snowbridge/api";
import { atom } from "jotai";

export const relayChainNativeAssetAtom = atom<assets.NativeAsset | null>(null);
export const assetErc20MetaDataAtom = atom<{
  [tokenAddress: string]: assets.ERC20Metadata;
} | null>(null);
export const snowbridgeContextAtom = atom<Context | null>(null);

export const snowbridgeEnvNameAtom = atom((_) => getEnvironmentName()); // this one is unnecessary. snowbridgeEnvironmentAtom.name can be used instead
export const snowbridgeEnvironmentAtom = atom(async () => {
  await populateParachainConfigs();
  console.log(
    "Getting environment after adding this parachain configs: ",
    printify(parachainConfigs),
  );

  return getEnvironment();
});
