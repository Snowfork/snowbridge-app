import { historyV2 } from "@snowbridge/api";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type Transfer = (
  | historyV2.ToEthereumTransferResult
  | historyV2.ToPolkadotTransferResult
  | historyV2.InterParachainTransfer
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

export const transferActivityShowGlobal = atom(false);
