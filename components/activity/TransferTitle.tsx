import { Transfer } from "@/store/transferActivity";
import { assetsV2, historyV2 } from "@snowbridge/api";
import { LucideGlobe } from "lucide-react";
import { formatBalance } from "@/utils/formatting";
import { parseUnits } from "ethers";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { useContext, useState } from "react";
import { RegistryContext } from "@/app/providers";
import { AssetRegistry, ERC20Metadata } from "@snowbridge/base-types";
import Image from "next/image";

export function getChainIdentifiers(
  transfer: Transfer,
  registry: AssetRegistry,
) {
  switch (transfer.sourceType as string) {
    case "kusama": {
      const tx = transfer as historyV2.ToPolkadotTransferResult;
      return {
        sourceType: transfer.sourceType,
        destinationType: "kusama",
        sourceId:
          tx.info.sourceParachain?.toString() ??
          registry.assetHubParaId.toString(),
        destinationId:
          tx.info.destinationParachain?.toString() ??
          registry.assetHubParaId.toString(),
        sourceNetwork: tx.info.destinationNetwork ?? "kusama",
        destinationNetwork: tx.info.destinationNetwork ?? "kusama",
      };
    }
    case "ethereum": {
      const tx = transfer as historyV2.ToPolkadotTransferResult;
      return {
        sourceType: transfer.sourceType,
        destinationType: "substrate",
        sourceId: registry.ethChainId.toString(),
        destinationId:
          tx.info.destinationParachain?.toString() ??
          registry.assetHubParaId.toString(),
      };
    }
    case "substrate": {
      if (transfer.info.destinationParachain) {
        const tx = transfer as historyV2.InterParachainTransfer;
        return {
          sourceType: transfer.sourceType,
          destinationType: transfer.sourceType,
          sourceId: tx.submitted.sourceParachainId.toString(),
          destinationId: transfer.info.destinationParachain.toString(),
        };
      } else {
        const tx = transfer as historyV2.ToEthereumTransferResult;
        return {
          sourceType: transfer.sourceType,
          destinationType: "ethereum",
          sourceId: tx.submitted.sourceParachainId.toString(),
          destinationId: registry.ethChainId.toString(),
        };
      }
    }
  }
  return null;
}

export function getEnvDetail(transfer: Transfer, registry: AssetRegistry) {
  const id = getChainIdentifiers(transfer, registry);
  if (!id) {
    console.error("Unknown transfer", transfer);
    throw Error(`Unknown transfer type ${transfer.sourceType}`);
  }
  if (id.sourceType === "kusama") {
    const source = assetsV2.getTransferLocationKusama(
      registry,
      transfer.info.sourceNetwork!,
      id.sourceId,
    );
    const destination = assetsV2.getTransferLocationKusama(
      registry,
      transfer.info.destinationNetwork!,
      id.destinationId,
    );
    return { source, destination };
  } else {
    const source = assetsV2.getTransferLocation(
      registry,
      id.sourceType,
      id.sourceId,
    );
    const destination = assetsV2.getTransferLocation(
      registry,
      id.destinationType,
      id.destinationId,
    );
    return { source, destination };
  }
}

export function formatTokenData(
  transfer: Transfer,
  assetErc20MetaData: { [token: string]: ERC20Metadata },
  displayDecimals?: number,
) {
  const tokenAddress = transfer.info.tokenAddress.toLowerCase();
  let amount = transfer.info.amount;
  let tokenConfig =
    assetErc20MetaData[transfer.info.tokenAddress.toLowerCase()];
  let tokenName = tokenConfig?.name;
  const metaData =
    tokenAddress in assetErc20MetaData
      ? assetErc20MetaData[tokenAddress]
      : null;
  if (metaData !== null) {
    amount = formatBalance({
      number: parseUnits(transfer.info.amount, 0),
      decimals: Number(metaData.decimals),
      displayDecimals: displayDecimals ?? Number(metaData.decimals),
    });
    tokenName = metaData.symbol;
  }
  return { tokenName, amount };
}

interface TransferTitleProps {
  transfer: Transfer;
  showBagde?: boolean;
  showGlobeForGlobal?: boolean;
}

export function TransferTitle({
  transfer,
  showBagde,
  showGlobeForGlobal,
}: TransferTitleProps) {
  const assetRegistry = useContext(RegistryContext)!;
  const [tokenImageError, setTokenImageError] = useState(false);
  const [destImageError, setDestImageError] = useState(false);

  const { destination } = getEnvDetail(transfer, assetRegistry);
  const when = new Date(transfer.info.when);
  const shortDate =
    when.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }) +
    " " +
    when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const { tokenName, amount: rawAmount } = formatTokenData(
    transfer,
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets,
  );

  // Truncate amount if more than 10 characters after decimal
  const truncateAmount = (amt: string): string => {
    const parts = amt.split(".");
    if (parts.length === 2 && parts[1].length > 10) {
      return parts[0] + "." + parts[1].slice(0, 10) + "…";
    }
    return amt;
  };
  const amount = truncateAmount(rawAmount);

  const tokenIcon = (
    <Image
      src={
        tokenImageError
          ? "/images/token_generic.png"
          : `/images/${(tokenName ?? "token_generic").toLowerCase()}.png`
      }
      width={18}
      height={18}
      alt={tokenName ?? "token"}
      className="inline-block rounded-full w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]"
      onError={() => setTokenImageError(true)}
    />
  );

  const destIcon = (
    <Image
      src={
        destImageError
          ? "/images/parachain_generic.png"
          : `/images/${(destination?.id ?? "parachain_generic").toLowerCase()}.png`
      }
      width={18}
      height={18}
      alt={destination?.name ?? "destination"}
      className="inline-block rounded-full w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]"
      onError={() => setDestImageError(true)}
    />
  );

  if (!(showBagde ?? true)) {
    return (
      <span className="flex items-center gap-1 col-span-6 place-self-start text-left text-sm">
        {showGlobeForGlobal && (
          <LucideGlobe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground mr-1" />
        )}
        {tokenIcon}
        <span className="truncate">
          {amount} {tokenName ?? "unknown"}
        </span>
        <span className="text-muted-foreground">→</span>
        {destIcon}
        <span className="truncate">{destination?.name ?? "unknown"}</span>
        <span className="text-muted-foreground text-xs ml-1 hidden sm:inline">
          {shortDate}
        </span>
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2 w-full">
      <TransferStatusBadge
        className={!(showBagde ?? true) ? "hidden" : ""}
        transfer={transfer}
      />
      {showGlobeForGlobal && (
        <LucideGlobe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
      )}
      <p className="flex-1 text-left flex items-center gap-1 text-sm">
        {tokenIcon}
        <span className="truncate">
          {amount} {tokenName ?? "unknown"}
        </span>
        <span className="text-muted-foreground">→</span>
        {destIcon}
        <span className="truncate">{destination?.name ?? "unknown"}</span>
        <span className="text-muted-foreground text-xs ml-1 hidden sm:inline">
          {shortDate}
        </span>
      </p>
    </div>
  );
}
