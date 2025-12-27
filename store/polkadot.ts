import type { Signer } from "@polkadot/types/types";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Compatible type with both LunoKit Account and legacy WalletAccount usage
export interface PolkadotAccount {
  address: string;
  name?: string;
  publicKey?: string;
  type?: string;
  // Legacy compatibility - signer is now obtained via connector.getSigner()
  signer?: Signer;
}

// Connector info for display purposes
export interface ConnectorInfo {
  id: string;
  name: string;
  icon?: string;
}

export const polkadotAccountsAtom = atom<PolkadotAccount[] | null>(null);
const polkadotAccountAddressAtom = atomWithStorage<string | null>(
  "polkadot_account_address",
  null,
);
export const polkadotAccountAtom = atom(
  (get) => {
    const polkadotAccountAddress = get(polkadotAccountAddressAtom);
    if (polkadotAccountAddress == null) return null;
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
export const walletSheetOpenAtom = atom<boolean>(false);

export const walletNameAtom = atomWithStorage<string | null>(
  "wallet_name",
  null,
);

const originalConnectorInfoAtom = atom<ConnectorInfo | null>(null);
export const connectorInfoAtom = atom(
  (get) => get(originalConnectorInfoAtom),
  (_get, set, newConnector: ConnectorInfo | null) => {
    set(originalConnectorInfoAtom, newConnector);
    set(walletNameAtom, newConnector != null ? newConnector.id : null);
  },
);

// Legacy alias for backward compatibility - returns connector info in wallet-like shape
export const walletAtom = atom(
  (get) => {
    const connector = get(connectorInfoAtom);
    if (!connector) return null;
    return {
      title: connector.name,
      extensionName: connector.id,
      logo: connector.icon ? { src: connector.icon } : undefined,
    };
  },
  (_get, set, newWallet: { title?: string; extensionName?: string; logo?: { src?: string } } | null) => {
    if (!newWallet) {
      set(connectorInfoAtom, null);
    } else {
      set(connectorInfoAtom, {
        id: newWallet.extensionName ?? "",
        name: newWallet.title ?? "",
        icon: newWallet.logo?.src,
      });
    }
  },
);
