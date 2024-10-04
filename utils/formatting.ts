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
    const newStr = str.replace(/(\.0+)$/, "").replace(/(0+)$/, "");
    if (newStr !== "") {
      return newStr;
    }
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

export function formatTime(time: number): string {
  let hours = Math.floor(time / 3600);
  let minutes = Math.floor((time % 3600) / 60);
  let seconds = Math.floor(time % 60);
  let fmt = "";
  if (hours > 0) {
    fmt += `${hours}h `;
  }
  if (minutes > 0) {
    fmt += `${minutes}m `;
  }
  fmt += `${seconds}s`;
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
