import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type FormData = {
  source: string;
  destination: string;
  token: string;
  amount: string;
  beneficiary: string;
}

export enum TransferStatus {
  InProgress,
  Failed,
  Complete
}
export type Transfer = { id: string, status: TransferStatus, when: string, tokenName: string, form: FormData, data: any }

export type TransferAction = "add" | "udpate" | "remove"
export type TransferUpdate = { action: TransferAction, transfer: Transfer }

const stripDataBigInts = (data: unknown) => JSON.parse(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v))

const transfersStorageAtom = atomWithStorage<Transfer[]>("transfer_history", [])
const transferReducer = (current: Transfer[], update: TransferUpdate) => {
  let updated = current;

  switch (update.action) {
    case "add": {
      update.transfer.data = stripDataBigInts(update.transfer.data)
      updated.push(update.transfer)
      break;
    }
    case "udpate": {
      updated = current.filter(t => t.id !== update.transfer.id)
      update.transfer.data = stripDataBigInts(update.transfer.data)
      updated.push(update.transfer)
      break;
    }
    case "remove": {
      updated = current.filter(t => t.id !== update.transfer.id)
      break;
    }
  }
  return updated.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
}


export const transfersAtom = atom(
  (get) => get(transfersStorageAtom),
  (get, set, action: TransferUpdate) => {
    set(transfersStorageAtom, transferReducer(get(transfersStorageAtom), action))
  }
)

