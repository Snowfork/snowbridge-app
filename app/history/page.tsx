"use client";

import { ErrorDialog } from "@/components/ErrorDialog";
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
import { useAssetMetadata } from "@/hooks/useAssetMetadata";
import { useTransferHistory } from "@/hooks/useTransferHistory";
import { useWindowHash } from "@/hooks/useWindowHash";
import { ethereumAccountsAtom } from "@/store/ethereum";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";
import {
  Transfer,
  transferHistoryCacheAtom,
  transferHistoryShowGlobal,
  transfersPendingLocalAtom,
} from "@/store/transferHistory";
import { encodeAddress } from "@polkadot/util-crypto";
import { assets, environment, history } from "@snowbridge/api";
import { TransferLocation } from "@snowbridge/api/dist/environment";
import { WalletAccount } from "@talismn/connect-wallets";
import { track } from "@vercel/analytics";
import { parseUnits } from "ethers";
import { useAtom, useAtomValue } from "jotai";
import {
  LucideGlobe,
  LucideLoaderCircle,
  LucideRefreshCw,
  LucideWallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  etherscanAddressLink,
  etherscanERC20TokenLink,
  etherscanTxHashLink,
  subscanAccountLink,
  subscanEventLink,
  subscanExtrinsicLink,
} from "@/lib/explorerLinks";
import {
  formatTokenData,
  getEnvDetail,
  TransferTitle,
} from "@/components/history/TransferTitle";

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
  env: environment.SnowbridgeEnvironment,
  transfer: Transfer,
  destination?: environment.TransferLocation,
) => {
  const links: { text: string; url: string }[] = [];
  if (destination?.type == "ethereum") {
    const ethTransfer = transfer as history.ToEthereumTransferResult;
    links.push({
      text: "Submitted to Asset Hub",
      url: subscanExtrinsicLink(
        env.name,
        "ah",
        ethTransfer.submitted.extrinsic_index,
      ),
    });

    if (ethTransfer.bridgeHubXcmDelivered) {
      links.push({
        text: "Bridge Hub received XCM from Asset Hub",
        url: subscanEventLink(
          env.name,
          "bh",
          ethTransfer.bridgeHubXcmDelivered.event_index,
        ),
      });
    }
    if (ethTransfer.bridgeHubChannelDelivered) {
      links.push({
        text: "Message delivered to Snowbridge Message Queue",
        url: subscanEventLink(
          env.name,
          "bh",
          ethTransfer.bridgeHubChannelDelivered.event_index,
        ),
      });
    }
    if (ethTransfer.bridgeHubMessageQueued) {
      links.push({
        text: "Message queued on Asset Hub Channel",
        url: subscanEventLink(
          env.name,
          "bh",
          ethTransfer.bridgeHubMessageQueued.event_index,
        ),
      });
    }
    if (ethTransfer.bridgeHubMessageAccepted) {
      links.push({
        text: "Message accepted by Asset Hub Channel",
        url: subscanEventLink(
          env.name,
          "bh",
          ethTransfer.bridgeHubMessageAccepted.event_index,
        ),
      });
    }
    if (ethTransfer.ethereumBeefyIncluded) {
      links.push({
        text: "Message included by beefy client",
        url: etherscanTxHashLink(
          env.name,
          ethTransfer.ethereumBeefyIncluded.transactionHash,
        ),
      });
    }
    if (ethTransfer.ethereumMessageDispatched) {
      links.push({
        text: "Message dispatched on Ethereum",
        url: etherscanTxHashLink(
          env.name,
          ethTransfer.ethereumMessageDispatched.transactionHash,
        ),
      });
    }
  }
  if (destination?.type == "substrate") {
    const dotTransfer = transfer as history.ToPolkadotTransferResult;
    links.push({
      text: "Submitted to Snowbridge Gateway",
      url: etherscanTxHashLink(env.name, dotTransfer.submitted.transactionHash),
    });

    if (dotTransfer.beaconClientIncluded) {
      links.push({
        text: "Included by light client on Bridge Hub",
        url: subscanEventLink(
          env.name,
          "bh",
          dotTransfer.beaconClientIncluded.event_index,
        ),
      });
    }
    if (dotTransfer.inboundMessageReceived) {
      links.push({
        text: "Inbound message received on Asset Hub channel",
        url: subscanEventLink(
          env.name,
          "bh",
          dotTransfer.inboundMessageReceived.event_index,
        ),
      });
    }
    if (dotTransfer.assetHubMessageProcessed) {
      links.push({
        text: "Message dispatched on Asset Hub",
        url: subscanEventLink(
          env.name,
          "ah",
          dotTransfer.assetHubMessageProcessed.event_index,
        ),
      });
    }
  }
  return links;
};

const transferDetail = (
  transfer: Transfer,
  env: environment.SnowbridgeEnvironment,
  ss58Format: number,
  assetErc20Metadata: { [token: string]: assets.ERC20Metadata },
): JSX.Element => {
  const destination = getEnvDetail(transfer, env);
  const links: { text: string; url: string }[] = getExplorerLinks(
    env,
    transfer,
    destination,
  );

  let source = transfer.info.sourceAddress;
  if (source.length === 66) {
    source = encodeAddress(source, ss58Format);
  }
  let beneficiary = transfer.info.beneficiaryAddress;
  if (beneficiary.length === 66) {
    beneficiary = encodeAddress(beneficiary, ss58Format);
  }
  const tokenUrl = etherscanERC20TokenLink(
    env.name,
    transfer.info.tokenAddress,
  );
  let sourceAccountUrl;
  let beneficiaryAccountUrl;
  if (destination?.paraInfo) {
    sourceAccountUrl = etherscanAddressLink(
      env.name,
      transfer.info.sourceAddress,
    );
    beneficiaryAccountUrl = subscanAccountLink(env.name, "ah", beneficiary);
  } else {
    sourceAccountUrl = subscanAccountLink(
      env.name,
      "ah",
      transfer.info.sourceAddress,
    );
    beneficiaryAccountUrl = etherscanAddressLink(env.name, beneficiary);
  }
  const { tokenName, amount } = formatTokenData(
    transfer,
    assetErc20Metadata,
    destination,
  );
  return (
    <div className="flex-col">
      <div className="p-2">
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
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);

  const [transferHistoryCache, setTransferHistoryCache] = useAtom(
    transferHistoryCacheAtom,
  );
  const [transfersPendingLocal, setTransfersPendingLocal] = useAtom(
    transfersPendingLocalAtom,
  );

  const { relaychainNativeAsset, erc20Metadata } = useAssetMetadata();
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
    (pages.length === 0 &&
      isTransfersLoading &&
      transferHistoryCache.length === 0) ||
    erc20Metadata === null
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
            {showGlobal
              ? "Global transfer history for the past two weeks."
              : "My transfer history for the past two weeks."}
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
          <hr />
          <Accordion
            type="single"
            className="w-full"
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
                  {transferDetail(
                    v,
                    env,
                    relaychainNativeAsset?.ss58Format ?? 42,
                    erc20Metadata,
                  )}
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
