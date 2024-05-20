"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import {
  Transfer,
  TransferStatus,
  transfersAtom,
} from "@/store/transferHistory";
import { toEthereum, toPolkadot } from "@snowbridge/api";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { useAtomValue } from "jotai";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 5;

const getEnvDetail = (transfer: Transfer, env: SnowbridgeEnvironment) => {
  const destination = env.locations.find(
    (loc) => loc.id == transfer.form.destination,
  );
  const source = env.locations.find((loc) => loc.id == transfer.form.source);

  return { destination, source };
};

const transferTitle = (
  transfer: Transfer,
  env: SnowbridgeEnvironment,
): JSX.Element => {
  const { destination, source } = getEnvDetail(transfer, env);
  const when = new Date(transfer.when);
  return (
    <p>
      {transfer.form.amount +
        " " +
        transfer.tokenName +
        " from " +
        source?.name +
        " to " +
        destination?.name +
        " on " +
        when.toLocaleString()}
    </p>
  );
};

const transferDetail = (
  transfer: Transfer,
  env: SnowbridgeEnvironment,
): JSX.Element => {
  const { source, destination } = getEnvDetail(transfer, env);
  const links: { text: string; url: string }[] = [];
  if (destination?.type == "ethereum") {
    const result = transfer.data as toEthereum.SendResult;
    const sourceParachain = result.success?.sourceParachain?.blockHash;
    if (sourceParachain) {
      links.push({ text: `Submitted to source ${source?.name}`, url: "" });
    }
    if (result.success?.assetHub.blockHash) {
      links.push({ text: "Submitted to Asset Hub", url: "" });
    }
    if (result.success?.bridgeHub.messageAcceptedAtHash) {
      links.push({ text: "Message Accepted on Bridge Hub", url: "" });
    }
    if (result.success?.ethereum.beefyBlockHash) {
      links.push({
        text: "Message included by light client on Ethereum",
        url: "",
      });
    }
    if (result.success?.ethereum.transferBlockHash) {
      links.push({ text: "Message dispatched on Ethereum", url: "" });
    }
  }
  if (destination?.type == "substrate") {
    const result = transfer.data as toPolkadot.SendResult;
    if (result.success?.ethereum.blockHash) {
      links.push({ text: "Submitted to Gateway", url: "" });
    }
    if (result.success?.bridgeHub.beaconUpdate) {
      links.push({ text: "Included by light client on Bridge Hub", url: "" });
    }
    if (result.success?.bridgeHub.messageReceivedBlockHash) {
      links.push({ text: "Message dispatched on Bridge Hub", url: "" });
    }
    if (result.success?.assetHub.messageQueueProcessedAt) {
      links.push({ text: "Message received on Asset Hub", url: "" });
    }
    if (result.success?.destinationParachain?.messageQueueProcessedAt) {
      links.push({ text: `Message received on ${destination?.name}`, url: "" });
    }
  }
  return (
    <div className="flex-col">
      <Badge variant="outline" className="p-2 m-2">
        {TransferStatus[transfer.status]}
      </Badge>
      <ul className="list-inside list-disc">
        {links.map((link, i) => (
          <li key={i}>
            {link.text} <a href={link.url}>(view)</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function History() {
  const transferHistory = useAtomValue(transfersAtom);
  const env = useAtomValue(snowbridgeEnvironmentAtom);

  const transfers = transferHistory.pending.concat(transferHistory.complete);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const params = useParams();
  const router = useRouter();

  let pages = useMemo(() => {
    const pages: Transfer[][] = [];
    for (let i = 0; i < transfers.length; i += ITEMS_PER_PAGE) {
      pages.push(transfers.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [transfers]);

  useEffect(() => {
    if (transfers.length > 0) setSelectedItem(transfers[0].id);
    const hash = window.location.hash.replace("#", "");
    for (let i = 0; i < transfers.length; ++i) {
      if (transfers[i].id === hash) {
        setSelectedItem(transfers[i].id);
        setPage(Math.floor(i / ITEMS_PER_PAGE));
        break;
      }
    }
  }, [params, setSelectedItem, transfers, setPage]);

  const start = Math.max(0, page - 2);
  const end = Math.min(pages.length - 1, page + 2);
  const renderPages = pages
    .map((page, index) => {
      return { page, index };
    })
    .slice(start, end + 1);

  return (
    <>
      <Card className="w-full md:w-2/3 min-h-[460px]">
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Transfers history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            type="single"
            className="w-full"
            value={selectedItem ?? undefined}
            onValueChange={(v) => {
              router.push("#" + v);
            }}
          >
            {pages[page]?.map((v) => (
              <AccordionItem key={v.id} value={v.id.toString()}>
                <AccordionTrigger>{transferTitle(v, env)}</AccordionTrigger>
                <AccordionContent>{transferDetail(v, env)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <br></br>
          <div
            className={
              "justify-self-center align-middle " +
              (transfers.length > 0 ? "hidden" : "")
            }
          >
            <p className="text-muted-foreground text-center">No history.</p>
          </div>
          <Pagination className={transfers.length == 0 ? "hidden" : ""}>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    router.push("#" + pages[Math.max(0, page - 1)][0].id)
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  onClick={() => router.push("#" + pages[0][0].id)}
                >
                  First
                </PaginationLink>
              </PaginationItem>
              {renderPages.map(({ index }) => (
                <PaginationItem key={index + 1}>
                  <PaginationLink
                    isActive={page == index}
                    onClick={() => router.push("#" + pages[index][0].id)}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationLink
                  onClick={() =>
                    router.push("#" + pages[pages.length - 1][0].id)
                  }
                >
                  Last
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    router.push(
                      "#" + pages[Math.min(pages.length - 1, page + 1)][0].id,
                    )
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
    </>
  );
}
