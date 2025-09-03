"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { historyV2 } from "@snowbridge/api";
import { AssetRegistry } from "@snowbridge/base-types";
import { Transfer } from "@/store/transferHistory";
import { useContext, useState, useEffect, useMemo } from "react";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { NeurowebParachain } from "@snowbridge/api/dist/parachains/neuroweb";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { toast } from "sonner";
import { Signer } from "@polkadot/api/types";
import { WalletAccount } from "@talismn/connect-wallets";
import { useAtomValue, atom, useAtom } from "jotai";
import { polkadotAccountsAtom } from "@/store/polkadot";

const tracBridgingProcessingAtom = atom<boolean>(false);

interface FinalizeBridgingButtonProps {
  transfer?: Transfer;
  registry: AssetRegistry;
  polkadotAccount?: WalletAccount | null;
  className?: string;
}

export function FinalizeBridgingButton({
  transfer,
  registry,
  polkadotAccount,
  className,
}: FinalizeBridgingButtonProps) {
  const [context, contextError] = useSnowbridgeContext();
  const [snowTRACBalance, setSnowTRACBalance] = useState<bigint | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isProcessing, setIsProcessing] = useAtom(tracBridgingProcessingAtom);
  const connectedPolkadotAccounts = useAtomValue(polkadotAccountsAtom);

  const effectiveAccount = useMemo(() => {
    if (polkadotAccount) {
      return polkadotAccount;
    }

    if (!connectedPolkadotAccounts || connectedPolkadotAccounts.length === 0) {
      return null;
    }

    if (transfer) {
      const matchingAccount = connectedPolkadotAccounts.find(
        (acc) => acc.address === transfer.info.beneficiaryAddress,
      );
      if (matchingAccount) {
        return matchingAccount;
      }
    }

    // Otherwise use the first connected account
    return connectedPolkadotAccounts[0];
  }, [
    polkadotAccount,
    connectedPolkadotAccounts,
    transfer?.info.beneficiaryAddress,
  ]);

  // Check SnowTRAC balance
  useEffect(() => {
    const checkSnowTRACBalance = async () => {
      if (!context || !effectiveAccount || !registry) {
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
          effectiveAccount.address,
          registry.ethChainId,
        );

        setSnowTRACBalance(balance);
      } catch (error) {
        console.error("Failed to check SnowTRAC balance:", error);
        setSnowTRACBalance(null);
      } finally {
        setIsCheckingBalance(false);
      }
    };

    checkSnowTRACBalance();
  }, [context, effectiveAccount, registry]);

  const handleFinalizeBridging = async () => {
    if (isProcessing) return;

    try {
      console.log("Finalizing SnowTRAC bridging with:", {
        balance: snowTRACBalance?.toString(),
        address: effectiveAccount?.address,
      });

      if (!context) {
        throw new Error("Snowbridge context not available");
      }

      if (!effectiveAccount) {
        throw new Error("No Polkadot account available");
      }

      if (!effectiveAccount.signer) {
        throw new Error(
          "Account signer not available - wallet connection required",
        );
      }

      // Set processing state after validations pass
      setIsProcessing(true);

      const { signer, address } = effectiveAccount;
      if (!signer) {
        throw new Error("Signer is not available");
      }

      await cryptoWaitReady();

      const neuroWebParaId = 2043;

      // Check if Neuroweb parachain config exists in registry
      if (!registry.parachains[neuroWebParaId]) {
        throw new Error("Neuroweb parachain config not set in registry");
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

      // Get execution fee
      const fee = await neuroWeb.wrapExecutionFeeInNative(parachain);

      // Create the wrap transaction with the current balance
      if (!snowTRACBalance) {
        throw new Error("No SnowTRAC balance available");
      }
      const wrapTx = neuroWeb.createWrapTx(parachain, snowTRACBalance);

      // Sign and send the transaction
      await wrapTx.signAndSend(
        address,
        { signer: signer as Signer },
        (result) => {
          if (result.status.isInBlock) {
            toast.info("Finalize Bridging started", {
              position: "bottom-center",
              description: `Transaction included in block: ${result.status.asInBlock}`,
            });
          } else if (result.status.isFinalized) {
            setIsProcessing(false);

            if (!result.dispatchError) {
              toast.success("TRAC bridging finalized!", {
                position: "bottom-center",
                closeButton: true,
                duration: 10000,
                description: "TRAC has been bridged successfully.",
              });

              setSnowTRACBalance(0n);
              // Clear processing state
              setIsProcessing(false);
            } else {
              toast.error("Transaction Failed", {
                position: "bottom-center",
                description: "Transaction failed during execution.",
              });
            }
          } else if (result.isError) {
            setIsProcessing(false);
            toast.error("Transaction Error", {
              position: "bottom-center",
              description:
                "An error occurred while processing the transaction.",
            });
          }
        },
      );
    } catch (error) {
      setIsProcessing(false);
      toast.error("Failed to Finalize Bridging", {
        position: "bottom-center",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  // Show button when user has SnowTRAC balance > 0, or when checking specific transfer
  const hasSnowTRACBalance = snowTRACBalance && snowTRACBalance > 0n;

  // For transfer-specific context, also check if it's a TRAC transfer
  const isTransferSpecific = Boolean(transfer);
  const isTRACTransfer =
    isTransferSpecific &&
    (() => {
      const tokenAddress = transfer!.info.tokenAddress.toLowerCase();
      const tokenMetaData =
        registry?.ethereumChains?.[registry.ethChainId]?.assets?.[tokenAddress];
      return tokenMetaData?.symbol.toLowerCase().startsWith("trac");
    })();

  const isVisible =
    (!isCheckingBalance && !isTransferSpecific && hasSnowTRACBalance) ||
    (!isCheckingBalance &&
      isTransferSpecific &&
      isTRACTransfer &&
      transfer?.status === 0) ||
    (transfer?.status === 1 && hasSnowTRACBalance);

  const isDisabled =
    !effectiveAccount ||
    !connectedPolkadotAccounts ||
    connectedPolkadotAccounts.length === 0 ||
    isProcessing ||
    isCheckingBalance ||
    !context ||
    (isTransferSpecific && !hasSnowTRACBalance); // Disable for transfer-specific context when no balance

  console.log("FinalizeBridgingButton state:", {
    isVisible,
    isDisabled,
    hasSnowTRACBalance,
    snowTRACBalance: snowTRACBalance?.toString(),
    isTransferSpecific,
    isTRACTransfer,
    isProcessing,
    isCheckingBalance,
  });

  return (
    <div className={cn(isVisible ? "flex flex-col gap-2" : "hidden")}>
      <Button
        onClick={handleFinalizeBridging}
        disabled={isDisabled}
        className={cn(
          !isTransferSpecific ? "action-button" : "", // Use action-button styling for global context
          className,
        )}
        type="button"
      >
        {isProcessing
          ? "Processing..."
          : !connectedPolkadotAccounts || connectedPolkadotAccounts.length === 0
            ? "Connect Wallet to Finalize"
            : isTransferSpecific
              ? "Finalize Bridging"
              : "Finalize TRAC Bridging"}
      </Button>
      {isTransferSpecific && (
        <p className="text-sm text-muted-foreground">
          Once your TRAC token has been transferred, click on Finalize Bridging
          to complete the transfer.
        </p>
      )}
    </div>
  );
}
