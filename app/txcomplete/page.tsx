"use client";

import { ContextComponent } from "@/components/Context";
import {
  getEnvDetail,
  TransferTitle,
} from "@/components/activity/TransferTitle";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { SnowflakeLoader } from "@/components/SnowflakeLoader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Transfer } from "@/store/transferActivity";
import base64url from "base64url";
import { useSearchParams } from "next/navigation";
import { Suspense, useContext, useMemo } from "react";
import { TransferStatusBadge } from "@/components/activity/TransferStatusBadge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { cn } from "@/lib/utils";
import { historyV2 } from "@snowbridge/api";
import useSWR from "swr";
import {
  getDappLink,
  stellasSwapTokenLink,
  uniswapTokenLink,
} from "@/lib/explorerLinks";
import { BridgeInfoContext } from "../providers";
import { AssetRegistry } from "@snowbridge/base-types";
import { getEnvironment } from "@/lib/snowbridge";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { useAtomValue } from "jotai";
import { walletTxChecker } from "@/utils/addresses";
import { NeuroWebUnwrapForm } from "@/components/transfer/NeuroWebUnwrapStep";
import { ethereumAccountsAtom } from "@/store/ethereum";

const Loading = () => {
  return <SnowflakeLoader size="md" />;
};

interface TxCardProps {
  transfer: Transfer;
  refresh: () => unknown | Promise<unknown>;
  inHistory: boolean;
  registry: AssetRegistry;
}
function TxCard(props: TxCardProps) {
  const { transfer, refresh, inHistory, registry } = props;
  const { destination } = getEnvDetail(transfer, registry);
  const links: { name: string; link: string }[] = [];

  const token =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[
      transfer.info.tokenAddress.toLowerCase()
    ];
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const ethereumAccounts = useAtomValue(ethereumAccountsAtom);

  const isWalletTransaction = useMemo(() => {
    const checker = walletTxChecker([
      ...(polkadotAccounts ?? []).map((acc) => acc.address),
      ...ethereumAccounts,
    ]);
    return checker(
      transfer.info.sourceAddress,
      transfer.info.beneficiaryAddress,
    );
  }, [
    ethereumAccounts,
    polkadotAccounts,
    transfer.info.beneficiaryAddress,
    transfer.info.sourceAddress,
  ]);

  switch (transfer.kind) {
    // Uniswap
    case "polkadot": {
      const uniswap = {
        name: "Uniswap",
        link: uniswapTokenLink(
          registry.environment,
          registry.ethChainId,
          transfer.info.tokenAddress,
        ),
      };
      if (!uniswap.link.startsWith("#")) {
        links.push(uniswap);
      }
      break;
    }
    case "ethereum": {
      const stellasSwap = {
        name: "Stella Swap",
        link: stellasSwapTokenLink(
          registry.environment,
          destination.parachain!.id,
          transfer.info.tokenAddress,
        ),
      };
      if (!stellasSwap.link.startsWith("#")) {
        links.push(stellasSwap);
      }
      const dapp = {
        name: `${destination.name} Dapp`,
        link: getDappLink(registry.environment, destination.parachain!.id),
      };
      if (!dapp.link.startsWith("#")) {
        links.push(dapp);
      }
      break;
    }
  }

  let neuroWeb;
  if (
    isWalletTransaction &&
    transfer.info.destinationParachain === 2043 &&
    token.symbol === "TRAC"
  ) {
    neuroWeb = (
      <div>
        <NeuroWebUnwrapForm
          defaultAmount={transfer.info.amount}
          beneficiaryAddress={transfer.info.beneficiaryAddress}
          tokenAddress={transfer.info.tokenAddress}
          ready={historyV2.TransferStatus.Complete === transfer.status}
          mode="wrap"
          messageId={transfer.id}
        />
      </div>
    );
  } else {
    neuroWeb = <div hidden={true} />;
  }

  return (
    <Card className="w-full max-w-2xl glass border-white/60">
      <CardHeader>
        <CardTitle>Nice! You did it.</CardTitle>
        <CardDescription className="hidden md:flex">
          <TransferTitle transfer={transfer} showBagde={false} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            Transfer Status:{" "}
            <TransferStatusBadge transfer={transfer} showLabel />
          </div>
          <div
            className={cn(
              "text-muted-foreground text-sm",
              transfer.status !== historyV2.TransferStatus.Pending
                ? "hidden"
                : "",
            )}
          >
            Transfer can take up to{" "}
            {destination.kind !== "ethereum" ? "25 minutes" : "35-90 minutes"}
          </div>
          <div
            className={
              transfer.status !== historyV2.TransferStatus.Complete ||
              links.length == 0
                ? "hidden"
                : ""
            }
          >
            App Links
            <ul className="p-2 list-inside list-disc">
              {links.map(({ name, link }) => {
                return (
                  <li key={name}>
                    <Link
                      className={cn("underline", !inHistory ? "hidden" : "")}
                      href={link}
                    >
                      {name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          {neuroWeb}
          <div className="flex justify-center items-center gap-3 mt-4">
            <RefreshButton
              onClick={refresh}
              className={cn(
                transfer.status !== historyV2.TransferStatus.Pending
                  ? "hidden"
                  : "glass-button",
              )}
            />
            <Link href={inHistory ? `/activity#${transfer.id}` : "/activity"}>
              <Button className="action-button">Transaction Activity</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TxComponent() {
  const searchParams = useSearchParams();
  const { registry } = useContext(BridgeInfoContext)!;
  const environment = getEnvironment();

  const [messageId, sourceType, transfer] = useMemo(() => {
    const messageId = searchParams.get("messageId");
    const sourceType = searchParams.get("sourceType");
    const transferEncoded = searchParams.get("transfer");
    if (transferEncoded === null) return [messageId, sourceType];

    const decoded = JSON.parse(base64url.decode(transferEncoded)) as Transfer;
    return [decoded?.id ?? messageId, decoded.kind ?? sourceType, decoded];
  }, [searchParams]);

  const {
    data: { txData, inHistory },
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR(
    [registry.environment, "completedtx", sourceType, messageId],
    async ([, , sourceType, messageId]) => {
      if (messageId !== null) {
        if (sourceType === null) {
          const [toP, toE] = await Promise.all([
            historyV2.toPolkadotTransferById(
              environment.indexerGraphQlUrl,
              messageId,
            ),
            historyV2.toEthereumTransferById(
              environment.indexerGraphQlUrl,
              messageId,
            ),
          ]);
          return {
            txData: toP ?? toE ?? transfer,
            inHistory: (toP ?? toE) !== undefined,
          };
        } else {
          switch (sourceType) {
            case "ethereum": {
              const txData = await historyV2.toPolkadotTransferById(
                environment.indexerGraphQlUrl,
                messageId,
              );
              return {
                txData: txData ?? transfer,
                inHistory: txData !== undefined,
              };
            }
            case "substrate": {
              const txData = await historyV2.toEthereumTransferById(
                environment.indexerGraphQlUrl,
                messageId,
              );
              return {
                txData: txData ?? transfer,
                inHistory: txData !== undefined,
              };
            }
          }
        }
      }
      return { txData: transfer, inHistory: false };
    },
    {
      refreshInterval: 2 * 60 * 1000, // 2 minute
      suspense: true,
      revalidateOnFocus: false,
      fallbackData: { txData: transfer, inHistory: false },
    },
  );

  if (error !== undefined) {
    console.error(error);
    return <div>{error}</div>;
  }

  if (txData === undefined || isLoading || isValidating) {
    return <Loading />;
  }

  return (
    <TxCard
      transfer={txData}
      inHistory={inHistory}
      registry={registry}
      refresh={async () => await mutate()}
    />
  );
}

export default function TxComplete() {
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <div className="flex justify-center">
          <Suspense fallback={<Loading />}>
            <TxComponent />
          </Suspense>
        </div>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
