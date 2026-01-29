import type { Transfer } from "@/store/transferActivity";
import {
  formatBalance,
  formatShortDate,
  truncateAmount,
} from "@/utils/formatting";
import { parseUnits } from "ethers";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { useContext, useState } from "react";
import { RegistryContext } from "@/app/providers";
import type {
  AssetRegistry,
  ChainKind,
  ERC20Metadata,
} from "@snowbridge/base-types";
import Image from "next/image";
import { getTransferLocation } from "@snowbridge/registry";

export function getChainIdentifiers(
  transfer: Transfer,
  registry: AssetRegistry,
) {
  switch (transfer.kind) {
    case "kusama": {
      const tx = transfer;
      return {
        sourceType: transfer.kind,
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
      const tx = transfer;
      return {
        sourceType: transfer.kind,
        destinationType: "substrate",
        sourceId: registry.ethChainId.toString(),
        destinationId:
          tx.info.destinationParachain?.toString() ??
          registry.assetHubParaId.toString(),
      };
    }
    case "polkadot": {
      if (transfer.info.destinationParachain) {
        const tx = transfer;
        return {
          sourceType: transfer.kind,
          destinationType: transfer.kind,
          sourceId: tx.submitted.sourceParachainId.toString(),
          destinationId: transfer.info.destinationParachain.toString(),
        };
      } else {
        const tx = transfer;
        return {
          sourceType: transfer.kind,
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
    throw Error(`Unknown transfer type ${transfer.kind}`);
  }
  if (id.sourceType === "kusama") {
    const source = getTransferLocation(registry, {
      kind: transfer.info.sourceNetwork! as ChainKind,
      id: Number(id.sourceId),
    });
    const destination = getTransferLocation(registry, {
      kind: transfer.info.destinationNetwork! as ChainKind,
      id: Number(id.destinationId),
    });
    return { source, destination };
  } else {
    const source = getTransferLocation(registry, {
      kind: id.sourceType,
      id: Number(id.sourceId),
    });
    const destination = getTransferLocation(registry, {
      kind: id.destinationType as ChainKind,
      id: Number(id.destinationId),
    });
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
}

export function TransferTitle({ transfer, showBagde }: TransferTitleProps) {
  const assetRegistry = useContext(RegistryContext)!;
  const [tokenImageError, setTokenImageError] = useState(false);
  const [destImageError, setDestImageError] = useState(false);

  const { destination } = getEnvDetail(transfer, assetRegistry);
  const shortDate = formatShortDate(new Date(transfer.info.when));

  const { tokenName, amount: rawAmount } = formatTokenData(
    transfer,
    assetRegistry.ethereumChains[`ethereum_${assetRegistry.ethChainId}`].assets,
  );
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
          : `/images/${destination.key ?? "parachain_generic"}.png`
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
