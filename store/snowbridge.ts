import {
  getEnvironment,
  getEnvironmentName,
  AppContext,
} from "@/lib/snowbridge";
import { atom } from "jotai";

(() => {
  // remove old storage keys
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem("erc20_metadata");
    localStorage.removeItem("relaychain_native_asset");
  }
})();

export const snowbridgeContextAtom = atom<AppContext | null>(null);
export const snowbridgeEnvNameAtom = atom((_) => getEnvironmentName());
export const snowbridgeEnvironmentAtom = atom((_) => getEnvironment());
