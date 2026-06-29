"use client";
import { UseFormReturn } from "react-hook-form";
import { TransferFormData } from "./formSchema";
import { isAddressSanctioned } from "@/lib/client/ofacOracle";

export const validateOFAC = async (
  data: TransferFormData,
  form: UseFormReturn<TransferFormData>,
): Promise<boolean> => {
  let sourceBanned: boolean;
  let beneficiaryBanned: boolean;
  try {
    [sourceBanned, beneficiaryBanned] = await Promise.all([
      isAddressSanctioned(data.sourceAccount),
      isAddressSanctioned(data.beneficiary),
    ]);
  } catch (err) {
    throw Error(
      `Error verifying OFAC status of source and beneficiary accounts.`,
      { cause: err },
    );
  }

  if (beneficiaryBanned) {
    form.setError(
      "beneficiary",
      { message: "Beneficiary banned." },
      { shouldFocus: true },
    );
  }
  if (sourceBanned) {
    form.setError(
      "sourceAccount",
      { message: "Source Account banned." },
      { shouldFocus: true },
    );
  }
  return beneficiaryBanned === false && sourceBanned === false;
};
