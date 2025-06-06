import { FC, useEffect } from "react";
import { formatBalance } from "@/utils/formatting";
import { FormLabel } from "./ui/form";
import { useKusamaTokenBalance } from "@/hooks/useKusamaTokenBalance";

interface BalanceDisplayKusamaProps {
  source: string;
  token: string;
  displayDecimals: number;
  sourceAccount: string;
}

export const KusamaBalanceDisplay: FC<BalanceDisplayKusamaProps> = ({
  source,
  token,
  sourceAccount,
}) => {
  const { data: balanceInfo, error } = useKusamaTokenBalance(
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
  if (balanceInfo === undefined) {
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

  const nativeBalance = `${formatBalance({
    number: balanceInfo.nativeBalance ?? 0n,
    decimals: Number(balanceInfo.feeTokenDecimals),
  })} ${balanceInfo.feeTokenSymbol}`;

  let tokenBalance = `${formatBalance({
    number: balanceInfo.tokenBalance,
    decimals: Number(balanceInfo.tokenDecimals),
  })} ${balanceInfo.tokenSymbol}`;

  if (balanceInfo.tokenSymbol === balanceInfo.feeTokenSymbol) {
    return (
      <FormLabel
        className={
          "text-sm text-right text-muted-foreground px-1 " +
          (sourceAccount ? " visible" : " hidden")
        }
      >
        Balance: {nativeBalance}{" "}
      </FormLabel>
    );
  }

  return (
    <FormLabel
      className={
        "text-sm text-right text-muted-foreground px-1 " +
        (sourceAccount ? " visible" : " hidden")
      }
    >
      Balances: {tokenBalance} {nativeBalance}{" "}
    </FormLabel>
  );
};
