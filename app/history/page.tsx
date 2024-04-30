"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { atom, useAtomValue } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { useMemo, useState } from "react"

const pageItems = 5
type Transfer = { Id: number, Title: string }

type TransferAction = "add" | "udpate" | "remove"
type TransferUpdate = { action: TransferAction, transfer: Transfer }
const transferReducer = (current: Transfer[], update: TransferUpdate) => {
  return current
}

const transfersStorageAtom = atomWithStorage<Transfer[]>("transfer_history", [])
const transfersAtom = atom(
  (get) => get(transfersStorageAtom),
  (get, set, action: TransferUpdate) => {
    set(transfersStorageAtom, transferReducer(get(transfersStorageAtom), action))
  }
)

export default function History() {
  let transfers = useAtomValue(transfersAtom)
  let pages = useMemo(() => {
    const pages: Transfer[][] = []
    for (let i = 0; i < transfers.length; i += pageItems) {
      pages.push(transfers.slice(i, i + pageItems));
    }
    return pages
  }, [transfers])

  const [page, setPage] = useState(0)
  const start = Math.max(0, page - 2)
  const end = Math.min(pages.length - 1, page + 2)
  const renderPages = pages.map((page, index) => { return { page, index } }).slice(start, end + 1)

  return (<>
    <Card className="w-full md:w-2/3">
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Transfers history.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {pages[page]?.map(v => (
            <AccordionItem key={v.Id} value={v.Id.toString()}>
              <AccordionTrigger>{v.Title}</AccordionTrigger>
              <AccordionContent>
                Yes. It adheres to the WAI-ARIA design pattern.
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <br></br>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => setPage(Math.max(0, page - 1))} />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink onClick={() => setPage(0)} >First</PaginationLink>
            </PaginationItem>
            {renderPages.map(({ index }) => (
              <PaginationItem key={index + 1}>
                <PaginationLink isActive={page == index} onClick={() => setPage(index)}>{index + 1}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationLink onClick={() => setPage(pages.length - 1)} >Last</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext onClick={() => setPage(Math.min(pages.length - 1, page + 1))} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardContent>
    </Card>
  </>)
}