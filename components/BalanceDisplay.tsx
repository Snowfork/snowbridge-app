import { FC, useEffect } from "react";
import { formatBalance } from "@/utils/formatting";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { FormLabel } from "./ui/form";
import {
  AssetRegistry,
  ERC20Metadata,
  TransferLocation,
} from "@snowbridge/base-types";

interface BalanceDisplayProps {
  source: TransferLocation;
  destination: TransferLocation;
  registry: AssetRegistry;
  token: string;
  displayDecimals: number;
  tokenMetadata: ERC20Metadata | null;
  sourceAccount: string;
}

export const BalanceDisplay: FC<BalanceDisplayProps> = ({
  source,
  destination,
  registry,
  token,
  tokenMetadata,
  sourceAccount,
}) => {
  const { data: balanceInfo, error } = useTokenBalance(
    sourceAccount,
    source,
    destination,
    token,
  );
  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);
  if (error && !balanceInfo) {
    return (
      <FormLabel
        className={
          "text-xs text-right text-muted-foreground px-1 " +
          (sourceAccount ? " visible" : " hidden")
        }
      >
        Balances: Error...
      </FormLabel>
    );
  }

  if (balanceInfo === undefined || tokenMetadata === null) {
    return (
      <FormLabel
        className={
          "text-xs text-right text-muted-foreground px-1 " +
          (sourceAccount ? " show" : " hide")
        }
      >
        Balances: Fetching...
      </FormLabel>
    );
  }

  const dotBalance =
    destination.kind === "ethereum" &&
    source.parachain &&
    source.parachain.id !== registry.assetHubParaId &&
    source.parachain.features.hasDotBalance
      ? ` ;  ${formatBalance({
          number: balanceInfo.dotBalance ?? 0n,
          decimals: Number(balanceInfo.dotTokenDecimals),
        })} ${balanceInfo.dotTokenSymbol}`
      : "";

  const allowance =
    balanceInfo.gatewayAllowance !== undefined
      ? ` (Allowance: ${formatBalance({
          number: balanceInfo.gatewayAllowance ?? 0n,
          decimals: Number(tokenMetadata.decimals),
        })} ${tokenMetadata.symbol})`
      : "";

  const isNativeTransfer =
    balanceInfo.isNativeTransfer ||
    tokenMetadata.symbol === balanceInfo.nativeSymbol;
  let tokenBalance = "";
  if (!isNativeTransfer) {
    tokenBalance = `${formatBalance({
      number: balanceInfo.balance,
      decimals: Number(tokenMetadata.decimals),
    })} ${tokenMetadata.symbol}`;
  }

  const nativeBalance = `${formatBalance({
    number: balanceInfo.nativeBalance,
    decimals: balanceInfo.nativeTokenDecimals,
  })} ${balanceInfo.nativeSymbol}`;

  if (
    destination.kind === "ethereum" &&
    source.parachain &&
    source.parachain.id == registry.assetHubParaId &&
    tokenMetadata.symbol == "DOT"
  ) {
    return (
      <FormLabel
        className={
          "text-xs text-right text-muted-foreground px-1 " +
          (sourceAccount ? " visible" : " hidden")
        }
      >
        Balances: {nativeBalance}
      </FormLabel>
    );
  }

  return (
    <FormLabel
      className={
        "text-xs text-right text-muted-foreground px-1 " +
        (sourceAccount ? " visible" : " hidden")
      }
    >
      Balances: {nativeBalance} {dotBalance} {!isNativeTransfer ? " " : ""}{" "}
      {tokenBalance} {allowance}
    </FormLabel>
  );
};
