import {
  type SnowbridgeClient,
} from "@/lib/snowbridge";
import { getEnvironment, getEnvironmentName } from "@/lib/snowbridgeEnv";
import { atom } from "jotai";

(() => {
  // remove old storage keys
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem("erc20_metadata");
    localStorage.removeItem("relaychain_native_asset");
  }
})();

export const snowbridgeApiAtom = atom<SnowbridgeClient | null>(null);
export const snowbridgeContextAtom = atom(
  (get) => get(snowbridgeApiAtom)?.context ?? null,
);
export const snowbridgeEnvNameAtom = atom((_) => getEnvironmentName());
export const snowbridgeEnvironmentAtom = atom((_) => getEnvironment());
