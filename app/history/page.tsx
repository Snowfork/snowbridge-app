"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Transfer, transfersAtom } from "@/store/transferHistory"
import { useAtomValue } from "jotai"
import { useMemo, useState } from "react"

const ITEMS_PER_PAGE = 5

export default function History() {
  let transfers = useAtomValue(transfersAtom)
  let pages = useMemo(() => {
    const pages: Transfer[][] = []
    for (let i = 0; i < transfers.length; i += ITEMS_PER_PAGE) {
      pages.push(transfers.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages
  }, [transfers])

  const [page, setPage] = useState(0)
  const start = Math.max(0, page - 2)
  const end = Math.min(pages.length - 1, page + 2)
  const renderPages = pages.map((page, index) => { return { page, index } }).slice(start, end + 1)

  return (<>
    <Card className="w-full md:w-2/3 h-[460px]">
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
        <div className={"justify-self-center align-middle" + (transfers.length == 0 ? "": "hidden")}>
        <p className="text-muted-foreground text-center">No history.</p>
        </div>
        <Pagination className={transfers.length == 0 ? "hidden": ""}>
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