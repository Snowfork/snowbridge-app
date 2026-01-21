"use client";
import { AccountType } from "@snowbridge/base-types";
import { PolkadotAccount } from "@/store/polkadot";
import { z } from "zod";

export const formSchemaSwitch = z.object({
  source: z.string(),
  destination: z.string(),
  token: z.string().min(1, "Select token."),
  amount: z
    .string()
    .regex(
      /^([1-9][0-9]{0,37})|([0-9]{0,37}\.+[0-9]{0,18})$/,
      "Invalid amount",
    ),
  beneficiary: z
    .string()
    .min(1, "Select beneficiary.")
    .regex(
      /^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{47,48})$/,
      "Invalid address format.",
    ),
  sourceAccount: z
    .string()
    .min(1, "Select source account.")
    .regex(
      /^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{47,48})$/,
      "Invalid address format.",
    ),
});

export const transferFormSchema = z.object({
  source: z.string().min(1, "Select source."),
  destination: z.string().min(1, "Select destination."),
  token: z.string().min(1, "Select token."),
  amount: z
    .string()
    .regex(
      /^([1-9][0-9]{0,37})|([0-9]{0,37}\.+[0-9]{0,18})$/,
      "Invalid amount",
    ),
  beneficiary: z
    .string()
    .min(1, "Select beneficiary.")
    .regex(
      /^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{47,48})$/,
      "Invalid address format.",
    ),
  sourceAccount: z
    .string()
    .min(1, "Select source account.")
    .regex(
      /^(0x[A-Fa-f0-9]{32})|(0x[A-Fa-f0-9]{20})|([A-Za-z0-9]{47,48})$/,
      "Invalid address format.",
    ),
});

export type TransferFormData = z.infer<typeof transferFormSchema>;

export function filterByAccountType(
  accountType: AccountType | "both",
): (_: PolkadotAccount) => boolean {
  return function (acc: PolkadotAccount) {
    // Check wallet metadata first, fallback to address format if type is undefined
    // Ethereum-type accounts have type === "ethereum" and are for AccountId20 chains
    const walletType = (acc as any).type;
    const isEthereumByAddress =
      acc.address.startsWith("0x") && acc.address.length === 42;
    const isEthereumType =
      walletType === "ethereum" ||
      (walletType === undefined && isEthereumByAddress);
    return (
      (accountType === "AccountId20" && isEthereumType) ||
      (accountType === "AccountId32" && !isEthereumType) ||
      accountType === "both"
    );
  };
}
