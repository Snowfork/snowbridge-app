import { Wallet, WalletAccount } from "@talismn/connect-wallets";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const polkadotAccountsAtom = atom<WalletAccount[] | null>(null);
const polkadotAccountAddressAtom = atomWithStorage<string | null>(
  "polkadot_account_address",
  null,
);
export const polkadotAccountAtom = atom(
  (get) => {
    const polkadotAccountAddress = get(polkadotAccountAddressAtom);
    if (polkadotAccountAddress == null) {
      return null;
    }
    return (
      get(polkadotAccountsAtom)?.find(
        (account) => account.address === get(polkadotAccountAddressAtom),
      ) ?? null
    );
  },
  (_get, set, account: string | null) => {
    set(polkadotAccountAddressAtom, account);
  },
);
export const polkadotWalletModalOpenAtom = atom<boolean>(false);

export const walletNameAtom = atomWithStorage<string | null>(
  "wallet_name",
  null,
);

const originalWalletAtom = atom<Wallet | null>(null);
export const walletAtom = atom(
  (get) => get(originalWalletAtom),
  (_get, set, newWallet: Wallet | null) => {
    set(originalWalletAtom, newWallet);
    set(walletNameAtom, newWallet != null ? newWallet.extensionName : null);
  },
);
