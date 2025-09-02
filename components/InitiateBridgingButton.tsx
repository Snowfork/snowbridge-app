"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Context } from "@snowbridge/api";
import { useState } from "react";
import { useSnowbridgeContext } from "@/hooks/useSnowbridgeContext";
import { NeurowebParachain } from "@snowbridge/api/dist/parachains/neuroweb";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { polkadotAccountAtom } from "@/store/polkadot";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { AssetRegistry } from "@snowbridge/base-types";
import { TransferFormData } from "@/utils/formSchema";
import { snowbridgeContextAtom } from "@/store/snowbridge";

interface InitiateBridgingButtonProps {
  formData: TransferFormData;
  registry: AssetRegistry;
  className?: string;
  onPreTransferComplete?: () => void;
}

export function InitiateBridgingButton({
  formData,
  registry,
  className,
  onPreTransferComplete,
}: InitiateBridgingButtonProps) {
  const context = useAtomValue(snowbridgeContextAtom);
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const [isProcessing, setIsProcessing] = useState(false);

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

      // TODO: The NeurowebParachain API currently only provides wrap functionality (SnowTRAC -> TRAC)
      // but no unwrap functionality (TRAC -> SnowTRAC) is available in the current API.
      // This would need to be implemented in the @snowbridge/api package.

      // For now, inform the user about this limitation
      toast.info("Unwrap Functionality Not Available", {
        position: "bottom-center",
        duration: 8000,
        description: "The unwrap functionality to convert TRAC back to SnowTRAC is not currently available in the API. Please contact the development team to implement this feature.",
      });

      console.log("TRAC unwrap functionality needs to be implemented");

      // If unwrap functionality becomes available, it would look like:
      // const unwrapTx = neuroWeb.createUnwrapTx(parachain, BigInt(formData.amount));
      // await unwrapTx.signAndSend(polkadotAccount.address, { signer }, callback);

      setIsProcessing(false);

    } catch (error) {
      setIsProcessing(false);
      console.error("Failed to initiate bridging:", error);
      toast.error("Failed to Initiate Bridging", {
        position: "bottom-center",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const isVisible = isNeurowebToEthereum() && isTRACToken();
  const isDisabled = !polkadotAccount || isProcessing;

  if (!isVisible) return;

  return (
    <Button
      onClick={handleInitiateBridging}
      disabled={isDisabled}
      className={cn("w-full", className)}
      variant="outline"
    >
      {isProcessing ? "Checking..." : "Initiate Bridging (Unwrap TRAC)"}
    </Button>
  );
}
