"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Context } from "@snowbridge/api";
import { useState, useEffect } from "react";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { NeurowebParachain } from "@snowbridge/api/dist/parachains/neuroweb";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { WalletAccount } from "@talismn/connect-wallets";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Signer } from "@polkadot/api/types";
import { AssetRegistry } from "@snowbridge/base-types";
import { TransferFormData } from "@/utils/formSchema";
import { snowbridgeContextAtom } from "@/store/snowbridge";

interface InitiateBridgingButtonProps {
  formData: TransferFormData;
  registry: AssetRegistry;
  polkadotAccount?: WalletAccount | null;
  className?: string;
  onPreTransferComplete?: () => void;
}

export function InitiateBridgingButton({
  formData,
  registry,
  polkadotAccount,
  className,
  onPreTransferComplete,
}: InitiateBridgingButtonProps) {
  const context = useAtomValue(snowbridgeContextAtom);

  const [isProcessing, setIsProcessing] = useState(false);
  const [tracBalance, setTracBalance] = useState<bigint | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  console.log("in InitiateBridgingButton")
  const isNeurowebToEthereum = () => {
    return (
      formData.source === "origintrail-parachain" &&
      formData.destination === "ethereum"
    );
  };

  const isTRACToken = () => {
    // Check if the selected token is TRAC
    const tokenAddress = formData.token.toLowerCase();
    const tokenMetaData =
      registry.ethereumChains[registry.ethChainId].assets[tokenAddress];
    return tokenMetaData?.symbol.toLowerCase().startsWith("trac");
  };

  // Check TRAC balance
  useEffect(() => {
    const checkTRACBalance = async () => {
      console.log(context)
      console.log(polkadotAccount)
      console.log(registry)
      console.log(isNeurowebToEthereum())
      console.log(isTRACToken())
      if (!context || !polkadotAccount || !registry || !isNeurowebToEthereum() || !isTRACToken()) {
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
          parachainInfo.specVersion
        );

        // Check TRAC balance (native TRAC balance on Neuroweb)
        const balance = await neuroWeb.tracBalance(polkadotAccount.address);
        setTracBalance(balance);

        console.log("TRAC balance for", polkadotAccount.address, ":", balance.toString());
      } catch (error) {
        console.error("Failed to check TRAC balance:", error);
        setTracBalance(null);
      } finally {
        setIsCheckingBalance(false);
      }
    };

    checkTRACBalance();
  }, [context, polkadotAccount, registry, formData.source, formData.destination, formData.token]);

  const handleInitiateBridging = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      console.log("Initiating bridging for TRAC unwrap:", {
        source: formData.source,
        destination: formData.destination,
        token: formData.token,
        amount: formData.amount,
      });

      if (!context) {
        throw new Error("Snowbridge context not available");
      }

      if (!polkadotAccount) {
        throw new Error("No Polkadot account connected");
      }

      await cryptoWaitReady();

      const neuroWebParaId = 2043;

      // Check if Neuroweb parachain config exists in registry
      if (!registry.parachains[neuroWebParaId]) {
        throw new Error("Neuroweb parachain config not set in registry");
      }

      const parachainInfo = registry.parachains[neuroWebParaId].info;

      console.log("Checking for unwrap functionality on Neuroweb parachain");

      // Connect to the Neuroweb parachain
      const parachain = await context.parachain(neuroWebParaId);
      const neuroWeb = new NeurowebParachain(
        parachain,
        neuroWebParaId,
        parachainInfo.specName,
        parachainInfo.specVersion
      );

      // Check current TRAC balance to unwrap
      const currentTracBalance = await neuroWeb.tracBalance(polkadotAccount.address);

      if (!currentTracBalance || currentTracBalance === 0n) {
        throw new Error("No TRAC balance available to unwrap");
      }

      console.log("Unwrapping TRAC to SnowTRAC, balance:", currentTracBalance.toString());

      // Create unwrap transaction - unwrap all TRAC balance
      const unwrapTx = neuroWeb.createUnwrapTx(parachain, currentTracBalance);

      console.log("Waiting for unwrap transaction to be confirmed by wallet.");

      // Sign and send the unwrap transaction
      await unwrapTx.signAndSend(
        polkadotAccount.address,
        { signer: polkadotAccount.signer as Signer },
        (result) => {
          console.log(`Unwrap transaction status: ${result.status}`);

          if (result.status.isInBlock) {
            console.log(`Unwrap transaction included in block: ${result.status.asInBlock}`);
            toast.info("Unwrap Transaction In Block", {
              position: "bottom-center",
              description: `Transaction included in block: ${result.status.asInBlock}`,
            });
          } else if (result.status.isFinalized) {
            console.log(`Unwrap transaction finalized: ${result.status.asFinalized}`);
            setIsProcessing(false);

            if (!result.dispatchError) {
              toast.success("TRAC Unwrapped Successfully!", {
                position: "bottom-center",
                closeButton: true,
                duration: 10000,
                description: "TRAC has been successfully unwrapped to SnowTRAC. You can now proceed with the transfer.",
              });

              // Reset TRAC balance to trigger re-check
              setTracBalance(null);

              // Call the callback if provided to inform parent component
              if (onPreTransferComplete) {
                onPreTransferComplete();
              }
            } else {
              console.error("Unwrap transaction finalized with error:", result.dispatchError.toString());
              toast.error("Unwrap Transaction Failed", {
                position: "bottom-center",
                description: "Unwrap transaction failed during execution.",
              });
            }
          } else if (result.isError) {
            setIsProcessing(false);
            console.error("Unwrap transaction error:", result);
            toast.error("Unwrap Transaction Error", {
              position: "bottom-center",
              description: "An error occurred while processing the unwrap transaction.",
            });
          }
        }
      );

    } catch (error) {
      setIsProcessing(false);
      console.error("Failed to initiate bridging:", error);
      toast.error("Failed to Initiate Bridging", {
        position: "bottom-center",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  console.log("Trac balance: ", tracBalance)
  const hasTRACBalance = tracBalance && tracBalance > 0n;
  const isVisible = isNeurowebToEthereum() && isTRACToken() && hasTRACBalance && !isCheckingBalance;
  const isDisabled = !polkadotAccount || isProcessing || isCheckingBalance;

  if (!isVisible) return;

  return (
    <Button
      onClick={handleInitiateBridging}
      disabled={isDisabled}
      className={cn("w-full", className)}
      variant="outline"
    >
      {isProcessing ? "Unwrapping..." : "Unwrap TRAC First"}
    </Button>
  );
}
