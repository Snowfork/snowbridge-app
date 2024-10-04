"use client";

import { FC, Suspense } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import Link from "next/link";
import { LucideBarChart, LucideLoaderCircle } from "lucide-react";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { useAtomValue } from "jotai";
import { cn } from "@/lib/utils";
import { formatTime } from "@/utils/formatting";
import { usePathname } from "next/navigation";
import { snowbridgeContextAtom } from "@/store/snowbridge";

const StatusCard = () => {
  const { data: bridgeStatus } = useBridgeStatus();
  const pathname = usePathname();

  if (bridgeStatus == null) {
    return <Loading />;
  }

  const toPolkadotStyle =
    bridgeStatus.summary.toPolkadotOperatingMode === "Normal"
      ? "text-green-700"
      : "text-red-700";
  const toEthereumStyle =
    bridgeStatus.summary.toEthereumOperatingMode === "Normal"
      ? "text-green-700"
      : "text-red-700";
  const overallStyle =
    bridgeStatus.summary.overallStatus === "Normal"
      ? "text-green-700"
      : "text-red-700";

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={
            "text-primary underline-offset-4 hover:underline text-sm " +
            (pathname.toLowerCase().trim() === "/status"
              ? "invisible"
              : "visible")
          }
        >
          Bridge Status:{" "}
          <span className={overallStyle}>
            {bridgeStatus.summary.overallStatus}
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto">
        <div className="flex place-items-center space-x-4">
          <LucideBarChart />
          <div className="space-y-1">
            <p>
              To Polkadot:{" "}
              <span className={toPolkadotStyle}>
                {bridgeStatus.summary.toPolkadotOperatingMode}{" "}
                {formatTime(bridgeStatus.statusInfo.toPolkadot.latencySeconds)}
              </span>
            </p>
            <p>
              To Ethereum:{" "}
              <span className={toEthereumStyle}>
                {bridgeStatus.summary.toEthereumOperatingMode}{" "}
                {formatTime(bridgeStatus.statusInfo.toEthereum.latencySeconds)}
              </span>
            </p>
            <Link className="text-xs" href="/status">
              See more
            </Link>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

const Loading = () => {
  const context = useAtomValue(snowbridgeContextAtom);
  let hidden = "";
  if (context === null) {
    hidden = "invisible";
  }
  return (
    <div
      className={cn(
        "flex text-primary underline-offset-4 hover:underline text-sm items-center",
        hidden,
      )}
    >
      Fetching Bridge Status{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};

export const BridgeStatus: FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <StatusCard />
    </Suspense>
  );
};
