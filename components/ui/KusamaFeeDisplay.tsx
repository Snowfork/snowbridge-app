import { formatBalance } from "@/utils/formatting";
import { assetsV2 } from "@snowbridge/api";
import { FC, useEffect } from "react";
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
  token
}) => {
  const { data: feeInfo, error } = useKusamaFeeInfo(source, token);
  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);
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
    </div>
  );
};
