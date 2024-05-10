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

export const formatTime = (time: number): string => {
  let hours = Math.floor(time / 3600)
  let minutes = Math.floor((time % 3600) / 60)
  let seconds = Math.floor(time % 60)
  let fmt = ""
  if (hours > 0) fmt += `${hours}h `;
  if (minutes > 0) fmt += `${minutes}m `;
  fmt += `${seconds}s`;
  return fmt
}
