import { Transfer } from "@/store/transferHistory";
import { Badge } from "../ui/badge";
import { historyV2 } from "@snowbridge/api";
import { cn } from "@/lib/utils";
import { AssetRegistry } from "@snowbridge/base-types";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { NeurowebParachain } from "@snowbridge/api/dist/parachains/neuroweb";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { polkadotAccountsAtom } from "@/store/polkadot";
import { useAtomValue } from "jotai";
import { useState, useEffect } from "react";

interface TransferStatusBadgeProps {
  className?: string;
  transfer: Transfer;
  registry: AssetRegistry;
}
export function TransferStatusBadge({
  className,
  transfer,
  registry,
}: TransferStatusBadgeProps) {
  const [context, contextLoading, contextError] = useSnowbridgeContext();
  const polkadotAccounts = useAtomValue(polkadotAccountsAtom);
  const [snowTRACBalance, setSnowTRACBalance] = useState<bigint | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Use the first available Polkadot account
  const polkadotAccount =
    polkadotAccounts && polkadotAccounts.length > 0
      ? polkadotAccounts[0]
      : null;

  // Check if this is a completed TRAC transfer from Ethereum to Neuroweb
  const isCompletedTRACTransfer = () => {
    if (!registry?.ethereumChains || !registry?.ethChainId) {
      return false;
    }

    const tokenAddress = transfer.info.tokenAddress.toLowerCase();
    const tokenMetaData =
      registry.ethereumChains[registry.ethChainId]?.assets?.[tokenAddress];
    const isTRAC = tokenMetaData?.symbol.toLowerCase().startsWith("trac");
    const isCompleted = transfer.status === historyV2.TransferStatus.Complete;
    const isEthToNeuroweb =
      transfer.sourceType === "ethereum" &&
      (transfer as any).info?.destinationParachain === 2043; // Neuroweb parachain ID

    return isTRAC && isCompleted && isEthToNeuroweb;
  };

  // Check SnowTRAC balance for completed TRAC transfers
  useEffect(() => {
    const checkSnowTRACBalance = async () => {
      if (
        !context ||
        !polkadotAccount ||
        !registry ||
        !isCompletedTRACTransfer() ||
        contextLoading
      ) {
        return;
      }

      try {
        setIsCheckingBalance(true);
        await cryptoWaitReady();

        const neuroWebParaId = 2043;

        // Check if Neuroweb parachain config exists in registry
        if (!registry.parachains[neuroWebParaId]) {
          console.log("Neuroweb parachain config not set in registry");
          return;
        }

        const parachainInfo = registry.parachains[neuroWebParaId].info;

        // Connect to the Neuroweb parachain
        const parachain = await context.parachain(neuroWebParaId);
        const neuroWeb = new NeurowebParachain(
          parachain,
          neuroWebParaId,
          parachainInfo.specName,
          parachainInfo.specVersion,
        );

        // Check SnowTRAC balance
        const balance = await neuroWeb.snowTRACBalance(
          polkadotAccount.address,
          registry.ethChainId,
        );

        setSnowTRACBalance(balance);
      } catch (error) {
        console.error("Failed to check SnowTRAC balance in badge:", error);
        setSnowTRACBalance(null);
      } finally {
        setIsCheckingBalance(false);
      }
    };

    checkSnowTRACBalance();
  }, [
    context,
    polkadotAccount,
    registry,
    contextLoading,
    transfer.status,
    transfer.info.tokenAddress,
  ]);

  // Determine if we should show "Partially Complete" instead of "Complete"
  const hasSnowTRACBalance = snowTRACBalance && snowTRACBalance > 0n;
  const shouldShowPartiallyComplete =
    isCompletedTRACTransfer() && hasSnowTRACBalance && !isCheckingBalance;

  // Override status display for partially complete cases
  const displayStatus = shouldShowPartiallyComplete
    ? "Partially Complete"
    : historyV2.TransferStatus[transfer.status];

  const badgeStyle =
    historyV2.TransferStatus.Failed == transfer.status
      ? " bg-destructive"
      : historyV2.TransferStatus.Pending == transfer.status
        ? ""
        : shouldShowPartiallyComplete
          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
          : "bg-secondary";
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-4 mr-2 col-span-1 place-self-center badge",
        badgeStyle,
        className,
      )}
    >
      {displayStatus}
    </Badge>
  );
}
