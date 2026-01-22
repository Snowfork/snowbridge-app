import { Big } from "big.js";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

export function transformSs58Format(
  address: string,
  ss58Format: number,
): string {
  try {
    return encodeAddress(decodeAddress(address), ss58Format);
  } catch (err) {
    console.warn("transformSs58Format:", err);
    return address;
  }
}

export function formatBalance({
  number,
  decimals,
  displayDecimals = 6,
}: {
  number: bigint;
  decimals: number;
  displayDecimals?: number;
}): string {
  const replaceZeros = (str: string): string => {
    if (!str) {
      return "0";
    }
    const newStr = str.replace(/(\.0+)$/, "").replace(/(0+)$/, "");
    if (newStr !== "") return newStr;
    return "0";
  };

  let value = new Big(number.toString()).div(new Big(10).pow(decimals));
  const [whole, decimal] = value.toFixed(displayDecimals, 0).split(".");
  const d = replaceZeros(decimal);
  if (d === "0") {
    return whole;
  }
  return whole + "." + d;
}

export function formatTime(time: number, showSeconds?: boolean): string {
  let hours = Math.floor(time / 3600);
  let minutes = Math.floor((time % 3600) / 60);
  let seconds = Math.floor(time % 60);
  let fmt = "";
  if (hours > 0) fmt += `${hours}h `;
  if (minutes > 0) fmt += `${minutes}m `;
  if (showSeconds ?? false) {
    if (seconds > 0) fmt += `${seconds}s`;
  }
  if (fmt === "") return "0s";
  return fmt;
}

export function trimAccount(
  account: string,
  chars: undefined | number = 12,
): string {
  const keepChars = chars / 2;
  if (keepChars > account.length / 2) {
    return account;
  }
  return (
    account.substring(0, keepChars) +
    "..." +
    account.substring(account.length - keepChars)
  );
}

export function formatShortDate(date: Date): string {
  return (
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }) +
    " " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export function truncateAmount(amt: string): string {
  const parts = amt.split(".");
  if (parts.length === 2 && parts[1].length > 10) {
    return parts[0] + "." + parts[1].slice(0, 10) + "…";
  }
  return amt;
}

/**
 * Format USD value, showing more decimals for small values.
 * For values >= 0.01: shows 2 decimal places (e.g., $0.20)
 * For values < 0.01: shows first significant digit only, truncated (e.g., $0.003)
 */
export function formatUsdValue(value: number): string {
  if (value === 0) return "$0.00";
  if (value >= 0.01) {
    return `$${value.toFixed(2)}`;
  }
  // For small values, find first non-zero decimal and show only that digit (truncated)
  const str = value.toFixed(20);
  const match = str.match(/^0\.(0*)([1-9])/);
  if (match) {
    const zeros = match[1];
    const firstSignificantDigit = match[2];
    return `$0.${zeros}${firstSignificantDigit}`;
  }
  return `$${value.toFixed(2)}`;
}
