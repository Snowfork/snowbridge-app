"use client";

import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { SnowflakeLoader } from "@/components/SnowflakeLoader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import base64url from "base64url";
import { useSearchParams } from "next/navigation";
import { Suspense, useContext, useMemo } from "react";
import { TransferStatusBadge } from "@/components/activity/TransferStatusBadge";
import { RefreshButton } from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { historyV2, subsquidV2 } from "@snowbridge/api";
import useSWR from "swr";
import { subscanEventLink, subscanExtrinsicLink } from "@/lib/explorerLinks";
import { BridgeInfoContext } from "../providers";
import { AssetRegistry } from "@snowbridge/base-types";
import { getEnvironment } from "@/lib/snowbridge";
import { getTransferLocation } from "@snowbridge/registry";
import { TransferTitle } from "@/components/activity/TransferTitle";
import { chainName } from "@/utils/chainNames";

const Loading = () => {
  return <SnowflakeLoader size="md" />;
};

interface TxCardProps {
  transfer: historyV2.InterParachainTransfer;
  refresh: () => unknown | Promise<unknown>;
  registry: AssetRegistry;
}
function TxCard(props: TxCardProps) {
  const { transfer, refresh, registry } = props;

  const links: { text: string; url: string }[] = [];
  const source = getTransferLocation(registry, {
    kind: transfer.kind,
    id: transfer.submitted.sourceParachainId,
  });
  links.push({
    text: `Submitted to ${chainName(source)}`,
    url: subscanExtrinsicLink(
      registry.environment,
      transfer.submitted.sourceParachainId,
      transfer.submitted.extrinsic_hash,
    ),
  });
  if (transfer.destinationReceived) {
    const destination = getTransferLocation(registry, {
      kind: transfer.kind,
      id:
        transfer.info.destinationParachain ??
        transfer.destinationReceived.paraId,
    });
    links.push({
      text: `Message received on ${chainName(destination)}`,
      url: subscanEventLink(
        registry.environment,
        transfer.destinationReceived.paraId,
        `${transfer.destinationReceived.blockNumber}-${transfer.destinationReceived.event_index}`,
      ),
    });
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
            Transfer can take up to 5 minutes.
          </div>
          <div>
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
          <div className="flex justify-center items-center gap-3 mt-4">
            <RefreshButton
              onClick={refresh}
              className={cn(
                transfer.status !== historyV2.TransferStatus.Pending
                  ? "hidden"
                  : "glass-button",
              )}
            />
            <Link href="/activity">
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

  const [messageId, transfer] = useMemo(() => {
    const transferEncoded = searchParams.get("transfer");
    if (transferEncoded === null) return [null, null];

    const decoded = JSON.parse(
      base64url.decode(transferEncoded),
    ) as historyV2.InterParachainTransfer;
    return [decoded.id, decoded];
  }, [searchParams]);

  const {
    data: txData,
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR(
    [registry.environment, "localcompletedtx", messageId],
    async ([, , messageId]) => {
      if (messageId !== null && transfer !== null) {
        const delivered = await subsquidV2.fetchInterParachainMessageById(
          environment.indexerGraphQlUrl,
          messageId,
        );
        if (delivered && delivered.length > 0) {
          const tx = { ...transfer };
          tx.status = delivered[0].success
            ? historyV2.TransferStatus.Complete
            : historyV2.TransferStatus.Failed;
          tx.destinationReceived = {
            blockNumber: delivered[0].blockNumber,
            block_timestamp: delivered[0].timestamp,
            messageId: delivered[0].messageId,
            paraId: Number(delivered[0].paraId),
            success: delivered[0].success,
            event_index: delivered[0].eventId.split("-")[1],
          };
          return tx;
        }
      }
      return transfer;
    },
    {
      refreshInterval: 60 * 1000, // 1 minute
      suspense: true,
      fallbackData: transfer,
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
      transfer={txData!}
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
