"use client";

import { ErrorDialog } from "@/components/ErrorDialog";
import {
  formatTokenData,
  getEnvDetail,
  TransferTitle,
} from "@/components/history/TransferTitle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { useAssetRegistry } from "@/hooks/useAssetRegistry";
import { useTransferHistory } from "@/hooks/useTransferHistory";
import { useWindowHash } from "@/hooks/useWindowHash";
import {
  etherscanAddressLink,
  etherscanERC20TokenLink,
  etherscanTxHashLink,
  subscanAccountLink,
  subscanEventLink,
  subscanExtrinsicLink,
} from "@/lib/explorerLinks";
import { ethereumAccountsAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import {
  Transfer,
  transferHistoryCacheAtom,
  transferHistoryShowGlobal,
  transfersPendingLocalAtom,
} from "@/store/transferHistory";
import { encodeAddress } from "@polkadot/util-crypto";
import { assetsV2, historyV2 } from "@snowbridge/api";
import { AssetRegistry } from "@snowbridge/api/dist/assets_v2";
import { WalletAccount } from "@talismn/connect-wallets";
import { track } from "@vercel/analytics";
import { useAtom, useAtomValue } from "jotai";
import { LucideGlobe, LucideLoaderCircle, LucideRefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 5;
const isWalletTransaction = (
  polkadotAccounts: WalletAccount[] | null,
  ethereumAccounts: string[] | null,
  sourceAddress: string,
  beneficiaryAddress: string,
): boolean => {
  const polkadotAccount = (polkadotAccounts ?? []).find(
    (acc) =>
      beneficiaryAddress.trim().toLowerCase() ===
        acc.address.trim().toLowerCase() ||
      sourceAddress.trim().toLowerCase() == acc.address.trim().toLowerCase(),
  );
  const ethereumAccount = (ethereumAccounts ?? []).find(
    (acc) =>
      beneficiaryAddress.trim().toLowerCase() === acc.trim().toLowerCase() ||
      sourceAddress.trim().toLowerCase() == acc.trim().toLowerCase(),
  );
  return polkadotAccount !== undefined || ethereumAccount !== undefined;
};

const getExplorerLinks = (
  transfer: Transfer,
  source: assetsV2.TransferLocation,
  registry: AssetRegistry,
  destination: assetsV2.TransferLocation,
) => {
  const links: { text: string; url: string }[] = [];
  if (transfer.sourceType == "substrate") {
    const tx = transfer as historyV2.ToEthereumTransferResult;
    links.push({
      text: `Submitted to ${source.name}`,
      url: subscanExtrinsicLink(
        registry.environment,
        source.parachain!.parachainId,
        tx.submitted.extrinsic_hash,
      ),
    });
    if (tx.bridgeHubXcmDelivered) {
      links.push({
        text: "Bridge Hub received XCM from Asset Hub",
        url: subscanEventLink(
          registry.environment,
          registry.bridgeHubParaId,
          tx.bridgeHubXcmDelivered.event_index,
        ),
      });
    }
    if (tx.bridgeHubChannelDelivered) {
      links.push({
        text: "Message delivered to Snowbridge Message Queue",
        url: subscanEventLink(
          registry.environment,
          registry.bridgeHubParaId,
          tx.bridgeHubChannelDelivered.event_index,
        ),
      });
    }
    if (tx.bridgeHubMessageQueued) {
      links.push({
        text: "Message queued on Asset Hub Channel",
        url: subscanEventLink(
          registry.environment,
          registry.bridgeHubParaId,
          tx.bridgeHubMessageQueued.event_index,
        ),
      });
    }
    if (tx.bridgeHubMessageAccepted) {
      links.push({
        text: "Message accepted by Asset Hub Channel",
        url: subscanEventLink(
          registry.environment,
          registry.bridgeHubParaId,
          tx.bridgeHubMessageAccepted.event_index,
        ),
      });
    }
    if (tx.ethereumBeefyIncluded) {
      links.push({
        text: "Message included by beefy client",
        url: etherscanTxHashLink(
          registry.environment,
          registry.ethChainId,
          tx.ethereumBeefyIncluded.transactionHash,
        ),
      });
    }
    if (tx.ethereumMessageDispatched) {
      links.push({
        text: "Message dispatched on Ethereum",
        url: etherscanTxHashLink(
          registry.environment,
          registry.ethChainId,
          tx.ethereumMessageDispatched.transactionHash,
        ),
      });
    }
  }
  if (destination?.type == "substrate") {
    const tx = transfer as historyV2.ToPolkadotTransferResult;
    links.push({
      text: "Submitted to Snowbridge Gateway",
      url: etherscanTxHashLink(
        registry.environment,
        registry.ethChainId,
        tx.submitted.transactionHash,
      ),
    });

    if (tx.beaconClientIncluded) {
      links.push({
        text: "Included by light client on Bridge Hub",
        url: subscanEventLink(
          registry.environment,
          registry.bridgeHubParaId,
          tx.beaconClientIncluded.event_index,
        ),
      });
    }
    if (tx.inboundMessageReceived) {
      links.push({
        text: "Inbound message received on Asset Hub channel",
        url: subscanEventLink(
          registry.environment,
          registry.bridgeHubParaId,
          tx.inboundMessageReceived.event_index,
        ),
      });
    }
    if (tx.assetHubMessageProcessed) {
      links.push({
        text: "Message dispatched on Asset Hub",
        url: subscanEventLink(
          registry.environment,
          registry.assetHubParaId,
          tx.assetHubMessageProcessed.event_index,
        ),
      });
    }
    if (tx.destinationReceived) {
      links.push({
        text: `Message received on ${destination.name}`,
        url: subscanEventLink(
          registry.environment,
          tx.destinationReceived.paraId,
          tx.destinationReceived.event_index,
        ),
      });
    }
  }
  return links;
};

const transferDetail = (
  transfer: Transfer,
  registry: assetsV2.AssetRegistry,
): JSX.Element => {
  const { source, destination } = getEnvDetail(transfer, registry);
  const links: { text: string; url: string }[] = getExplorerLinks(
    transfer,
    source,
    registry,
    destination,
  );

  let sourceAddress = transfer.info.sourceAddress;
  if (
    transfer.sourceType === "substrate" &&
    destination.ethChain &&
    source.parachain
  ) {
    if (source.parachain.info.accountType === "AccountId32") {
      sourceAddress = encodeAddress(
        sourceAddress,
        source.parachain.info.ss58Format,
      );
    } else {
      sourceAddress = sourceAddress.substring(0, 42);
    }
  }
  let beneficiary = transfer.info.beneficiaryAddress;
  if (
    transfer.sourceType === "ethereum" &&
    source.ethChain &&
    destination.parachain
  ) {
    if (destination.parachain.info.accountType === "AccountId32") {
      beneficiary = encodeAddress(
        beneficiary,
        destination.parachain?.info.ss58Format ??
          registry.relaychain.ss58Format,
      );
    } else {
      // 20 byte address
      beneficiary = beneficiary.substring(0, 42);
    }
  }
  const tokenUrl = etherscanERC20TokenLink(
    registry.environment,
    registry.ethChainId,
    transfer.info.tokenAddress,
  );
  let sourceAccountUrl;
  let beneficiaryAccountUrl;
  if (transfer.sourceType === "ethereum") {
    sourceAccountUrl = etherscanAddressLink(
      registry.environment,
      source.ethChain!.chainId,
      transfer.info.sourceAddress,
    );
    beneficiaryAccountUrl = subscanAccountLink(
      registry.environment,
      destination.parachain!.parachainId,
      beneficiary,
    );
  } else {
    sourceAccountUrl = subscanAccountLink(
      registry.environment,
      source.parachain!.parachainId,
      transfer.info.sourceAddress,
    );
    beneficiaryAccountUrl = etherscanAddressLink(
      registry.environment,
      destination.ethChain!.chainId,
      beneficiary,
    );
  }
  const { tokenName, amount } = formatTokenData(
    transfer,
    registry.ethereumChains[registry.ethChainId].assets,
  );
  return (
    <div className="flex-col">
      <div className="p-2">
        <p>
          Source{" "}
          <span className="inline whitespace-pre font-mono">{source.name}</span>{" "}
        </p>
        <p>
          Value{" "}
          <span className="inline whitespace-pre font-mono">
            {amount} {tokenName}
          </span>{" "}
        </p>
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
            {sourceAddress}
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
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  const [transferHistoryCache, setTransferHistoryCache] = useAtom(
    transferHistoryCacheAtom,
  );
  const [transfersPendingLocal, setTransfersPendingLocal] = useAtom(
    transfersPendingLocalAtom,
  );

  const { data: assetRegistry } = useAssetRegistry();
  const {
    data: transfers,
    mutate,
    isLoading: isTransfersLoading,
    isValidating: isTransfersValidating,
    error: transfersError,
  } = useTransferHistory();

  const isRefreshing = isTransfersLoading || isTransfersValidating;
  const [transfersErrorMessage, setTransfersErrorMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (transfersError) {
      console.error(transfersError);
      track("History Page Failed", transfersError);
      setTransfersErrorMessage(
        "The history service is under heavy load, so this may take a while...",
      );
    } else {
      setTransfersErrorMessage(null);
    }
  }, [transfersError, setTransfersErrorMessage]);

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
            h.id?.toLowerCase() === transfersPendingLocal[i].id?.toLowerCase(),
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
    const allTransfers: Transfer[] = [];
    for (const pending of transfersPendingLocal) {
      if (transferHistoryCache.find((t) => t.id === pending.id)) {
        continue;
      }
      allTransfers.push(pending);
    }
    for (const transfer of transferHistoryCache) {
      transfer.isWalletTransaction = isWalletTransaction(
        polkadotAccounts,
        ethereumAccounts,
        transfer.info.sourceAddress,
        transfer.info.beneficiaryAddress,
      );
      if (!showGlobal && !transfer.isWalletTransaction) continue;

      allTransfers.push(transfer);
    }
    const pages: Transfer[][] = [];
    for (let i = 0; i < allTransfers.length; i += ITEMS_PER_PAGE) {
      pages.push(allTransfers.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [
    showGlobal,
    transferHistoryCache,
    transfersPendingLocal,
    ethereumAccounts,
    polkadotAccounts,
  ]);

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

  if (
    pages.length === 0 &&
    isTransfersLoading &&
    transferHistoryCache.length === 0
  ) {
    return <Loading />;
  }

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
            {showGlobal ? "Global transfer history." : "My transfer history."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full pb-4">
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
              className="flex gap-2 outline-button"
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
          <hr />
          <Accordion
            type="single"
            className="w-full accordian"
            value={selectedItem ?? undefined}
            onValueChange={(v) => {
              setSelectedItem(v);
              router.push("#" + v);
            }}
          >
            {pages[page]?.map((v, i) => (
              <AccordionItem
                key={v.id}
                value={v.id?.toString() ?? i.toString()}
              >
                <AccordionTrigger>
                  <TransferTitle transfer={v} />
                </AccordionTrigger>
                <AccordionContent>
                  {transferDetail(v, assetRegistry)}
                </AccordionContent>
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
      <ErrorDialog
        open={!isRefreshing && transfersErrorMessage !== null}
        title="Error Fetching History"
        description={transfersErrorMessage ?? "Unknown Error."}
        dismiss={() => setTransfersErrorMessage(null)}
      />
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
