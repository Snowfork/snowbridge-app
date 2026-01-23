import { useBridgeFeeInfo } from "@/hooks/useBridgeFeeInfo";
import { formatBalance, formatUsdValue } from "@/utils/formatting";
import { fetchTokenPrices } from "@/utils/coindesk";
import { FC, useEffect, useState } from "react";
import { TransferLocation } from "@snowbridge/base-types";

interface FeeDisplayProps {
  source: TransferLocation;
  destination: TransferLocation;
  token: string;
  displayDecimals: number;
  className?: string;
}

export const FeeDisplay: FC<FeeDisplayProps> = ({
  source,
  destination,
  token,
  displayDecimals,
  className,
}) => {
  const { data: feeInfo, error } = useBridgeFeeInfo(source, destination, token);
  const [usdValue, setUsdValue] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (!feeInfo) {
      setUsdValue(null);
      return;
    }

    const fetchPrice = async () => {
      try {
        const prices = await fetchTokenPrices([feeInfo.symbol]);
        const price = prices[feeInfo.symbol.toUpperCase()];
        if (price) {
          const feeInTokens =
            Number(feeInfo.totalFee) / Math.pow(10, feeInfo.decimals);
          const usdAmount = feeInTokens * price;
          setUsdValue(formatUsdValue(usdAmount));
        } else {
          setUsdValue(null);
        }
      } catch {
        setUsdValue(null);
      }
    };

    fetchPrice();
  }, [feeInfo]);

  if (error && !feeInfo) {
    return <div className={className}>Error...</div>;
  }
  if (feeInfo === undefined) {
    return <div className={className}>Fetching...</div>;
  }
  const balance = formatBalance({
    number: feeInfo.totalFee,
    decimals: feeInfo.decimals,
    displayDecimals: displayDecimals,
  });

  return (
    <div className={className}>
      {balance} {feeInfo.symbol}
      {usdValue && (
        <span className="text-muted-foreground ml-1">({usdValue})</span>
      )}
    </div>
  );
};
