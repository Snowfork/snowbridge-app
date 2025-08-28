"use client";

import { ContextComponent } from "@/components/Context";
import {
  getEnvDetail,
  TransferTitle,
} from "@/components/history/TransferTitle";
import { MaintenanceBanner } from "@/components/MainenanceBanner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinalizeBridgingButton } from "@/components/FinalizeBridgingButton";
import { Transfer } from "@/store/transferHistory";
import base64url from "base64url";
import { LucideLoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useContext, useMemo } from "react";
import { TransferStatusBadge } from "@/components/history/TransferStatusBadge";
import { RefreshButton } from "@/components/RefreshButton";
import { cn } from "@/lib/utils";
import { historyV2, subsquid } from "@snowbridge/api";
import useSWR from "swr";
import { subscanEventLink, subscanExtrinsicLink } from "@/lib/explorerLinks";
import { RegistryContext } from "../providers";
import { AssetRegistry } from "@snowbridge/base-types";
import { getEnvironment } from "@/lib/snowbridge";
import { getTransferLocation } from "@snowbridge/api/dist/assets_v2";

const Loading = () => {
  return (
    <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
      Fetching Transfer Status{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};

interface TxCardProps {
  transfer: historyV2.InterParachainTransfer;
  refresh: () => unknown | Promise<unknown>;
  registry: AssetRegistry;
}
function TxCard(props: TxCardProps) {
  const { transfer, refresh, registry } = props;

  const links: { text: string; url: string }[] = [];
  const source = getTransferLocation(
    registry,
    transfer.sourceType,
    transfer.submitted.sourceParachainId.toString(),
  );
  links.push({
    text: `Submitted to ${source.name}`,
    url: subscanExtrinsicLink(
      registry.environment,
      transfer.submitted.sourceParachainId,
      transfer.submitted.extrinsic_hash,
    ),
  });
  if (transfer.destinationReceived) {
    const destination = getTransferLocation(
      registry,
      transfer.sourceType,
      transfer.info.destinationParachain?.toString() ??
        transfer.destinationReceived.paraId.toString(),
    );
    links.push({
      text: `Message received on ${destination.name}`,
      url: subscanEventLink(
        registry.environment,
        transfer.destinationReceived.paraId,
        `${transfer.destinationReceived.blockNumber}-${transfer.destinationReceived.event_index}`,
      ),
    });
  }

  return (
    <Card className="w-[360px] md:w-2/3">
      <CardHeader>
        <CardTitle>Nice! You did it.</CardTitle>
        <CardDescription className="hidden md:flex">
          <TransferTitle
            transfer={transfer}
            showBagde={false}
            showWallet={false}
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div>
            Transfer Status: <TransferStatusBadge transfer={transfer} />
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
          <div className="flex justify-end gap-2">
            <FinalizeBridgingButton transfer={transfer} registry={registry} />
            <RefreshButton
              onClick={refresh}
              className={cn(
                transfer.status !== historyV2.TransferStatus.Pending
                  ? "hidden"
                  : "",
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TxComponent() {
  const searchParams = useSearchParams();
  const registry = useContext(RegistryContext)!;
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
        const delivered = await subsquid.fetchInterParachainMessageById(
          environment.config.GRAPHQL_API_URL,
          messageId,
        );
        if (delivered && delivered.length > 0) {
          transfer.status = delivered[0].success
            ? historyV2.TransferStatus.Complete
            : historyV2.TransferStatus.Failed;
          transfer.destinationReceived = {
            blockNumber: delivered[0].blockNumber,
            block_timestamp: delivered[0].timestamp,
            messageId: delivered[0].messageId,
            paraId: Number(delivered[0].paraId),
            success: delivered[0].success,
            event_index: delivered[0].eventId.split("-")[1],
          };
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
        <Suspense fallback={<Loading />}>
          <TxComponent />
        </Suspense>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
