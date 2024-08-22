"use client";
import { z } from "zod";

export const AddressTypeSchema = z.enum(["20byte", "32byte", "both"]);

export const SourceTypeSchema = z.enum(["substrate", "ethereum"]);

export const TransferTokenSchema = z.object({
  id: z.string(),
  address: z.string(),
  minimumTransferAmount: z.bigint(),
});

export const ParachainInfoSchema = z.object({
  paraId: z.number(),
  destinationFeeDOT: z.bigint(),
  skipExistentialDepositCheck: z.boolean(),
  addressType: AddressTypeSchema,
  decimals: z.number(),
  maxConsumers: z.number(),
});

export const TransferLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SourceTypeSchema,
  destinationIds: z.array(z.string()),
  paraInfo: ParachainInfoSchema.optional(),
  erc20tokensReceivable: z.array(TransferTokenSchema),
});

export const formSchemaSwitch = z.object({
  source: TransferLocationSchema,
  destination: TransferLocationSchema,
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

export const formSchema = z.object({
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
