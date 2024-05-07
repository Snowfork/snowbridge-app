import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type Transfer = { id: number, title: string, data: any }

export type TransferAction = "add" | "udpate" | "remove"
export type TransferUpdate = { action: TransferAction, transfer: Transfer }

const transfersStorageAtom = atomWithStorage<Transfer[]>("transfer_history", [])
export const transfersAtom = atom(
  (get) => get(transfersStorageAtom),
  (get, set, action: TransferUpdate) => {
    set(transfersStorageAtom, transferReducer(get(transfersStorageAtom), action))
  }
)

export const transferReducer = (current: Transfer[], update: TransferUpdate) => {
  return current
}