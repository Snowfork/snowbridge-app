"use client";
import { assets } from "@snowbridge/api";
import { parseUnits } from "ethers";

export function parseAmount(
  decimals: string,
  metadata: assets.ERC20Metadata,
): bigint {
  return parseUnits(decimals, metadata.decimals);
}
