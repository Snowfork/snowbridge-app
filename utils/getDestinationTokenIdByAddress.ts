"use client";
import { environment } from "@snowbridge/api";

export function getDestinationTokenIdByAddress({
  tokenAddress,
  destination,
}: {
  tokenAddress: string;
  destination?: environment.TransferLocation;
}): string | undefined {
  return (destination?.erc20tokensReceivable ?? []).find(
    (token) => token.address === tokenAddress,
  )?.id;
}
