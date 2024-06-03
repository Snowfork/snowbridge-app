"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Toggle } from "@/components/ui/toggle";
import { useTransferHistory } from "@/hooks/useTransferHistory";
import { useWindowHash } from "@/hooks/useWindowHash";
import { cn, formatBalance } from "@/lib/utils";
import {
  assetErc20MetaDataAtom,
  snowbridgeEnvironmentAtom,
} from "@/store/snowbridge";
import {
  Transfer,
  transferHistoryCacheAtom,
  transferHistoryShowGlobal,
  transfersPendingLocalAtom,
} from "@/store/transferHistory";
import { encodeAddress } from "@polkadot/util-crypto";
import { assets, environment, history } from "@snowbridge/api";
import { parseUnits } from "ethers";
import { useAtom, useAtomValue } from "jotai";
import { LucideGlobe, LucideLoaderCircle, LucideRefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 5;
const EXPLORERS: { [env: string]: { [explorer: string]: string } } = {
  rococo_sepolia: {
    etherscan: "https://sepolia.etherscan.io/",
    subscan_ah: "https://assethub-rococo.subscan.io/",
    subscan_bh: "https://bridgehub-rococo.subscan.io/",
  },
  polkadot_mainnet: {
    etherscan: "https://etherscan.io/",
    subscan_ah: "https://assethub-polkadot.subscan.io/",
    subscan_bh: "https://bridgehub-polkadot.subscan.io/",
  },
};

const getEnvDetail = (
  transfer: Transfer,
  env: environment.SnowbridgeEnvironment,
) => {
  if (transfer.info.destinationParachain === undefined) {
    return env.locations.find((loc) => loc.id === "ethereum");
  }

  let destination = env.locations.find(
    (loc) => loc.paraInfo?.paraId === transfer.info.destinationParachain,
  );

  if (
    destination === undefined &&
    transfer.info.destinationParachain !== undefined
  ) {
    destination = env.locations.find((loc) => loc.id === "assethub");
  }
  return destination;
};

const getTokenName = (
  transfer: Transfer,
  destination?: environment.TransferLocation,
) => {
  const tokens = destination?.erc20tokensReceivable ?? {};
  return Object.keys(tokens).find(
    (k) => tokens[k].toLowerCase() === transfer.info.tokenAddress.toLowerCase(),
  );
};

const etherscanEventLink = (baseUrl: string, txHash: string): string => {
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}tx/${txHash}#eventlog`;
};

const subscanEventLink = (baseUrl: string, eventIndex: string): string => {
  const block = eventIndex.split("-")[0];
  const slash = baseUrl.endsWith("/") ? "" : "/";
  return `${baseUrl}${slash}block/${block}?event=${eventIndex}&tab=event`;
};

