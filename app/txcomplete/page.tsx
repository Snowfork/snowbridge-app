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
import { useTransferHistory } from "@/hooks/useTransferHistory";
import { Transfer } from "@/store/transferHistory";
import base64url from "base64url";
import { LucideLoaderCircle, LucideRefreshCw } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import { TransferStatusBadge } from "@/components/history/TransferStatusBadge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { cn } from "@/lib/utils";
import { history } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { snowbridgeEnvironmentAtom } from "@/store/snowbridge";

const Loading = () => {
  return (
    <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
      Fetching Transfer Status{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};

interface TxCardProps {
  transfer: Transfer;
  refresh: () => unknown | Promise<unknown>;
  inHistory: boolean;
}
function TxCard(props: TxCardProps) {
  const { transfer, refresh, inHistory } = props;
  const env = useAtomValue(snowbridgeEnvironmentAtom);
  return (
    <Card className="w-[360px] md:w-2/3">
      <CardHeader>
        <CardTitle>Transfer Status</CardTitle>
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
              transfer.status !== history.TransferStatus.Pending
                ? "hidden"
                : "",
            )}
          >
            Transfer can take up to{" "}
            {getEnvDetail(transfer, env)?.type !== "ethereum"
              ? "25 minutes"
              : "4 hour 30 minutes"}
          </div>
          <div>
            <Link
              className={cn("underline text-sm", !inHistory ? "hidden" : "")}
              href={`/history#${transfer.id}`}
            >
              See in History
            </Link>
          </div>
          <div className="flex justify-evenly">
            <RefreshButton
              onClick={refresh}
              className={cn(
                transfer.status !== history.TransferStatus.Pending
                  ? "hidden"
                  : "",
              )}
            />
            <Link href="/">
              <Button>Done</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TxComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data, mutate } = useTransferHistory();

  const [transfer, inHistory] = useMemo(() => {
    const transferEncoded = searchParams.get("transfer");
    if (transferEncoded === null) return [null, false];

    const decoded = JSON.parse(base64url.decode(transferEncoded)) as Transfer;
    const history = data?.find(
      (x) => x.id?.toLowerCase() === decoded.id.toLowerCase(),
    );
    return [history ?? decoded, history !== undefined];
  }, [data, searchParams]);

  if (!transfer) {
    router.push("/");
    return <></>;
  }

  return (
    <TxCard
      transfer={transfer}
      inHistory={inHistory}
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
