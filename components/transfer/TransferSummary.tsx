import { FC, useState, useEffect } from "react";
import { ValidationData } from "@/utils/types";
import { etherscanAddressLink, subscanAccountLink } from "@/lib/explorerLinks";
import {
  estimateDelivery,
  useEstimatedDelivery,
} from "@/hooks/useEstimatedDelivery";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { formatBalance } from "@/utils/formatting";
import { inferTransferType } from "@/utils/inferTransferType";
import { fetchTokenPrices } from "@/utils/coindesk";
import Image from "next/image";
import { ImageWithFallback } from "../ui/image-with-fallback";

interface TransferSummaryProps {
  data: ValidationData;
  executionFee: bigint | null;
}

export const TransferSummary: FC<TransferSummaryProps> = ({
  data,
  executionFee,
}) => {
  const { data: deliveryLatency, error: latencyError } = useEstimatedDelivery();
  let sourceAccountDisplay = data.formData.sourceAccount;
  let beneficiaryDisplay = data.formData.beneficiary;
  let sourceAccountLink: string;
  let beneficiaryLink: string;
  if (data.source.id === "ethereum") {
    if (data.destination.parachain?.info.accountType === "AccountId32") {
      beneficiaryDisplay = encodeAddress(
        decodeAddress(beneficiaryDisplay),
        data.destination.parachain?.info.ss58Format ??
          data.assetRegistry.relaychain.ss58Format,
      );
    }
    sourceAccountLink = etherscanAddressLink(
      data.assetRegistry.environment,
      data.assetRegistry.ethChainId,
      sourceAccountDisplay,
    );
    beneficiaryLink = subscanAccountLink(
      data.assetRegistry.environment,
      data.destination.parachain!.parachainId,
      beneficiaryDisplay,
    );
  } else {
    if (data.source.parachain?.info.accountType === "AccountId32") {
      sourceAccountDisplay = encodeAddress(
        decodeAddress(sourceAccountDisplay),
        data.source.parachain?.info.ss58Format ??
          data.assetRegistry.relaychain.ss58Format,
      );
    }
    sourceAccountLink = subscanAccountLink(
      data.assetRegistry.environment,
      data.source.parachain!.parachainId,
      sourceAccountDisplay,
    );
    beneficiaryLink = etherscanAddressLink(
      data.assetRegistry.environment,
      data.assetRegistry.ethChainId,
      data.formData.beneficiary,
    );
  }

  let sourceTokenSymbol: string | null = null;
  let sourceTokenDecimals: number | null = null;
  switch (data.source.type) {
    case "ethereum":
      sourceTokenSymbol = "ETH";
      sourceTokenDecimals = 18;
      break;
    case "substrate":
      sourceTokenSymbol = data.source.parachain?.info.tokenSymbols ?? null;
      sourceTokenDecimals = data.source.parachain?.info.tokenDecimals ?? null;
      break;
  }
  const transferType = inferTransferType(data.source, data.destination);

  // Fetch USD prices for tokens
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const symbols = new Set<string>();
    symbols.add(data.tokenMetadata.symbol);
    symbols.add(data.fee.symbol);
    if (sourceTokenSymbol) symbols.add(sourceTokenSymbol);

    const fetchPrices = async () => {
      const priceData = await fetchTokenPrices([...symbols]);
      setPrices(priceData);
    };

    fetchPrices();
  }, [data.tokenMetadata.symbol, data.fee.symbol, sourceTokenSymbol]);

  // Helper to calculate USD value
  const getUsdValue = (amount: number, symbol: string): string | null => {
    const price = prices[symbol.toUpperCase()];
    if (!price) return null;
    const usd = amount * price;
    return `$${usd.toFixed(2)}`;
  };

  // Calculate USD values
  const transferAmountUsd = getUsdValue(
    Number(data.formData.amount),
    data.tokenMetadata.symbol,
  );

  const deliveryFeeUsd = getUsdValue(
    Number(data.fee.fee) / Math.pow(10, data.fee.decimals),
    data.fee.symbol,
  );

  const executionFeeUsd =
    executionFee && sourceTokenSymbol && sourceTokenDecimals
      ? getUsdValue(
          Number(executionFee) / Math.pow(10, sourceTokenDecimals),
          sourceTokenSymbol,
        )
      : null;

  const totalAmountUsd =
    data.tokenMetadata.symbol === data.fee.symbol &&
    data.fee.symbol === sourceTokenSymbol
      ? getUsdValue(
          Number(
            data.amountInSmallestUnit + data.fee.fee + (executionFee ?? 0n),
          ) / Math.pow(10, data.tokenMetadata.decimals),
          data.tokenMetadata.symbol,
        )
      : null;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm my-2 glass-pill p-2 flex items-center justify-center gap-1 flex-wrap">
        Send{" "}
        <ImageWithFallback
          src={`/images/${data.tokenMetadata.symbol.toLowerCase()}.png`}
          fallbackSrc="/images/token_generic.png"
          width={20}
          height={20}
          alt={data.tokenMetadata.symbol}
          className="inline-block rounded-full"
        />
        <span className={"font-bold"}>
          {data.formData.amount} {data.tokenMetadata.symbol}
        </span>{" "}
        from{" "}
        <Image
          src={`/images/${data.source.id.toLowerCase()}.png`}
          width={20}
          height={20}
          alt={data.source.name}
          className="inline-block rounded-full"
        />
        {data.source.name} to{" "}
        <Image
          src={`/images/${data.destination.id.toLowerCase()}.png`}
          width={20}
          height={20}
          alt={data.destination.name}
          className="inline-block rounded-full"
        />
        {data.destination.name}
      </span>

      {/* Sender & Recipient Card */}
      <div className="glass-sub p-4 space-y-3">
        <h3 className="text-primary font-bold text-l">Sender & Recipient</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">From</span>
          <span
            onClick={() => window.open(sourceAccountLink)}
            className="hover:underline cursor-pointer flex items-center gap-2"
          >
            <Image
              src={`/images/${data.source.id.toLowerCase()}.png`}
              width={16}
              height={16}
              alt={data.source.name}
              className="rounded-full"
            />
            {sourceAccountDisplay}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">To</span>
          <span
            onClick={() => window.open(beneficiaryLink)}
            className="hover:underline cursor-pointer flex items-center gap-2"
          >
            <Image
              src={`/images/${data.destination.id.toLowerCase()}.png`}
              width={16}
              height={16}
              alt={data.destination.name}
              className="rounded-full"
            />
            {beneficiaryDisplay}
          </span>
        </div>
      </div>

      {/* Amounts & Fees Card */}
      <div className="glass-sub p-4 space-y-3">
        <h3 className="text-primary font-bold text-l">Fees</h3>
        {data.tokenMetadata.symbol === data.fee.symbol &&
          data.fee.symbol === sourceTokenSymbol && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Amount</span>
              <span>
                {formatBalance({
                  number:
                    data.amountInSmallestUnit +
                    data.fee.fee +
                    (executionFee ?? 0n),
                  decimals: data.tokenMetadata.decimals,
                })}{" "}
                {data.tokenMetadata.symbol}
                {totalAmountUsd && (
                  <span className="text-muted-foreground ml-1">
                    ({totalAmountUsd})
                  </span>
                )}
              </span>
            </div>
          )}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Transfer Amount</span>
          <span>
            {data.formData.amount} {data.tokenMetadata.symbol}
            {transferAmountUsd && (
              <span className="text-muted-foreground ml-1">
                ({transferAmountUsd})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Execution Fee</span>
          <span>
            {executionFee && sourceTokenSymbol && sourceTokenDecimals
              ? formatBalance({
                  number: executionFee,
                  decimals: sourceTokenDecimals,
                }) + ` ${sourceTokenSymbol}`
              : "Calculating..."}
            {executionFeeUsd && (
              <span className="text-muted-foreground ml-1">
                ({executionFeeUsd})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Delivery Fee</span>
          <span>
            {formatBalance({
              number: data.fee.fee,
              decimals: data.fee.decimals,
            })}{" "}
            {data.fee.symbol}
            {deliveryFeeUsd && (
              <span className="text-muted-foreground ml-1">
                ({deliveryFeeUsd})
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="glass-sub p-4 space-y-3">
        <h3 className="text-primary font-bold text-l">Delivery</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Estimated Delivery</span>
          <span>
            {deliveryLatency === null
              ? "Calculating..."
              : latencyError
                ? "Could not estimate"
                : estimateDelivery(
                    data.source,
                    data.destination,
                    deliveryLatency,
                  )}
            <span className="text-muted-foreground">
              {" "}
              (up to{" "}
              {transferType === "toPolkadotV2"
                ? "25 min"
                : transferType === "toEthereumV2"
                  ? "1h 30min"
                  : transferType === "forInterParachain"
                    ? "5 min"
                    : "unknown"}
              )
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
