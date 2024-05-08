import { type ClassValue, clsx } from "clsx"
import { Jersey_10 } from "next/font/google"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const trimAccount = (account: string, chars: number = 12): string => {
  const keepChars = chars / 2
  if (keepChars > account.length / 2) {
    return account
  }
  return account.substring(0, keepChars) + '...' + account.substring(account.length - keepChars)
}

export const formatNumber = (val: bigint, decimals: number = 18, displayDecimals: number = 6): string => {
  return (Number(val) / Math.pow(10, decimals)).toFixed(displayDecimals)
}
