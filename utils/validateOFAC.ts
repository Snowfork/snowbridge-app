"use client";
import { UseFormReturn } from "react-hook-form";
import { FormData } from "./types";

export const validateOFAC = async (
  data: FormData,
  form: UseFormReturn<FormData>,
): Promise<boolean> => {
  const response = await fetch("/blocked/api", {
    method: "POST",
    body: JSON.stringify({
      sourceAddress: data.sourceAccount,
      beneficiaryAddress: data.beneficiary,
    }),
  });
  if (!response.ok) {
    throw Error(
      `Error verifying ofac status: ${response.status} - ${response.statusText}`,
    );
  }
  const result = await response.json();
  if (result.beneficiaryBanned) {
    form.setError(
      "beneficiary",
      { message: "Beneficiary banned." },
      { shouldFocus: true },
    );
  }
  if (result.sourceBanned) {
    form.setError(
      "sourceAccount",
      { message: "Source Account banned." },
      { shouldFocus: true },
    );
  }
  return result.beneficiaryBanned === false && result.sourceBanned === false;
};
