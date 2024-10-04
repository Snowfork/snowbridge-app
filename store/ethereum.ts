import { AbstractProvider, BrowserProvider, Eip1193Provider } from "ethers";
import { atom } from "jotai";

export const ethersProviderAtom = atom<BrowserProvider | null>(null);
export const windowEthereumAtom = atom<Eip1193Provider | null>(null);
export const windowEthereumTypeAtom = atom<string | null>(null);
export const ethereumAccountsAtom = atom<string[]>([]);
export const ethereumAccountAtom = atom<string | null>(null);
export const ethereumChainIdAtom = atom<number | null>(null);
