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
import { Transfer, useTransferHistory } from "@/hooks/useTransferHistory";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import { encodeAddress } from "@polkadot/util-crypto";
import { toEthereum, toPolkadot, history } from "@snowbridge/api";
import { SnowbridgeEnvironment } from "@snowbridge/api/dist/environment";
import { useAtomValue } from "jotai";
import { LucideLoaderCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 5;

const getEnvDetail = (transfer: Transfer, env: SnowbridgeEnvironment) => {
  const destination = env.locations.find(
    (loc) => loc.paraInfo?.paraId === transfer.info.destinationParachain,
  );
  return destination;
};

const getTokenName = (transfer: Transfer, env: SnowbridgeEnvironment) => {
  const destination = env.locations.find(
    (loc) => loc.paraInfo?.paraId === transfer.info.destinationParachain,
  );
  const tokens = destination?.erc20tokensReceivable ?? {};
  return Object.keys(tokens).find(
    (k) => tokens[k].toLowerCase() === transfer.info.tokenAddress.toLowerCase(),
  );
};

const transferTitle = (
  transfer: Transfer,
  env: SnowbridgeEnvironment,
): JSX.Element => {
  const destination = getEnvDetail(transfer, env);
  const tokenName = getTokenName(transfer, env);
  const when = new Date(transfer.info.when);
  return (
    <p>
      {transfer.info.amount +
        " " +
        (tokenName ?? "unknown") +
        " to " +
        (destination?.name ?? "unknown") +
        " on " +
        when.toLocaleString()}
    </p>
  );
};

const transferDetail = (
  transfer: Transfer,
  env: SnowbridgeEnvironment,
): JSX.Element => {
  const destination = getEnvDetail(transfer, env);
  const links: { text: string; url: string }[] = [];
  //if (destination?.type == "ethereum") {
  //  const result = transfer as history.ToEthereumTransferResult;
  //  const sourceParachain = result.success?.sourceParachain?.blockHash;
  //  if (sourceParachain) {
  //    links.push({ text: `Submitted to source ${source?.name}`, url: "" });
  //  }
  //  if (result.success?.assetHub.blockHash) {
  //    links.push({ text: "Submitted to Asset Hub", url: "" });
  //  }
  //  if (result.success?.bridgeHub.messageAcceptedAtHash) {
  //    links.push({ text: "Message Accepted on Bridge Hub", url: "" });
  //  }
  //  if (result.success?.ethereum.beefyBlockHash) {
  //    links.push({
  //      text: "Message included by light client on Ethereum",
  //      url: "",
  //    });
  //  }
  //  if (result.success?.ethereum.transferBlockHash) {
  //    links.push({ text: "Message dispatched on Ethereum", url: "" });
  //  }
  //}
  //if (destination?.type == "substrate") {
  //  const result = transfer as history.ToPolkadotTransferResult;
  //  if (result.success?.ethereum.blockHash) {
  //    links.push({ text: "Submitted to Gateway", url: "" });
  //  }
  //  if (result.success?.bridgeHub.beaconUpdate) {
  //    links.push({ text: "Included by light client on Bridge Hub", url: "" });
  //  }
  //  if (result.success?.bridgeHub.messageReceivedBlockHash) {
  //    links.push({ text: "Message dispatched on Bridge Hub", url: "" });
  //  }
  //  if (result.success?.assetHub.messageQueueProcessedAt) {
  //    links.push({ text: "Message received on Asset Hub", url: "" });
  //  }
  //  if (result.success?.destinationParachain?.messageQueueProcessedAt) {
  //    links.push({ text: `Message received on ${destination?.name}`, url: "" });
  //  }
  //}

  let beneficiary = transfer.info.beneficiaryAddress;
  if (beneficiary.length === 66) {
    beneficiary = encodeAddress(
      transfer.info.beneficiaryAddress,
      destination?.paraInfo?.ss58Format,
    );
  }
  return (
    <div className="flex-col">
      <Badge variant="outline" className="p-2 m-2">
        {history.TransferStatus[transfer.status]}
      </Badge>
      <p>Transfer to beneficiary {beneficiary}</p>
      <ul className="list-inside list-disc">
        {links.map((link, i) => (
          <li key={i}>
            {link.text}{" "}
            <span
              className="text-sm underline cursor-pointer"
              onClick={() => window.open(link.url)}
            >
              (view)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function History() {
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  const { data: transfers, mutate } = useTransferHistory();

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const params = useParams();
  const router = useRouter();

  let pages = useMemo(() => {
    const pages: Transfer[][] = [];
    if (transfers === null) return pages;
    for (let i = 0; i < transfers.length; i += ITEMS_PER_PAGE) {
      pages.push(transfers.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [transfers]);

  useEffect(() => {
    if (transfers === null) return;
    //if (transfers.length > 0) setSelectedItem(transfers[0].id);
    const hash = window.location.hash.replace("#", "");
    for (let i = 0; i < transfers.length; ++i) {
      if (transfers[i].id === hash) {
        setSelectedItem(transfers[i].id);
        setPage(Math.floor(i / ITEMS_PER_PAGE));
        break;
      }
    }
  }, [params, setSelectedItem, transfers, setPage]);

  if (transfers == null) return <Loading />;

  const start = Math.max(0, page - 2);
  const end = Math.min(pages.length - 1, page + 2);
  const renderPages = pages
    .map((page, index) => {
      return { page, index };
    })
    .slice(start, end + 1);

  return (
    <Suspense fallback={<Loading />}>
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
    </Suspense>
  );
}

const Loading = () => {
  return (
    <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
      Fetching Transfer History{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};
