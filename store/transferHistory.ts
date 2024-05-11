import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type FormData = {
  source: string
  sourceAccount: string
  destination: string
  token: string
  amount: string
  beneficiary: string
}

export enum TransferStatus {
  InProgress,
  Failed,
  Complete
}
export type Transfer = { id: string, status: TransferStatus, when: string, tokenName: string, form: FormData, data: any }

export type TransferAction = "add" | "udpate" | "remove"
export type TransferUpdate = { action: TransferAction, transfer: Transfer }

const TRANSFER_HISTORY_VERSION = 1

export type TransferHistory = {
  version: number
  pending: Transfer[]
  complete: Transfer[]
}

const stripDataBigInts = (data: unknown) => JSON.parse(JSON.stringify(data, (_, v) => {
  switch (typeof v) {
    case "bigint":
      return v.toString()
  }
  return v
}))

const transfersStorageAtom = atomWithStorage<TransferHistory>("transfer_history", { version: TRANSFER_HISTORY_VERSION,  pending:[], complete:[] })
const transferReducer = (current: TransferHistory, update: TransferUpdate) => {
  let updated = current;
  if(current.version !== TRANSFER_HISTORY_VERSION) {
    updated = { version: TRANSFER_HISTORY_VERSION, pending: [], complete: []}
  }

  switch (update.action) {
    case "add": {
      update.transfer.data = stripDataBigInts(update.transfer.data)
      updated.pending.push(update.transfer)
      break;
    }
    case "udpate": {
      updated.pending = current.pending.filter(t => t.id !== update.transfer.id)
      update.transfer.data = stripDataBigInts(update.transfer.data)
      updated.pending.push(update.transfer)
      break;
    }
    case "remove": {
      updated.pending = current.pending.filter(t => t.id !== update.transfer.id)
      updated.complete = current.complete.filter(t => t.id !== update.transfer.id)
      break;
    }
  }
  updated.pending.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  updated.complete.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  return updated
}


export const transfersAtom = atom(
  (get) => get(transfersStorageAtom),
  (get, set, action: TransferUpdate) => {
    set(transfersStorageAtom, transferReducer(get(transfersStorageAtom), action))
  }
)

