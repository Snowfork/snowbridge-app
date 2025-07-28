"use client";
import { toEthereumV2, toPolkadotV2 } from "@snowbridge/api";
import { ValidationError, FormDataSwitch } from "./types";
import { TransferFormData } from "./formSchema";

export function userFriendlyErrorMessage({
  error,
  formData,
}: {
  error: ValidationError;
  formData: TransferFormData | FormDataSwitch;
}) {
  if (error.errorKind === "toPolkadotV2") {
    if (
      error.reason == toPolkadotV2.ValidationReason.AccountDoesNotExist &&
      formData.destination === "assethub"
    ) {
      return "Beneficiary does not hold existential deposit on destination. Already have DOT on Polkadot? Teleport DOT to the beneficiary address on Asset Hub using your wallet.";
    }
    if (error.reason == toPolkadotV2.ValidationReason.InsufficientEther) {
      return "Insufficient ETH balance to pay transfer fees.";
    }
    return error.message;
  } else if (error.errorKind === "toEthereumV2") {
    if (error.reason == toEthereumV2.ValidationReason.InsufficientDotFee) {
      return "Insufficient DOT balance to pay transfer fees. Already have DOT on Polkadot? Teleport DOT to the source address on Asset Hub using your wallet.";
    }
    return error.message;
  }
  return (error as any).message;
}
