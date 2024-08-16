"use client";

import { ErrorDialog } from "@/components/ErrorDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { useWindowHash } from "@/hooks/useWindowHash";
import { AccountInfo } from "@/lib/snowbridge";
import {
  formatTime,
  transformSs58Format,
  formatBalance,
} from "@/utils/formatting";
import { relayChainNativeAssetAtom } from "@/store/snowbridge";
import { useAtomValue } from "jotai";
import { LucideLoaderCircle, LucideRefreshCw } from "lucide-react";
import { FC, Suspense, useEffect, useState } from "react";

const AccountRow: FC<{ account: AccountInfo }> = ({ account }) => {
  let amount = "0";
  let symbol = "ETH";
  let accountDisplay = account.account;
  const relayChainNativeAsset = useAtomValue(relayChainNativeAssetAtom);
  switch (account.type) {
    case "ethereum":
      symbol = "ETH";
      amount = formatBalance({ number: BigInt(account.balance), decimals: 18 });
      break;
    case "substrate":
      symbol = relayChainNativeAsset?.tokenSymbol ?? "DOT";
      amount = formatBalance({
        number: BigInt(account.balance),
        decimals: relayChainNativeAsset?.tokenDecimal ?? 10,
      });
      const ss58format = relayChainNativeAsset?.ss58Format ?? 42;
      accountDisplay = transformSs58Format(accountDisplay, ss58format);
      break;
  }
  return (
    <TableRow>
      <TableCell>
        {account.name}{" "}
        <pre className="text-xs hidden md:block">{accountDisplay}</pre>
      </TableCell>
      <TableCell>
        <pre className="text-xs">
          {amount} {symbol}
        </pre>
      </TableCell>
    </TableRow>
  );
};

