"use client";
import { formatBalance } from "@/utils/formatting";
import { Context, assets, environment } from "@snowbridge/api";
import { getTokenBalance } from "./getTokenBalance";
import { ErrorInfo } from "../types";

export function updateBalance(
  context: Context,
  ethereumChainId: number,
  source: environment.TransferLocation,
  sourceAccount: string,
  token: string,
  tokenMetadata: assets.ERC20Metadata,
  setBalanceDisplay: (_: string) => void,
  setError: (_: ErrorInfo | null) => void,
) {
  getTokenBalance({
    context,
    token,
    ethereumChainId: BigInt(ethereumChainId),
    source,
    sourceAccount,
  })
    .then((result) => {
      let allowance = "";
      if (result.gatewayAllowance !== undefined) {
        allowance = ` (Allowance: ${formatBalance({
          number: result.gatewayAllowance ?? 0n,
          decimals: Number(tokenMetadata.decimals),
        })} ${tokenMetadata.symbol})`;
      }
      setBalanceDisplay(
        `${formatBalance({
          number: result.balance,
          decimals: Number(tokenMetadata.decimals),
        })} ${tokenMetadata.symbol} ${allowance}`,
      );
    })
    .catch((err) => {
      console.error(err);
      setBalanceDisplay("unknown");
      setError({
        title: "Error",
        description: `Could not fetch asset balance.`,
        errors: [],
      });
    });
}
