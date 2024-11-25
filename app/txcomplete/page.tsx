"use client";

import { ContextComponent } from "@/components/Context";
import { TransferTitle } from "@/components/history/TransferTitle";
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
import { useSearchParams, redirect } from "next/navigation";
import { useMemo } from "react";
import { TransferStatusBadge } from "@/components/history/TransferStatusBadge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";

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
}
function TxCard(props: TxCardProps) {
  const { transfer, refresh } = props;
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
          <div>
            <Link className="underline" href={`/history#${transfer.id}`}>
              See in History
            </Link>
          </div>
          <div className="flex justify-evenly">
            <RefreshButton onClick={refresh} />
            <Button
              onClick={() => {
                window.location.pathname = "/";
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TxComplete() {
  const searchParams = useSearchParams();
  const transferEncoded = searchParams.get("transfer");
  if (!transferEncoded) {
    redirect("/");
  }
  const { data, mutate } = useTransferHistory();
  const transfer = useMemo(() => {
    const decoded = JSON.parse(base64url.decode(transferEncoded)) as Transfer;
    return (
      data?.find((x) => x.id.toLowerCase() === decoded.id.toLowerCase()) ??
      decoded
    );
  }, [data, transferEncoded]);
  console.log(transfer);
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <TxCard transfer={transfer} refresh={async () => await mutate()} />
      </ContextComponent>
    </MaintenanceBanner>
  );
}
