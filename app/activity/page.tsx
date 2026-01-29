"use client";

import { ErrorDialog } from "@/components/ErrorDialog";
import { SnowflakeLoader } from "@/components/SnowflakeLoader";
import {
  formatTokenData,
  getChainIdentifiers,
  getEnvDetail,
  TransferTitle,
} from "@/components/activity/TransferTitle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Toggle } from "@/components/ui/toggle";

import { useTransferActivity } from "@/hooks/useTransferActivity";
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
  transferActivityCacheAtom,
  transferActivityShowGlobal,
  transfersPendingLocalAtom,
} from "@/store/transferActivity";
import type { Transfer } from "@/store/transferActivity";
import { encodeAddress } from "@polkadot/util-crypto";
import { assetsV2, historyV2 } from "@snowbridge/api";
import {
  AssetRegistry,
  EthereumLocation,
  TransferLocation,
} from "@snowbridge/base-types";
import { track } from "@vercel/analytics";
import { useAtom, useAtomValue } from "jotai";
import { LucideGlobe, LucideRefreshCw, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import { BridgeInfoContext } from "../providers";
import { walletTxChecker } from "@/utils/addresses";
import { formatShortDate, trimAccount } from "@/utils/formatting";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

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
  if (t1.kind === "ethereum" && t2.kind === "ethereum") {
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
  if (t1.kind === "polkadot" && t2.kind === "polkadot") {
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
  source: TransferLocation,
  registry: AssetRegistry,
  destination: TransferLocation,
) => {
  const links: { text: string; url: string }[] = [];
  if (transfer.kind == "kusama") {
    const tx = transfer;
    if (tx.destinationReceived) {
      let sourceParaId: string = source.parachain!.id.toString();
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
  } else if (transfer.kind == "polkadot") {
    const tx = transfer as historyV2.ToEthereumTransferResult;
    links.push({
      text: `Submitted to ${source.name}`,
      url: subscanExtrinsicLink(
        registry.environment,
        source.parachain!.id,
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
  if (destination?.kind == "polkadot") {
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
    transfer.kind === "polkadot" &&
    destination.kind === "ethereum" &&
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
    transfer.kind === "ethereum" &&
    source.kind === "ethereum" &&
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
  if (transfer.kind === "ethereum" && source.kind === "ethereum") {
    sourceAccountUrl = etherscanAddressLink(
      registry.environment,
      source.ethChain.id,
      transfer.info.sourceAddress,
    );
    beneficiaryAccountUrl = subscanAccountLink(
      registry.environment,
      destination.parachain!.id,
      beneficiary,
    );
  } else if (transfer.kind === "kusama") {
    let sourceParachain = source.parachain!.id.toString();
    let destParachain = destination.parachain!.id.toString();
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
      source.parachain!.id,
      transfer.info.sourceAddress,
    );
    beneficiaryAccountUrl = etherscanAddressLink(
      registry.environment,
      (destination as EthereumLocation).ethChain.id,
      beneficiary,
    );
  }
  const { tokenName, amount } = formatTokenData(
    transfer,
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets,
  );
  const formattedDate = formatShortDate(new Date(transfer.info.when));
  return (
    <div className="flex-col">
      <div className="glass-sub p-4 pt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1 font-medium">Date</td>
              <td className="py-1 text-right">{formattedDate}</td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Source</td>
              <td className="py-1 text-right">
                <span className="inline-flex items-center gap-1">
                  <ImageWithFallback
                    src={`/images/${source.key}.png`}
                    fallbackSrc="/images/parachain_generic.png"
                    width={16}
                    height={16}
                    alt={source.name}
                    className="rounded-full"
                  />
                  {source.name}
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-1 font-medium">Value</td>
              <td className="py-1 text-right">
                <span className="inline-flex items-center gap-1">
                  <ImageWithFallback
                    src={`/images/${(tokenName ?? "token_generic").toLowerCase()}.png`}
                    fallbackSrc="/images/token_generic.png"
                    width={16}
                    height={16}
                    alt={tokenName ?? "token"}
                    className="rounded-full"
                  />
                  {amount}{" "}
                  {transfer.info.tokenAddress !==
                  assetsV2.ETHER_TOKEN_ADDRESS ? (
                    <span
                      className="hover:underline cursor-pointer inline-flex items-center"
                      onClick={() => window.open(tokenUrl)}
                      onAuxClick={() => window.open(tokenUrl)}
                    >
                      {tokenName}
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  ) : (
                    tokenName
                  )}
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-1 font-medium">From</td>
              <td className="py-1 text-right">
                <span
                  className="hover:underline cursor-pointer inline-flex items-center"
                  onClick={() => window.open(sourceAccountUrl)}
                  onAuxClick={() => window.open(sourceAccountUrl)}
                >
                  {trimAccount(sourceAddress)}
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-1 font-medium">To</td>
              <td className="py-1 text-right">
                <span
                  className="hover:underline cursor-pointer inline-flex items-center"
                  onClick={() => window.open(beneficiaryAccountUrl)}
                  onAuxClick={() => window.open(beneficiaryAccountUrl)}
                >
                  {trimAccount(beneficiary)}
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="p-1"></div>
        {links.length > 0 && (
          <div className="relative">
            {links.map((link, i) => (
              <div
                key={i}
                className="flex items-start gap-3 relative pb-2 last:pb-0"
              >
                {/* Vertical line */}
                {i < links.length - 1 && (
                  <div className="absolute left-[7px] top-[16px] w-0.5 h-[calc(100%-8px)] bg-slate-700/30" />
                )}
                {/* Checkmark circle */}
                <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 z-10">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div
                  className="text-sm hover:underline cursor-pointer"
                  onClick={() => window.open(link.url)}
                  onAuxClick={() => window.open(link.url)}
                >
                  {link.text}
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          hidden={!transfer.isWalletTransaction}
          className="flex justify-center"
        >
          <Button
            className={"glass-button mt-2"}
            onClick={() => {
              router.push(`txcomplete?messageId=${transfer.id}`);
            }}
          >
            View
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function Activity() {
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  const [transferActivityCache, setTransferActivityCache] = useAtom(
    transferActivityCacheAtom,
  );
  const [transfersPendingLocal, setTransfersPendingLocal] = useAtom(
    transfersPendingLocalAtom,
  );

  const { registry: assetRegistry } = useContext(BridgeInfoContext)!;
  const {
    data: transfers,
    mutate,
    isLoading: isTransfersLoading,
    isValidating: isTransfersValidating,
    error: transfersError,
  } = useTransferActivity();

  const isRefreshing = isTransfersLoading || isTransfersValidating;
  const [transfersErrorMessage, setTransfersErrorMessage] = useState<
    string | null
  >(null);

  const [showGlobal, setShowGlobal] = useAtom(transferActivityShowGlobal);

  useEffect(() => {
    if (transfersError) {
      console.error(transfersError);
      track("Activity Page Failed", transfersError);
      setTransfersErrorMessage(
        "The activity service is under heavy load, so this may take a while...",
      );
    } else {
      setTransfersErrorMessage(null);
    }
  }, [transfersError, setTransfersErrorMessage]);

  const hashItem = useWindowHash();

  useEffect(() => {
    if (transfers === null) return;
    setTransferActivityCache(transfers);
  }, [transfers, setTransferActivityCache]);

  useEffect(() => {
    const oldTransferCutoff = new Date().getTime() - 4 * 60 * 60 * 1000; // 4 hours
    for (let i = 0; i < transfersPendingLocal.length; ++i) {
      if (
        transferActivityCache.find((h) =>
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
  }, [transferActivityCache, setTransfersPendingLocal]);

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
      const isDuplicate = transferActivityCache.find((t) =>
        isSameTransfer(t, pending),
      );

      if (isDuplicate) {
        continue;
      }
      allTransfers.push(pending);
    }
    for (const transfer of transferActivityCache) {
      const id = getChainIdentifiers(transfer, assetRegistry);
      if (
        !id ||
        (id.sourceType === "polkadot" &&
          !(`polkadot_${id.sourceId}` in assetRegistry.parachains)) ||
        (id.destinationType === "substrate" &&
          !(id.destinationId in assetRegistry.parachains))
      )
        continue;

      transfer.isWalletTransaction = isWalletTransaction(
        transfer.info.sourceAddress,
        transfer.info.beneficiaryAddress,
      );
      const isLinkedTransaction = hashItem && transfer.id === hashItem;
      if (!showGlobal && !transfer.isWalletTransaction && !isLinkedTransaction)
        continue;

      allTransfers.push(transfer);
    }
    const pages: Transfer[][] = [];
    for (let i = 0; i < allTransfers.length; i += ITEMS_PER_PAGE) {
      pages.push(allTransfers.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [
    transfersPendingLocal,
    transferActivityCache,
    assetRegistry,
    polkadotAccounts,
    ethereumAccounts,
    showGlobal,
    hashItem,
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
    transferActivityCache.length === 0
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
      <div className="flex justify-center">
        <div className="w-full max-w-[min(48rem,calc(100vw-2rem))] min-h-[460px]">
          <div className="flex flex-row items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-semibold">Activity</h2>
              <p className="text-muted-foreground">
                {showGlobal
                  ? "All Snowbridge transfers."
                  : "My transfer activity."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={isRefreshing}
                onClick={() => mutate()}
                className="h-8 w-8"
                title="Refresh"
              >
                <LucideRefreshCw
                  className={isRefreshing ? "animate-spin" : ""}
                  size={18}
                />
              </Button>
              <Toggle
                pressed={showGlobal}
                onPressedChange={(p) => setShowGlobal(p)}
                className="h-8 w-8 p-0"
                title={
                  showGlobal ? "Show my transfers" : "Show global transfers"
                }
              >
                <LucideGlobe size={18} />
              </Toggle>
            </div>
          </div>
          <div>
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
              <p className="text-muted-foreground text-center">
                Your transactions will appear here. Click on the{" "}
                <LucideGlobe size={16} className="inline align-middle mx-1" />{" "}
                icon to see all Snowbridge transactions.
              </p>
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
          </div>
        </div>
      </div>
      <ErrorDialog
        open={!isRefreshing && transfersErrorMessage !== null}
        title="Error Fetching Activity"
        description={transfersErrorMessage ?? "Unknown Error."}
        dismiss={() => setTransfersErrorMessage(null)}
      />
    </Suspense>
  );
}

const Loading = () => {
  return <SnowflakeLoader size="md" />;
};