const getExplorerLinks = (
  env: environment.SnowbridgeEnvironment,
  transfer: Transfer,
  destination?: environment.TransferLocation,
) => {
  const urls = EXPLORERS[env.name];
  const links: { text: string; url: string }[] = [];
  if (destination?.type == "ethereum") {
    const ethTransfer = transfer as history.ToEthereumTransferResult;
    links.push({
      text: "Submitted to Asset Hub",
      url: `${urls["subscan_ah"]}extrinsic/${ethTransfer.submitted.extrinsic_index}`,
    });

    if (ethTransfer.bridgeHubXcmDelivered) {
      links.push({
        text: "Bridge Hub received XCM from Asset Hub",
        url: subscanEventLink(
          urls["subscan_bh"],
          ethTransfer.bridgeHubXcmDelivered.event_index,
        ),
      });
    }
    if (ethTransfer.bridgeHubChannelDelivered) {
      links.push({
        text: "Message delivered to Snowbrigde Message Queue",
        url: subscanEventLink(
          urls["subscan_bh"],
          ethTransfer.bridgeHubChannelDelivered.event_index,
        ),
      });
    }
    if (ethTransfer.bridgeHubMessageQueued) {
      links.push({
        text: "Message queued on Asset Hub Channel",
        url: subscanEventLink(
          urls["subscan_bh"],
          ethTransfer.bridgeHubMessageQueued.event_index,
        ),
      });
    }
    if (ethTransfer.bridgeHubMessageAccepted) {
      links.push({
        text: "Message accepted by Asset Hub Channel",
        url: subscanEventLink(
          urls["subscan_bh"],
          ethTransfer.bridgeHubMessageAccepted.event_index,
        ),
      });
    }
    if (ethTransfer.ethereumBeefyIncluded) {
      links.push({
        text: "Message included by beefy client",
        url: etherscanEventLink(
          urls["etherscan"],
          ethTransfer.ethereumBeefyIncluded.transactionHash,
        ),
      });
    }
    if (ethTransfer.ethereumMessageDispatched) {
      links.push({
        text: "Message dispatched on Ethereum",
        url: etherscanEventLink(
          urls["etherscan"],
          ethTransfer.ethereumMessageDispatched.transactionHash,
        ),
      });
    }
  }
  if (destination?.type == "substrate") {
    const dotTransfer = transfer as history.ToPolkadotTransferResult;
    links.push({
      text: "Submitted to Snowbridge Gateway",
      url: etherscanEventLink(
        urls["etherscan"],
        dotTransfer.submitted.transactionHash,
      ),
    });

    if (dotTransfer.beaconClientIncluded) {
      links.push({
        text: "Included by light client on Bridge Hub",
        url: subscanEventLink(
          urls["subscan_bh"],
          dotTransfer.beaconClientIncluded.event_index,
        ),
      });
    }
    if (dotTransfer.inboundMessageReceived) {
      links.push({
        text: "Inbound message received on Asset Hub channel",
        url: subscanEventLink(
          urls["subscan_bh"],
          dotTransfer.inboundMessageReceived.event_index,
        ),
      });
    }
    if (dotTransfer.assetHubMessageProcessed) {
      links.push({
        text: "Message dispatched on Asset Hub",
        url: subscanEventLink(
          urls["subscan_ah"],
          dotTransfer.assetHubMessageProcessed.event_index,
        ),
      });
    }
  }
  return links;
};

const transferTitle = (
  transfer: Transfer,
  env: environment.SnowbridgeEnvironment,
  assetErc20MetaData: { [token: string]: assets.ERC20Metadata },
): JSX.Element => {
  const destination = getEnvDetail(transfer, env);
  const when = new Date(transfer.info.when);
  const tokenAddress = transfer.info.tokenAddress.toLowerCase();

  let amount = transfer.info.amount;
  let tokenName = getTokenName(transfer, destination);
  const metaData =
    tokenAddress in assetErc20MetaData
      ? assetErc20MetaData[tokenAddress]
      : null;
  if (metaData !== null) {
    amount = formatBalance(
      parseUnits(transfer.info.amount, 0),
      Number(metaData.decimals),
    );
    tokenName = metaData.symbol;
  }
  const badgeStyle =
    history.TransferStatus.Failed == transfer.status
      ? " bg-destructive"
      : history.TransferStatus.Pending == transfer.status
        ? ""
        : "bg-secondary";

  return (
    <div className="grid grid-cols-5 justify-stretch w-full">
      <Badge
        variant="outline"
        className={cn("px-4 mr-2 col-span-1 place-self-center", badgeStyle)}
      >
        {history.TransferStatus[transfer.status]}
      </Badge>
      <p className="col-span-4 place-self-start text-left">
        {amount +
          " " +
          (tokenName ?? "unknown") +
          " to " +
          (destination?.name ?? "unknown") +
          " on " +
          when.toLocaleString()}
      </p>
    </div>
  );
};

