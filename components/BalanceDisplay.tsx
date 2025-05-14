import { FC, useEffect } from "react";
import { assets, assetsV2 } from "@snowbridge/api";
import { formatBalance } from "@/utils/formatting";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { FormLabel } from "./ui/form";

interface BalanceDisplayProps {
  source: assetsV2.TransferLocation;
  destination: assetsV2.TransferLocation;
  registry: assetsV2.AssetRegistry;
  token: string;
  displayDecimals: number;
  tokenMetadata: assets.ERC20Metadata | null;
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
        className={"text-sm text-right text-muted-foreground px-1 " +
          (sourceAccount ? " visible" : " hidden")}
      >
        Balances: Error...
      </FormLabel>
    );
  }
  if (balanceInfo === undefined || tokenMetadata === null) {
    return (
      <FormLabel
        className={"text-sm text-right text-muted-foreground px-1 " +
          (sourceAccount ? " visible" : " hidden")}
      >
        Balances: Fetching...
      </FormLabel>
    );
  }

  const dotBalance = destination.type === "ethereum" &&
      source.parachain &&
      source.parachain.parachainId !== registry.assetHubParaId &&
      source.parachain.features.hasDotBalance
    ? ` ;  ${
      formatBalance({
        number: balanceInfo.dotBalance ?? 0n,
        decimals: Number(balanceInfo.dotTokenDecimals),
      })
    } ${balanceInfo.dotTokenSymbol}`
    : "";

  const allowance = balanceInfo.gatewayAllowance !== undefined
    ? ` (Allowance: ${
      formatBalance({
        number: balanceInfo.gatewayAllowance ?? 0n,
        decimals: Number(tokenMetadata.decimals),
      })
    } ${tokenMetadata.symbol})`
    : "";

  const isNativeTransfer = balanceInfo.isNativeTransfer ||
    tokenMetadata.symbol === balanceInfo.nativeSymbol;
  let tokenBalance = "";
  if (!isNativeTransfer) {
    tokenBalance = `${
      formatBalance({
        number: balanceInfo.balance,
        decimals: Number(tokenMetadata.decimals),
      })
    } ${tokenMetadata.symbol}`;
  }

  const nativeBalance = `${
    formatBalance({
      number: balanceInfo.nativeBalance,
      decimals: balanceInfo.nativeTokenDecimals,
    })
  } ${balanceInfo.nativeSymbol}`;

  if (
    destination.type === "ethereum" &&
    source.parachain &&
    source.parachain.parachainId == registry.assetHubParaId &&
    tokenMetadata.symbol == "DOT"
  ) {
    return (
      <FormLabel
        className={"text-sm text-right text-muted-foreground px-1 " +
          (sourceAccount ? " visible" : " hidden")}
      >
        Balances: {nativeBalance}
      </FormLabel>
    );
  }

  return (
    <FormLabel
      className={"text-sm text-right text-muted-foreground px-1 " +
        (sourceAccount ? " visible" : " hidden")}
    >
      Balances: {nativeBalance} {dotBalance} {!isNativeTransfer ? ";" : ""}{" "}
      {tokenBalance} {allowance}
    </FormLabel>
  );
};
