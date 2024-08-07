"use client";
import { toEthereum, toPolkadot } from "@snowbridge/api";
import { ValidationError, FormData } from "./types";

export function userFriendlyErrorMessage({
  error,
  formData,
}: {
  error: ValidationError;
  formData: FormData;
}) {
  if (error.kind === "toPolkadot") {
    if (
      error.code == toPolkadot.SendValidationCode.BeneficiaryAccountMissing &&
      formData.destination === "assethub"
    ) {
      return "Beneficiary does not hold existential deposit on destination. Already have DOT on Polkadot? Teleport DOT to the beneficiary address on Asset Hub using your wallet.";
    }
    if (error.code == toPolkadot.SendValidationCode.InsufficientFee) {
      return "Insufficient ETH balance to pay transfer fees.";
    }
    return error.message;
  } else if (error.kind === "toEthereum") {
    if (error.code == toEthereum.SendValidationCode.InsufficientFee) {
      return "Insufficient DOT balance to pay transfer fees. Already have DOT on Polkadot? Teleport DOT to the source address on Asset Hub using your wallet.";
    }
    return error.message;
  }
  return (error as any).message;
}
