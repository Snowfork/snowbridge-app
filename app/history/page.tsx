"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Transfer, TransferStatus, transfersAtom } from "@/store/transferHistory"
import { useAtomValue } from "jotai"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const ITEMS_PER_PAGE = 5

const transferTitle = (v: Transfer): JSX.Element => {
  const when = new Date(v.when)
  return <p>{((v.form.amount)) + " " + v.tokenName + " from " + v.form.source + " to " + v.form.destination + " on " + when.toLocaleString()}</p>
}

const transferDetail = (v: Transfer): JSX.Element => {
  return <p>{TransferStatus[v.status] + " " + v.id}</p>
}

export default function History() {
  const transferHistory = useAtomValue(transfersAtom)
  const transfers = transferHistory.pending.concat(transferHistory.complete)
  useEffect(()=> console.log('Transfer History Updated'), [transferHistory])
  const [selectedItem, setSelectedItem] = useState<string|null>(null)
  const [page, setPage] = useState(0)
  const params = useParams();
  const router = useRouter();

  let pages = useMemo(() => {
    const pages: Transfer[][] = []
    for (let i = 0; i < transfers.length; i += ITEMS_PER_PAGE) {
      pages.push(transfers.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages
  }, [transfers])

  useEffect(() => {
    if(transfers.length > 0) setSelectedItem(transfers[0].id)
    const hash = window.location.hash.replace('#', '');
    for(let i = 0; i < transfers.length; ++i) {
      if (transfers[i].id === hash) {
        setSelectedItem(transfers[i].id)
        setPage(Math.floor(i/ITEMS_PER_PAGE))
        break;
      }
    }
  }, [params, setSelectedItem, transfers, setPage]);


  const start = Math.max(0, page - 2)
  const end = Math.min(pages.length - 1, page + 2)
  const renderPages = pages.map((page, index) => { return { page, index } }).slice(start, end + 1)

  return (<>
    <Card className="w-full md:w-2/3 min-h-[460px]">
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Transfers history.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" className="w-full" value={selectedItem ?? undefined} onValueChange={(v)=> {router.push('#'+ v)}}>
          {pages[page]?.map(v => (
            <AccordionItem key={v.id} value={v.id.toString()}>
              <AccordionTrigger>{transferTitle(v)}</AccordionTrigger>
              <AccordionContent>
                {transferDetail(v)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <br></br>
        <div className={"justify-self-center align-middle " + (transfers.length > 0 ? "hidden" : "")}>
          <p className="text-muted-foreground text-center">No history.</p>
        </div>
        <Pagination className={transfers.length == 0 ? "hidden" : ""}>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => router.push('#'+pages[Math.max(0, page - 1)][0].id)} />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink onClick={() => router.push('#'+pages[0][0].id)} >First</PaginationLink>
            </PaginationItem>
            {renderPages.map(({ index }) => (
              <PaginationItem key={index + 1}>
                <PaginationLink isActive={page == index} onClick={() => router.push('#'+pages[index][0].id)}>{index + 1}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationLink onClick={() => router.push('#'+pages[pages.length-1][0].id)} >Last</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext onClick={() => router.push('#'+pages[Math.min(pages.length - 1, page + 1)][0].id)} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardContent>
    </Card>
  </>)
}