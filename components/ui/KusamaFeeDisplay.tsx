import { formatBalance, formatUsdValue } from "@/utils/formatting";
import { fetchTokenPrices } from "@/utils/coindesk";
import { FC } from "react";
import { useKusamaFeeInfo } from "@/hooks/useKusamaFeeInfo";
import useSWR from "swr";
import { formatUnits } from "ethers";
import {
  getKusamaDeliverySummaryItems,
  getKusamaDeliveryTotals,
} from "@/utils/deliveryFee";

interface KusamaFeeDisplayProps {
  source: string;
  token: string;
  displayDecimals: number;
  className?: string;
}

export const KusamaFeeDisplay: FC<KusamaFeeDisplayProps> = ({
  source,
  displayDecimals,
  className,
  token,
}) => {
  const { data: fee, error } = useKusamaFeeInfo(source, token);
  const summaryItems = fee
    ? getKusamaDeliverySummaryItems(fee, {
        source,
      })
    : [];
  const totals = fee
    ? getKusamaDeliveryTotals(fee, {
        source,
      })
    : [];

  const { data: prices } = useSWR(
    ["kusama-fee-token-prices", fee, source],
    async () => {
      const symbols = new Set<string>();
      summaryItems.forEach((item) => symbols.add(item.displaySymbol));
      totals.forEach((item) => symbols.add(item.displaySymbol));
      return await fetchTokenPrices([...symbols]);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60 * 1000,
      refreshInterval: 60 * 1000,
    },
  );

  if (error && !fee) {
    console.error(error);
    return <div className={className}>Error...</div>;
  }
  if (!fee) {
    return <div className={className}>Fetching...</div>;
  }

  const totalUsd = totals.reduce((acc, item) => {
    const price = prices?.[item.displaySymbol.toUpperCase()];
    if (!price) {
      return acc;
    }
    return acc + Number(formatUnits(item.amount, item.decimals)) * price;
  }, 0);
  const singleTotal = totals.length === 1 ? totals[0] : undefined;
  const visibleSummaryItems =
    summaryItems.length > 1 ? summaryItems : [];

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm">
        <dt className="text-muted-glass">Total Fee</dt>
        <dd className="text-primary">
          {singleTotal
            ? `${formatBalance({
                number: singleTotal.amount,
                decimals: singleTotal.decimals,
                displayDecimals,
              })} ${singleTotal.displaySymbol}`
            : totals.map((item) => item.displaySymbol).join(" + ")}
          {totalUsd > 0 && (
            <span className="text-muted-foreground ml-1">
              ({formatUsdValue(totalUsd)})
            </span>
          )}
        </dd>
      </div>
      {visibleSummaryItems.map((item, index) => {
        const usd = prices?.[item.displaySymbol.toUpperCase()]
          ? Number(formatUnits(item.amount, item.decimals)) *
            prices[item.displaySymbol.toUpperCase()]
          : null;
        return (
          <div
            key={`${item.description}-${item.symbol}-${index}`}
            className="flex items-center justify-between text-sm"
          >
            <dt className="text-muted-glass">{`• ${item.description}`}</dt>
            <dd className="text-primary">
              {formatBalance({
                number: item.amount,
                decimals: item.decimals,
                displayDecimals,
              })}{" "}
              {item.displaySymbol}
              {usd !== null && (
                <span className="text-muted-foreground ml-1">
                  ({formatUsdValue(usd)})
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </div>
  );
};
