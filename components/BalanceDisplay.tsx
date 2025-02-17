import { FC, useEffect } from "react";
import { assets, assetsV2 } from "@snowbridge/api";
import { formatBalance } from "@/utils/formatting";
import { useAtomValue } from "jotai";
import { polkadotAccountAtom } from "@/store/polkadot";
import { ethereumAccountAtom } from "@/store/ethereum";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { FormLabel } from "./ui/form";

interface BalanceDisplayProps {
  source: assetsV2.Source;
  token: string;
  displayDecimals: number;
  tokenMetadata: assets.ERC20Metadata | null;
}

export const BalanceDisplay: FC<BalanceDisplayProps> = ({
  source,
  token,
  tokenMetadata,
}) => {
  const polkadotAccount = useAtomValue(polkadotAccountAtom);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);

  const sourceAccount =
    source.type == "ethereum"
      ? (ethereumAccount ?? undefined)
      : polkadotAccount?.address;

  const { data: balanceInfo, error } = useTokenBalance(
    sourceAccount,
    source,
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
          "text-sm text-right text-muted-foreground px-1 " +
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
          "text-sm text-right text-muted-foreground px-1 " +
          (sourceAccount ? " visible" : " hidden")
        }
      >
        Balances: Fetching...
      </FormLabel>
    );
  }

  const allowance =
    balanceInfo.gatewayAllowance !== undefined
      ? ` (Allowance: ${formatBalance({
          number: balanceInfo.gatewayAllowance ?? 0n,
          decimals: Number(tokenMetadata.decimals),
        })} ${tokenMetadata.symbol})`
      : "";

  const tokenBalance = `${formatBalance({
    number: balanceInfo.balance,
    decimals: Number(tokenMetadata.decimals),
  })} ${tokenMetadata.symbol}`;

  const nativeBalance = `${formatBalance({
    number: balanceInfo.nativeBalance,
    decimals: balanceInfo.nativeTokenDecimals,
  })} ${balanceInfo.nativeSymbol}`;

  return (
    <FormLabel
      className={
        "text-sm text-right text-muted-foreground px-1 " +
        (sourceAccount ? " visible" : " hidden")
      }
    >
      Balances: {nativeBalance} ; {tokenBalance} {allowance}
    </FormLabel>
  );
};
