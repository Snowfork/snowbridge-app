import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type FormData = {
  source: string;
  sourceAccount: string;
  destination: string;
  token: string;
  amount: string;
  beneficiary: string;
};

export enum TransferStatus {
  InProgress,
  Failed,
  Complete,
}
export type Transfer = {
  id: string;
  status: TransferStatus;
  errorCount: number;
  when: string;
  tokenName: string;
  form: FormData;
  data: any;
};

export type TransferAction = "add" | "udpate" | "remove";
export type TransferUpdate = { action: TransferAction; transfer: Transfer };

const TRANSFER_HISTORY_VERSION = 2;

export type TransferHistory = {
  version: number;
  pending: Transfer[];
  complete: Transfer[];
};

const stripDataBigInts = (data: unknown) =>
  JSON.parse(
    JSON.stringify(data, (_, v) => {
      switch (typeof v) {
        case "bigint":
          return v.toString();
      }
      return v;
    }),
  );

const EMPTY_TRANSFERS = {
  version: TRANSFER_HISTORY_VERSION,
  pending: [],
  complete: [],
};

const transfersStorageAtom = atomWithStorage<TransferHistory>(
  "transfer_history",
  EMPTY_TRANSFERS,
);
const transferReducer = (current: TransferHistory, update: TransferUpdate) => {
  let updated = current;
  if (updated.version != TRANSFER_HISTORY_VERSION) {
    updated = EMPTY_TRANSFERS;
  }

  switch (update.action) {
    case "add": {
      update.transfer.data = stripDataBigInts(update.transfer.data);
      updated.pending.push(update.transfer);
      break;
    }
    case "udpate": {
      updated.pending = current.pending.filter(
        (t) => t.id !== update.transfer.id,
      );
      update.transfer.data = stripDataBigInts(update.transfer.data);
      if (update.transfer.status == TransferStatus.InProgress) {
        updated.pending.push(update.transfer);
      } else {
        updated.complete.push(update.transfer);
      }
      break;
    }
    case "remove": {
      updated.pending = current.pending.filter(
        (t) => t.id !== update.transfer.id,
      );
      updated.complete = current.complete.filter(
        (t) => t.id !== update.transfer.id,
      );
      break;
    }
  }
  updated.pending.sort(
    (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
  );
  updated.complete.sort(
    (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
  );
  return updated;
};

export const transfersAtom = atom(
  (get) => {
    let transfers = get(transfersStorageAtom);
    if (transfers.version != TRANSFER_HISTORY_VERSION) {
      transfers = EMPTY_TRANSFERS;
    }
    return transfers;
  },
  (get, set, action: TransferUpdate) => {
    set(
      transfersStorageAtom,
      transferReducer(get(transfersStorageAtom), action),
    );
  },
);
