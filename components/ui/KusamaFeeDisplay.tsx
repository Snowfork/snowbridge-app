import { formatBalance } from "@/utils/formatting";
import { fetchTokenPrices } from "@/utils/coindesk";
import { FC, useEffect, useState } from "react";
import { useKusamaFeeInfo } from "@/hooks/useKusamaFeeInfo";

interface KusamaFeeDisplayProps {
  source: string;
  destination: string;
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
  const { data: feeInfo, error } = useKusamaFeeInfo(source, token);
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
            Number(feeInfo.fee) / Math.pow(10, feeInfo.decimals);
          const usdAmount = feeInTokens * price;
          setUsdValue(`$${usdAmount.toFixed(2)}`);
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
    number: feeInfo.fee,
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
