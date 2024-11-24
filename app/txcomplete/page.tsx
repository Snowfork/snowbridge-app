"use client";

import { ContextComponent } from "@/components/Context";
import { MaintenanceBanner } from "@/components/MainenanceBanner";
import { TransferSummary } from "@/components/transfer/TransferSummary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LucideLoaderCircle } from "lucide-react";
import { useSearchParams, redirect } from "next/navigation";
import { Suspense } from "react";

const Loading = () => {
  return (
    <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
      Fetching Transfer Status{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};

interface TxCardProps {
  messageId: string;
}
function TxCard(props: TxCardProps) {
  const { messageId } = props;
  return (
    <Card className="w-[360px] md:w-2/3">
      <CardHeader>
        <CardTitle>Transfer Status</CardTitle>
        <CardDescription className="hidden md:flex">
          Status of transfer: {messageId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* <TransferSummary data={undefined} /> */}
        <div>Status: Pending</div>
        <div>Estimated Delivery Time</div>
        <div>Refresh</div>
      </CardContent>
    </Card>
  );
}

export default function TxComplete() {
  const searchParams = useSearchParams();
  const messageId = searchParams.get("messageId");
  if (!messageId) {
    redirect("/");
  }
  return (
    <MaintenanceBanner>
      <ContextComponent>
        <Suspense fallback={<Loading />}>
          <TxCard messageId={messageId} />
        </Suspense>
      </ContextComponent>
    </MaintenanceBanner>
  );
}
