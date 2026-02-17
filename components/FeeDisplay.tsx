import { formatBalance, formatUsdValue } from "@/utils/formatting";
import { fetchTokenPrices } from "@/utils/coindesk";
import { FC } from "react";
import {
  AssetRegistry,
  ERC20Metadata,
  FeeEstimateError,
} from "@snowbridge/base-types";
import { FeeInfo } from "@/utils/types";
import useSWR from "swr";
import { formatUnits } from "ethers";

interface FeeDisplayProps {
  token: string;
  displayDecimals: number;
  registry: AssetRegistry;
  feeInfo?: FeeInfo;
  feeError?: unknown;
  feeLabelTextClassName?: string;
  feeTextClassName?: string;
}

export const FeeDisplay: FC<FeeDisplayProps> = ({
  token,
  displayDecimals,
  registry,
  feeInfo,
  feeError,
  feeLabelTextClassName,
  feeTextClassName,
}) => {
  const asset =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[
      token.toLowerCase()
    ];

  const { data: prices } = useSWR(
    ["fee-info-token-prices", asset, feeInfo],
    async ([, t, f]: [string, ERC20Metadata, FeeInfo]) => {
      return await fetchTokenPrices([t.symbol, f?.symbol]);
    },
    {
      fallbackData: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60 * 1000,
      refreshInterval: 60 * 1000,
    },
  );

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
    return (
      <LayoutRow name="Delivery Fee">
        <div className="inline  text-red-700">{message}...</div>
      </LayoutRow>
    );
  }
  if (feeInfo === undefined) {
    return (
      <LayoutRow name="Delivery Fee">
        <div className="inline">Fetching...</div>
      </LayoutRow>
    );
  }
  const feeUsd =
    Number(formatUnits(feeInfo.totalFee, feeInfo.decimals)) *
    (prices && prices[feeInfo.symbol] ? prices[feeInfo.symbol] : 0);
  if (
    feeInfo.delivery.kind === "polkadot->ethereum_l2" ||
    feeInfo.delivery.kind === "ethereum_l2->polkadot"
  ) {
    let acrossFee = 0n;
    if (feeInfo.delivery.kind === "polkadot->ethereum_l2") {
      acrossFee = feeInfo.delivery.l2BridgeFeeInL1Token ?? 0n;
    } else if (feeInfo.delivery.kind === "ethereum_l2->polkadot") {
      acrossFee =
        (feeInfo.delivery.swapFeeInL1Token ?? 0n) +
        (feeInfo.delivery.bridgeFeeInL2Token ?? 0n);
    }
    let acrossUsdFee: number =
      Number(formatUnits(acrossFee, asset.decimals)) *
      (prices && prices[asset.symbol] ? prices[asset.symbol] : 0);

    let totalFeeUsd = acrossUsdFee + feeUsd;
    let snowbridgeUsdFee = feeUsd;
    let totalFee = feeInfo.totalFee;
    let totalFeeFmt = `${asset.symbol} + ${feeInfo.symbol} `;
    if (asset.symbol === feeInfo.symbol) {
      totalFee = feeInfo.totalFee - acrossFee;
      totalFeeUsd = feeUsd;
      snowbridgeUsdFee = feeUsd - acrossUsdFee;
      totalFeeFmt = `${formatBalance({
        number: feeInfo.totalFee,
        decimals: feeInfo.decimals,
        displayDecimals: displayDecimals,
      })} ${feeInfo.symbol}`;
    }
    return (
      <>
        <LayoutRow
          name="Delivery Fee"
          feeLabelTextClassName={feeLabelTextClassName}
          feeTextClassName={feeTextClassName}
        >
          <div className="inline">
            {totalFeeFmt}
            {prices && prices[feeInfo.symbol] && (
              <span className="text-muted-foreground ml-1">
                ({formatUsdValue(totalFeeUsd)})
              </span>
            )}
          </div>
        </LayoutRow>
        <LayoutRow
          name="• Snowbridge Fee"
          feeLabelTextClassName={feeLabelTextClassName}
          feeTextClassName={feeTextClassName}
        >
          <div className="inline">
            {formatBalance({
              number: totalFee,
              decimals: feeInfo.decimals,
              displayDecimals: displayDecimals,
            })}{" "}
            {feeInfo.symbol}
            {prices && prices[feeInfo.symbol] && (
              <span className="text-muted-foreground ml-1">
                ({formatUsdValue(snowbridgeUsdFee)})
              </span>
            )}
          </div>
        </LayoutRow>
        <LayoutRow
          name="• Across.to Fee"
          feeLabelTextClassName={feeLabelTextClassName}
          feeTextClassName={feeTextClassName}
        >
          <div className="inline">
            {`${formatBalance({
              number: acrossFee,
              decimals: asset.decimals,
              displayDecimals: displayDecimals,
            })} ${asset.symbol} `}
            <span className="text-muted-foreground ml-1 justify-end">
              ({formatUsdValue(acrossUsdFee)})
            </span>
          </div>
        </LayoutRow>
      </>
    );
  } else {
    return (
      <>
        <LayoutRow
          name="Delivery Fee"
          feeLabelTextClassName={feeLabelTextClassName}
          feeTextClassName={feeTextClassName}
        >
          <div className="inline">
            {formatBalance({
              number: feeInfo.totalFee,
              decimals: feeInfo.decimals,
              displayDecimals: displayDecimals,
            })}{" "}
            {feeInfo.symbol}
            {prices && prices[feeInfo.symbol] && (
              <span className="text-muted-foreground ml-1">
                ({formatUsdValue(feeUsd)})
              </span>
            )}
          </div>
        </LayoutRow>{" "}
      </>
    );
  }
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
    <>
      <div className="flex items-center justify-between text-sm">
        <dt className={feeLabelTextClassName ?? "text-muted-glass"}>{name}</dt>
        <dd className={feeTextClassName ?? "text-primary"}>{children}</dd>
      </div>
    </>
  );
}
