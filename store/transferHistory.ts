import { history } from "@snowbridge/api";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type Transfer = (
  | history.ToEthereumTransferResult
  | history.ToPolkadotTransferResult
) & { isWalletTransaction?: boolean };

const transfersPendingLocalStorageAtom = atomWithStorage<Transfer[]>(
  "transfers_pending_local",
  [],
);

export type PendingTransferAction = {
  kind: "add" | "remove";
  transfer: Transfer;
};
const transfersPendingReducer = (
  pending: Transfer[],
  action: PendingTransferAction,
) => {
  switch (action.kind) {
    case "add":
      return [action.transfer, ...pending];
    case "remove":
      return pending.filter((t) => t.id !== action.transfer.id);
    default:
      return pending;
  }
};

export const transferHistoryShowGlobal = atomWithStorage(
  "transfer_history_show_global",
  false,
);

export const transfersPendingLocalAtom = atom(
  (get) => get(transfersPendingLocalStorageAtom),
  (get, set, action: PendingTransferAction) => {
    const current = get(transfersPendingLocalStorageAtom);
    set(
      transfersPendingLocalStorageAtom,
      transfersPendingReducer(current, action),
    );
  },
);

export const transferHistoryCacheAtom = atomWithStorage<Transfer[]>(
  "transfer_history_cache",
  [],
);
