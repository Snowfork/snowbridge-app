"use client";

import { ErrorDialog } from "@/components/ErrorDialog";
import {
  formatTokenData,
  getChainIdentifiers,
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
import { AssetRegistry } from "@snowbridge/base-types";
import { track } from "@vercel/analytics";
import { useAtom, useAtomValue } from "jotai";
import { LucideGlobe, LucideLoaderCircle, LucideRefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import { RegistryContext } from "../providers";
import { walletTxChecker } from "@/utils/addresses";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const ITEMS_PER_PAGE = 5;

/**
 * Check if two transfers are the same by comparing their unique identifiers.
 * For V2 transfers, the backend returns database-generated IDs, while locally
 * created transfers use messageId/txHash as ID. This function matches by
 * transaction hash or extrinsic hash to handle this case.
 */
const isSameTransfer = (t1: Transfer, t2: Transfer): boolean => {
  // Match by ID if both have non-empty IDs
  if (t1.id === t2.id && t1.id.length > 0) return true;

  // For ToPolkadotTransferResult (E->P), match by transaction hash
  if (t1.sourceType === "ethereum" && t2.sourceType === "ethereum") {
    const t1Casted = t1 as historyV2.ToPolkadotTransferResult;
    const t2Casted = t2 as historyV2.ToPolkadotTransferResult;
    if (
      t1Casted.submitted.transactionHash ===
        t2Casted.submitted.transactionHash &&
      t1Casted.submitted.transactionHash.length > 0
    ) {
      return true;
    }
  }

  // For ToEthereumTransferResult (P->E), match by extrinsic hash
  if (t1.sourceType === "substrate" && t2.sourceType === "substrate") {
    const t1Casted = t1 as historyV2.ToEthereumTransferResult;
    const t2Casted = t2 as historyV2.ToEthereumTransferResult;
    if (
      t1Casted.submitted.extrinsic_hash === t2Casted.submitted.extrinsic_hash &&
      t1Casted.submitted.extrinsic_hash.length > 0
    ) {
      return true;
    }
  }

  return false;
};

const getExplorerLinks = (
  transfer: Transfer,
  source: assetsV2.TransferLocation,
  registry: AssetRegistry,
  destination: assetsV2.TransferLocation,
) => {
  const links: { text: string; url: string }[] = [];
  if (transfer.sourceType == "kusama") {
    const tx = transfer as historyV2.ToPolkadotTransferResult;
    if (tx.destinationReceived) {
      let sourceParaId: string = source.parachain!.parachainId.toString();
      if (transfer.info.sourceNetwork == "kusama") {
        sourceParaId = "kusama_" + sourceParaId;
      }
      let destinationParaId: string = tx.destinationReceived.paraId.toString();
      if (transfer.info.sourceNetwork == "polkadot") {
        destinationParaId = "kusama_" + destinationParaId;
      }
      links.push({
        text: `Submitted to ${source.name}`,
        url: subscanExtrinsicLink(
          registry.environment,
          sourceParaId,
          tx.submitted.transactionHash,
        ),
      });
      links.push({
        text: `Message received on ${destination.name}`,
        url: subscanEventLink(
          registry.environment,
          destinationParaId,
          tx.destinationReceived.event_index,
        ),
      });
    }
    return links;
  } else if (transfer.sourceType == "substrate") {
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
  registry: AssetRegistry,
  router: AppRouterInstance,
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
  } else if (transfer.sourceType === "kusama") {
    let sourceParachain = source.parachain!.parachainId.toString();
    let destParachain = destination.parachain!.parachainId.toString();
    if (transfer.info.sourceNetwork == "kusama") {
      sourceParachain = "kusama_" + sourceParachain;
    }
    if (transfer.info.destinationNetwork == "kusama") {
      destParachain = "kusama_" + sourceParachain;
    }
    sourceAccountUrl = subscanAccountLink(
      registry.environment,
      sourceParachain,
      transfer.info.sourceAddress,
    );
    beneficiaryAccountUrl = subscanAccountLink(
      registry.environment,
      destParachain,
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
        <p hidden={transfer.info.tokenAddress === assetsV2.ETHER_TOKEN_ADDRESS}>
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

  const assetRegistry = useContext(RegistryContext)!;
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
    const oldTransferCutoff = new Date().getTime() - 4 * 60 * 60 * 1000; // 4 hours
    for (let i = 0; i < transfersPendingLocal.length; ++i) {
      if (
        transferHistoryCache.find((h) =>
          isSameTransfer(h, transfersPendingLocal[i]),
        ) ||
        new Date(transfersPendingLocal[i].info.when).getTime() <
          oldTransferCutoff
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
    const isWalletTransaction = walletTxChecker([
      ...(polkadotAccounts ?? []).map((acc) => acc.address),
      ...ethereumAccounts,
    ]);
    const allTransfers: Transfer[] = [];
    for (const pending of transfersPendingLocal) {
      // Check if this pending transfer already exists in the cache
      // Match by ID, transaction hash, or message ID to handle V2 transfers
      const isDuplicate = transferHistoryCache.find((t) =>
        isSameTransfer(t, pending),
      );

      if (isDuplicate) {
        continue;
      }
      allTransfers.push(pending);
    }
    for (const transfer of transferHistoryCache) {
      const id = getChainIdentifiers(transfer, assetRegistry);
      if (
        !id ||
        (id.sourceType === "substrate" &&
          !(id.sourceId in assetRegistry.parachains)) ||
        (id.destinationType === "substrate" &&
          !(id.destinationId in assetRegistry.parachains))
      )
        continue;

      transfer.isWalletTransaction = isWalletTransaction(
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
    transfersPendingLocal,
    transferHistoryCache,
    assetRegistry,
    polkadotAccounts,
    ethereumAccounts,
    showGlobal,
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
                  {transferDetail(v, assetRegistry, router)}
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
