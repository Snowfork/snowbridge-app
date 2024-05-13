import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Big, roundDown } from 'big.js'

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

export const formatBalance = (number: bigint, decimals: number, displayDecimals: number = 6): string => {
  const value = new Big(number.toString()).div(new Big(10).pow(decimals))

  let zerosRemoved = value.toFixed(displayDecimals, roundDown).replace(/(\.0+)$/,'').replace(/(0+)$/,'')
  if(zerosRemoved === '') zerosRemoved = '0'
  if(zerosRemoved !== '0') return zerosRemoved

  return formatBalance(number, decimals, decimals)
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
