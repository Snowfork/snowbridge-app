import { BrowserProvider, Eip1193Provider } from "ethers"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type EthereumProvider = Eip1193Provider & BrowserProvider

export const ethersProviderAtom = atom<EthereumProvider | null>(null)
export const ethereumAccountsAtom = atom<string[]>([])
export const ethereumAccountAtom = atom<string | null>(null)
export const ethereumChainIdAtom = atom<number | null>(null)
export const ethereumWalletAuthorizedAtom = atomWithStorage<boolean>('wallet_authed', false)