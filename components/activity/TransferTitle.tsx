import type { Transfer } from "@/store/transferActivity";
import {
  formatBalance,
  formatShortDate,
  truncateAmount,
} from "@/utils/formatting";
import { parseUnits } from "ethers";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { useContext, useState } from "react";
import { BridgeInfoContext } from "@/app/providers";
import type {
  AssetRegistry,
  ERC20Metadata,
  TransferLocation,
} from "@snowbridge/base-types";
import Image from "next/image";
import { getTransferLocation } from "@snowbridge/registry";
import { chainName } from "@/utils/chainNames";
import { inferTransferDetails } from "@/utils/inferTransferType";

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
  const { registry: assetRegistry } = useContext(BridgeInfoContext)!;
  const [tokenImageError, setTokenImageError] = useState(false);
  const [destImageError, setDestImageError] = useState(false);

  const { destination } = inferTransferDetails(transfer, assetRegistry);
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
      alt={chainName(destination)}
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
        <span className="truncate">{chainName(destination)}</span>
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
        <span className="truncate">{chainName(destination)}</span>
        <span className="text-muted-foreground text-xs ml-1 hidden sm:inline">
          {shortDate}
        </span>
      </p>
    </div>
  );
}
