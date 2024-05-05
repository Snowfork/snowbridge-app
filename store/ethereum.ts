import { AbstractProvider, BrowserProvider, Eip1193Provider } from "ethers"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export const ethersProviderAtom = atom<BrowserProvider | null>(null)
export const windowEthereumAtom = atom<AbstractProvider & Eip1193Provider | null>(null)
export const ethereumAccountsAtom = atom<string[]>([])
export const ethereumAccountAtom = atom<string | null>(null)
export const ethereumChainIdAtom = atom<number | null>(null)
export const ethereumWalletAuthorizedAtom = atomWithStorage<boolean>('wallet_authed', false)