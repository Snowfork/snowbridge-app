import { formatBalance, formatUsdValue } from "@/utils/formatting";
import { fetchTokenPrices } from "@/utils/coindesk";
import { FC, useEffect, useState } from "react";
import { AssetRegistry, FeeEstimateError } from "@snowbridge/base-types";
import { FeeInfo } from "@/utils/types";

interface FeeDisplayProps {
  token: string;
  displayDecimals: number;
  registry: AssetRegistry;
  className?: string;
  feeInfo?: FeeInfo;
  feeError?: unknown;
}

export const FeeDisplay: FC<FeeDisplayProps> = ({
  token,
  displayDecimals,
  className,
  registry,
  feeInfo,
  feeError,
}) => {
  const asset =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[
      token.toLowerCase()
    ];
  const [usdValue, setUsdValue] = useState<string | null>(null);

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

  if (feeError && !feeInfo) {
    let message = "Error";
    if (feeError instanceof FeeEstimateError) {
      switch (feeError.details.code) {
        case "AMOUNT_TOO_LOW": {
          message = "Send amount to low";
          break;
        }
        case "AMOUNT_TOO_HIGH": {
          message = "Send amount to high";
          break;
        }
      }
    }
    if (feeError instanceof TypeError) {
      message = "Invalid send amount";
    }
    return <div className={className}>{message}...</div>;
  }
  if (feeInfo === undefined) {
    return <div className={className}>Fetching...</div>;
  }
  const balance = formatBalance({
    number: feeInfo.totalFee,
    decimals: feeInfo.decimals,
    displayDecimals: displayDecimals,
  });
  let acrossFee: string = "";
  let acrossUsdFee: string | undefined;
  if (feeInfo.delivery.kind === "polkadot->ethereum_l2") {
    const acrossBalance = formatBalance({
      number: feeInfo.delivery.l2BridgeFeeInL1Token ?? 0n,
      decimals: asset.decimals,
      displayDecimals: displayDecimals,
    });
    acrossFee = `${acrossBalance} ${asset.symbol} `;
  }

  return (
    <div className={className}>
      {acrossFee}
      {acrossUsdFee && (
        <span className="text-muted-foreground m-1">({acrossUsdFee})</span>
      )}
      {balance} {feeInfo.symbol}
      {usdValue && (
        <span className="text-muted-foreground m-1">({usdValue})</span>
      )}
    </div>
  );
};
