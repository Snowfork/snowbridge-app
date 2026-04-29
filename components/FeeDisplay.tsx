import { formatBalance, formatUsdValue } from "@/utils/formatting";
import { fetchTokenPrices } from "@/utils/coindesk";
import { FC } from "react";
import {
  AssetRegistry,
  ERC20Metadata,
  FeeEstimateError,
  TransferLocation,
} from "@snowbridge/base-types";
import useSWR from "swr";
import { formatUnits } from "ethers";
import {
  BridgeDeliveryFee,
  getDeliverySummaryItems,
  getDeliveryTotals,
} from "@/utils/deliveryFee";

interface FeeDisplayProps {
  token: string;
  displayDecimals: number;
  registry: AssetRegistry;
  source: TransferLocation;
  fee?: BridgeDeliveryFee;
  feeError?: unknown;
  feeLabelTextClassName?: string;
  feeTextClassName?: string;
}

export const FeeDisplay: FC<FeeDisplayProps> = ({
  token,
  displayDecimals,
  registry,
  source,
  fee,
  feeError,
  feeLabelTextClassName,
  feeTextClassName,
}) => {
  const tokenMetadata =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[
      token.toLowerCase()
    ];

  const summaryItems = fee
    ? getDeliverySummaryItems(fee, {
        registry,
        source,
        tokenMetadata,
      })
    : [];
  const totals = fee
    ? getDeliveryTotals(fee, {
        registry,
        source,
        tokenMetadata,
      })
    : [];

  const { data: prices } = useSWR(
    ["fee-token-prices", tokenMetadata, fee, source.key],
    async ([, t]: [string, ERC20Metadata]) => {
      const symbols = new Set<string>([t.symbol]);
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

  if (feeError && !fee) {
    console.error(feeError);
    let message = "Error";
    if (feeError instanceof FeeEstimateError) {
      switch (feeError.details.code) {
        case "AMOUNT_TOO_LOW":
          message = "Send amount too low";
          break;
        case "AMOUNT_TOO_HIGH":
          message = "Send amount too high";
          break;
      }
    }
    if (feeError instanceof TypeError) {
      message = "Invalid send amount";
    }
    return (
      <LayoutRow name="Total Fee">
        <div className="inline text-red-700">{message}...</div>
      </LayoutRow>
    );
  }
  if (!fee) {
    return (
      <LayoutRow name="Total Fee">
        <div className="inline">Fetching...</div>
      </LayoutRow>
    );
  }

  const totalUsd = totals.reduce((acc, item) => {
    const price = prices?.[item.displaySymbol.toUpperCase()];
    if (!price) {
      return acc;
    }
    return acc + Number(formatUnits(item.amount, item.decimals)) * price;
  }, 0);
  const totalSymbols = totals.map((item) => item.displaySymbol).join(" + ");
  const hasSingleTotal = totals.length === 1;
  const total = totals[0];
  const visibleSummaryItems =
    summaryItems.length > 1 ? summaryItems : [];

  return (
    <>
      <LayoutRow
        name="Total Fee"
        feeLabelTextClassName={feeLabelTextClassName}
        feeTextClassName={feeTextClassName}
      >
        <div className="inline">
          {hasSingleTotal && total
            ? `${formatBalance({
                number: total.amount,
                decimals: total.decimals,
                displayDecimals,
              })} ${total.displaySymbol}`
            : totalSymbols}
          {totalUsd > 0 && (
            <span className="text-muted-foreground ml-1">
              ({formatUsdValue(totalUsd)})
            </span>
          )}
        </div>
      </LayoutRow>
      {visibleSummaryItems.map((item, index) => {
        const usd = prices?.[item.displaySymbol.toUpperCase()]
          ? Number(formatUnits(item.amount, item.decimals)) *
            prices[item.displaySymbol.toUpperCase()]
          : null;
        return (
          <LayoutRow
            key={`${item.description}-${item.symbol}-${index}`}
            name={`• ${item.description}`}
            feeLabelTextClassName={feeLabelTextClassName}
            feeTextClassName={feeTextClassName}
          >
            <div className="inline">
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
            </div>
          </LayoutRow>
        );
      })}
    </>
  );
};

function LayoutRow({
  children,
  name,
  feeLabelTextClassName,
  feeTextClassName,
}: Readonly<{
  feeLabelTextClassName?: string;
  feeTextClassName?: string;
  children: React.ReactNode;
  name: string;
}>) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className={feeLabelTextClassName ?? "text-muted-glass"}>{name}</dt>
      <dd className={feeTextClassName ?? "text-primary"}>{children}</dd>
    </div>
  );
}
