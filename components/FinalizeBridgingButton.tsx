"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { historyV2 } from "@snowbridge/api";
import { AssetRegistry } from "@snowbridge/base-types";
import { Transfer } from "@/store/transferHistory";
import { Context } from "@snowbridge/api";
import { useContext, useState } from "react";
import { RegistryContext } from "@/app/providers";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { NeurowebParachain } from "@snowbridge/api/dist/parachains/neuroweb";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { polkadotAccountAtom } from "@/store/polkadot";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Signer } from "@polkadot/api/types";

interface FinalizeBridgingButtonProps {
  transfer: Transfer;
  registry: AssetRegistry;
  className?: string;
}

export function FinalizeBridgingButton({
  transfer,
  registry,
  className,
}: FinalizeBridgingButtonProps) {
  const snowbridgeContext = useSnowbridgeContext();
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFinalizeBridging = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      console.log("Finalizing bridging with:", {
        amount: transfer.info.amount,
        sender: transfer.info.sourceAddress,
      });

      if (!snowbridgeContext) {
        throw new Error("Snowbridge context not available");
      }

      if (!polkadotAccount) {
        throw new Error("No Polkadot account connected");
      }

      const { signer, address } = polkadotAccount;
      if (!signer) {
        throw new Error("Signer is not available");
      }

      await cryptoWaitReady();

      const amount = BigInt(transfer.info.amount);
      const neuroWebParaId = 2043;

      // Check if Neuroweb parachain config exists in registry
      if (!registry.parachains[neuroWebParaId]) {
        throw new Error("Neuroweb parachain config not set in registry");
      }

      const parachainInfo = registry.parachains[neuroWebParaId].info;

      console.log("Wrapping SnowTRAC to TRAC");

      // Connect to the Neuroweb parachain
      const parachain = await snowbridgeContext.parachain(neuroWebParaId);
      const neuroWeb = new NeurowebParachain(
        parachain,
        neuroWebParaId,
        parachainInfo.specName,
        parachainInfo.specVersion,
      );

      // Get execution fee
      const fee = await neuroWeb.wrapExecutionFeeInNative(parachain);
      console.log("Execution fee:", fee);

      // Check SnowTRAC balance
      const balance = await neuroWeb.snowTRACBalance(
        address,
        registry.ethChainId,
      );
      console.log("SnowTRAC balance:", balance);

      // Create the wrap transaction
      const wrapTx = neuroWeb.createWrapTx(parachain, amount);

      console.log("Waiting for transaction to be confirmed by wallet.");

      // Sign and send the transaction
      await wrapTx.signAndSend(
        address,
        { signer: signer as Signer },
        (result) => {
          console.log(`Transaction status: ${result.status}`);

          if (result.status.isInBlock) {
            console.log(
              `Transaction included in block: ${result.status.asInBlock}`,
            );
            toast.info("Transaction In Block", {
              position: "bottom-center",
              description: `Transaction included in block: ${result.status.asInBlock}`,
            });
          } else if (result.status.isFinalized) {
            console.log(`Transaction finalized: ${result.status.asFinalized}`);
            setIsProcessing(false);

            if (!result.dispatchError) {
              toast.success("Bridging Finalized Successfully!", {
                position: "bottom-center",
                closeButton: true,
                duration: 10000,
                description: "SnowTRAC has been successfully wrapped to TRAC.",
              });
            } else {
              console.error(
                "Transaction finalized with error:",
                result.dispatchError.toString(),
              );
              toast.error("Transaction Failed", {
                position: "bottom-center",
                description: "Transaction failed during execution.",
              });
            }
          } else if (result.isError) {
            setIsProcessing(false);
            console.error("Transaction error:", result);
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
      console.error("Failed to finalize bridging:", error);
      toast.error("Failed to Finalize Bridging", {
        position: "bottom-center",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const isValidToken = () => {
    const tokenAddress = transfer.info.tokenAddress.toLowerCase();
    const tokenMetaData =
      registry.ethereumChains[registry.ethChainId].assets[tokenAddress];
    return tokenMetaData?.symbol.toLowerCase().startsWith("trac");
  };

  const isVisible =
    transfer.status === historyV2.TransferStatus.Complete && isValidToken();
  const isDisabled =
    transfer.status === historyV2.TransferStatus.Pending ||
    !polkadotAccount ||
    isProcessing;

  return (
    <Button
      onClick={handleFinalizeBridging}
      disabled={isDisabled}
      className={cn(isVisible ? "" : "hidden", className)}
    >
      {isProcessing ? "Processing..." : "Finalize Bridging"}
    </Button>
  );
}