const StatusCard = () => {
  const {
    data: status,
    mutate,
    isLoading: isStatusLoading,
    isValidating: isStatusValidating,
    error: statusError,
  } = useBridgeStatus();

  const isRefreshing = isStatusLoading || isStatusValidating;
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (statusError) {
      console.error(statusError);
      setStatusErrorMessage("Bridge status unavaible. Please check back soon.");
    } else {
      setStatusErrorMessage(null);
    }
  }, [statusError, setStatusErrorMessage]);

  const hash = useWindowHash();
  const diagnostic = hash === "diagnostic";

  if (status == null) {
    return <Loading />;
  }

  const toPolkadotStyle =
    status.summary.toPolkadotOperatingMode === "Normal"
      ? "text-green-700"
      : "text-red-700";
  const toEthereumStyle =
    status.summary.toEthereumOperatingMode === "Normal"
      ? "text-green-700"
      : "text-red-700";
  const overallStyle =
    status.summary.overallStatus === "Normal"
      ? "text-green-700 font-semibold"
      : "text-red-700 font-semibold";
  if (status == null) {
    return <Loading />;
  }

  return (
    <>
      <Card className="w-[360px] md:w-2/3">
        <CardHeader>
          <CardTitle>Bridge Status</CardTitle>
          <CardDescription className="hidden md:flex">
            The status of Snowbridge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full pb-3">
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
          </div>
          <hr />
          <div className="grid grid-cols-2 justify-start pb-2">
            <h1 className="text-2xl font-semibold col-span-2 py-2">Summary</h1>
            <hr className="col-span-2 py-2" />
            <p>Overall:</p>
            <p>
              {" "}
              <span className={overallStyle}>
                {status.summary.overallStatus}
              </span>
            </p>
            <p>To Polkadot:</p>
            <p>
              {" "}
              <span className={toPolkadotStyle}>
                {status.summary.toPolkadotOperatingMode}{" "}
                {formatTime(status.statusInfo.toPolkadot.latencySeconds)}
              </span>
            </p>
            <p>To Ethereum:</p>
            <p>
              {" "}
              <span className={toEthereumStyle}>
                {status.summary.toEthereumOperatingMode}{" "}
                {formatTime(status.statusInfo.toEthereum.latencySeconds)}
              </span>
            </p>
          </div>

          <div className={diagnostic ? "" : "hidden"}>
            <div className="grid grid-cols-2 justify-between pb-2 px-2">
              <h1 className="text-2xl font-semibold col-span-2 py-2">Detail</h1>
              <hr className="col-span-2 py-2" />
              <h1 className="text-xl font-semibold col-span-2 py-2">
                To Polkadot
              </h1>
              <hr className="col-span-2 py-2" />
              <p className="px-2">Beacon Client</p>
              <p className="px-2">
                {status.statusInfo.toPolkadot.operatingMode.beacon}
              </p>
              <p className="px-2">Inbound Messages</p>
              <p className="px-2">
                {status.statusInfo.toPolkadot.operatingMode.inbound}
              </p>
              <p className="px-2">Outbound Messages</p>
              <p className="px-2">
                {status.statusInfo.toPolkadot.operatingMode.outbound}
              </p>
              <p className="px-2">Latest Beacon Slot Attested</p>
              <p className="px-2">
                {status.statusInfo.toPolkadot.latestBeaconSlotAttested}
              </p>
              <p className="px-2">Latest Beacon Slot Finalized</p>
              <p className="px-2">
                {status.statusInfo.toPolkadot.latestBeaconSlotFinalized}
              </p>
              <p className="px-2">Beacon Slot in Beacon client</p>
              <p className="px-2">
                {status.statusInfo.toPolkadot.latestBeaconSlotOnPolkadot}
              </p>
              <p className="px-2">Beacon client Latency (blocks)</p>
              <p className="px-2">
                {status.statusInfo.toPolkadot.blockLatency}
              </p>
              <h1 className="text-xl font-semibold col-span-2 py-2">
                To Ethereum
              </h1>
              <hr className="col-span-2 py-2" />
              <p className="px-2">Outbound Messages</p>
              <p className="px-2">
                {status.statusInfo.toEthereum.operatingMode.outbound}
              </p>
              <p className="px-2">Latest Relaychain Block</p>
              <p className="px-2">
                {status.statusInfo.toEthereum.latestPolkadotBlock}
              </p>
              <p className="px-2">Relaychain Block in BEEFY client</p>
              <p className="px-2">
                {status.statusInfo.toEthereum.latestPolkadotBlockOnEthereum}
              </p>
              <p className="px-2">BEEFY client latency (blocks)</p>
              <p className="px-2">
                {status.statusInfo.toEthereum.blockLatency}
              </p>
            </div>

            <div className="pb-2">
              <h1 className="text-2xl font-semibold col-span-4 py-2">
                Channels
              </h1>
              <hr className="col-span-3 py-2" />
              {status.channelStatusInfos.map((ci, i) => {
                return (
                  <div className="grid grid-cols-4 justify-start py-2" key={i}>
                    <h1 className="text-xl font-semibold py-2 col-span-4">
                      {ci.name}
                    </h1>
                    <hr className="col-span-4 py-2" />
                    <p className="col-span-2"></p>
                    <p className="px-2">Inbound</p>
                    <p className="px-2">Outbound</p>
                    <p className="col-span-2 px-2">To Ethereum nonce</p>
                    <p className="px-2">{ci.status.toEthereum.inbound}</p>
                    <p className="px-2">{ci.status.toEthereum.outbound}</p>
                    <p className="col-span-2 px-2">To Polkadot nonce</p>
                    <p className="px-2">{ci.status.toPolkadot.inbound}</p>
                    <p className="px-2">{ci.status.toPolkadot.outbound}</p>
                    <p className="col-span-2 px-2">
                      To Polkadot Operating Mode
                    </p>
                    <p className="col-span-2">
                      {ci.status.toPolkadot.operatingMode.outbound}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex-col pb-2">
              <h1 className="text-2xl font-semibold py-2">Relayers</h1>
              <hr className="py-2" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.relayers.map((acc, i) => (
                    <AccountRow key={i} account={acc} />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex-col">
              <h1 className="text-2xl font-semibold py-2">Accounts</h1>
              <hr className="py-2" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.accounts.map((acc, i) => (
                    <AccountRow key={i} account={acc} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      <ErrorDialog
        open={!isRefreshing && statusErrorMessage !== null}
        title="Error Fetching History"
        description={statusErrorMessage ?? "Unknown Error."}
        dismiss={() => setStatusErrorMessage(null)}
      />
    </>
  );
};

const Loading = () => {
  return (
    <div className="flex text-primary underline-offset-4 hover:underline text-sm items-center">
      Fetching Bridge Status{" "}
      <LucideLoaderCircle className="animate-spin mx-1 text-secondary-foreground" />
    </div>
  );
};

export default function Status() {
  return (
    <Suspense fallback={<Loading />}>
      <StatusCard />
    </Suspense>
  );
}
