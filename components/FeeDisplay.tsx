import { useBridgeFeeInfo } from "@/hooks/useBridgeFeeInfo";
import { formatBalance } from "@/utils/formatting";
import { environment } from "@snowbridge/api";
import { FC, useEffect } from "react";

interface FeeDisplayProps {
  source: "substrate" | "ethereum";
  destination: environment.TransferLocation;
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