const transferDetail = (
  transfer: Transfer,
  env: environment.SnowbridgeEnvironment,
): JSX.Element => {
  const destination = getEnvDetail(transfer, env);
  const urls = EXPLORERS[env.name];
  const links: { text: string; url: string }[] = getExplorerLinks(
    env,
    transfer,
    destination,
  );

  let source = transfer.info.sourceAddress;
  if (source.length === 66) {
    source = encodeAddress(source, destination?.paraInfo?.ss58Format);
  }
  let beneficiary = transfer.info.beneficiaryAddress;
  if (beneficiary.length === 66) {
    beneficiary = encodeAddress(beneficiary, destination?.paraInfo?.ss58Format);
  }
  const tokenUrl = `${urls["etherscan"]}token/${transfer.info.tokenAddress}`;
  let sourceAccountUrl;
  let beneficiaryAccountUrl;
  if (destination?.paraInfo) {
    sourceAccountUrl = `${urls["etherscan"]}address/${transfer.info.sourceAddress}`;
    beneficiaryAccountUrl = `${urls["subscan_ah"]}/account/${beneficiary}`;
  } else {
    sourceAccountUrl = `${urls["subscan_ah"]}/account/${transfer.info.sourceAddress}`;
    beneficiaryAccountUrl = `${urls["etherscan"]}address/${beneficiary}`;
  }

  return (
    <div className="flex-col">
      <div className="p-2">
        <p>
          Token Address{" "}
          <span className="inline whitespace-pre font-mono">
            {transfer.info.tokenAddress}
          </span>{" "}
          <span
            className="text-sm underline cursor-pointer"
            onClick={() => window.open(tokenUrl)}
            onAuxClick={() => window.open(tokenUrl)}
          >
            (view)
          </span>
        </p>
        <p>
          From Account{" "}
          <span className="inline whitespace-pre font-mono">
            {transfer.info.sourceAddress}
          </span>{" "}
          <span
            className="text-sm underline cursor-pointer"
            onClick={() => window.open(sourceAccountUrl)}
            onAuxClick={() => window.open(sourceAccountUrl)}
          >
            (view)
          </span>
        </p>
        <p>
          To Beneficiary{" "}
          <span className="inline whitespace-pre font-mono">{beneficiary}</span>
        </p>{" "}
        <span
          className="text-sm underline cursor-pointer"
          onClick={() => window.open(beneficiaryAccountUrl)}
          onAuxClick={() => window.open(beneficiaryAccountUrl)}
        >
          (view)
        </span>
      </div>

      <ul className="p-2 list-inside list-disc">
        {links.map((link, i) => (
          <li key={i}>
            {link.text}{" "}
            <span
              className="text-sm underline cursor-pointer"
              onClick={() => window.open(link.url)}
              onAuxClick={() => window.open(link.url)}
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
  const assetErc20MetaData = useAtomValue(assetErc20MetaDataAtom) ?? {};

  const [transferHistoryCache, setTransferHistoryCache] = useAtom(
    transferHistoryCacheAtom,
  );
  const [transfersPendingLocal, setTransfersPendingLocal] = useAtom(
    transfersPendingLocalAtom,
  );
  const {
    data: transfers,
    mutate,
    isLoading: isTransfersLoading,
    isValidating: isTransfersValidating,
    error: transfersError,
  } = useTransferHistory();
  const isRefreshing = isTransfersLoading || isTransfersValidating;

  const [showGlobal, setShowGlobal] = useAtom(transferHistoryShowGlobal);

  const hashItem = useWindowHash();

  useEffect(() => {
    if (transfers === null) return;
    setTransferHistoryCache(transfers);
  }, [transfers, setTransferHistoryCache]);

  useEffect(() => {
    for (let i = 0; i < transfersPendingLocal.length; ++i) {
      if (
        transferHistoryCache.find(
          (h) =>
            h.id.toLowerCase() === transfersPendingLocal[i].id.toLowerCase(),
        )
      ) {
        setTransfersPendingLocal({
          kind: "remove",
          transfer: transfersPendingLocal[i],
        });
      }
    }
    // Do not add `transfersPendingLocal`. Causes infinite re-rendering loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferHistoryCache, setTransfersPendingLocal]);

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const router = useRouter();

  const pages = useMemo(() => {
    let allTransfers = [...transferHistoryCache];
    for (const pending of transfersPendingLocal.toReversed()) {
      if (allTransfers.find((t) => t.id === pending.id)) {
        continue;
      }
      allTransfers.unshift(pending);
    }
    if (!showGlobal) {
      allTransfers = allTransfers.filter((t) => true);
    }
    if (allTransfers.length == 0) {
      return null;
    }
    const pages: Transfer[][] = [];
    for (let i = 0; i < allTransfers.length; i += ITEMS_PER_PAGE) {
      pages.push(allTransfers.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [showGlobal, transferHistoryCache, transfersPendingLocal]);

  useMemo(() => {
    if (pages === null || pages.length == 0) {
      setPage(0);
      setSelectedItem(null);
      return;
    }
    if (hashItem === null || hashItem.trim().length === 0) {
      setPage(0);
      setSelectedItem(null);
    }

    for (let p = 0; p < pages.length; p++) {
      for (let t = 0; t < pages[p].length; t++) {
        if (pages[p][t].id === hashItem) {
          setPage(p);
          setSelectedItem(pages[p][t].id);
          return;
        }
      }
    }
    setPage(0);
    setSelectedItem(null);
    return;
  }, [pages, setSelectedItem, setPage, hashItem]);

  if (pages == null) return <Loading />;

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
          <CardDescription>
            {showGlobal
              ? "Global transfer history for the past two weeks."
              : "My tranfer history for the past two weeks."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full">
            <Button
              variant="link"
              size="sm"
              disabled={isRefreshing}
              onClick={() => mutate()}
            >
              <div className="flex gap-2 place-items-center">
                <LucideRefreshCw />
                <p>{isRefreshing ? "Refreshing" : "Refresh"}</p>
              </div>
            </Button>
            <Toggle
              className="flex gap-2"
              defaultPressed={false}
              pressed={showGlobal}
              onPressedChange={(p) => setShowGlobal(p)}
              size="sm"
            >
              <div className="flex gap-2 place-items-center">
                <LucideGlobe />
                <p>Show global Transfers</p>
              </div>
            </Toggle>
          </div>
          <Accordion
            type="single"
            className="w-full"
            value={selectedItem ?? undefined}
            onValueChange={(v) => {
              setSelectedItem(v);
              router.push("#" + v);
            }}
          >
            {pages[page]?.map((v) => (
              <AccordionItem key={v.id} value={v.id.toString()}>
                <AccordionTrigger>
                  {transferTitle(v, env, assetErc20MetaData)}
                </AccordionTrigger>
                <AccordionContent>{transferDetail(v, env)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <br></br>
          <div
            className={
              "justify-self-center align-middle " +
              (pages.length > 0 ? "hidden" : "")
            }
          >
            <p className="text-muted-foreground text-center">No history.</p>
          </div>
          <Pagination className={pages.length == 0 ? "hidden" : ""}>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    const p = Math.max(0, page - 1);
                    setPage(p);
                    setSelectedItem(null);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  onClick={() => {
                    setPage(0);
                    setSelectedItem(null);
                  }}
                >
                  First
                </PaginationLink>
              </PaginationItem>
              {renderPages.map(({ index }) => (
                <PaginationItem key={index + 1}>
                  <PaginationLink
                    isActive={page == index}
                    onClick={() => {
                      setPage(index);
                      setSelectedItem(null);
                    }}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationLink
                  onClick={() => {
                    const p = pages.length - 1;
                    setPage(p);
                    setSelectedItem(null);
                  }}
                >
                  Last
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    const p = Math.min(pages.length - 1, page + 1);
                    setPage(p);
                    setSelectedItem(null);
                  }}
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
