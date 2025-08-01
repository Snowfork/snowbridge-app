import { Transfer } from "@/store/transferHistory";
import { assetsV2, historyV2 } from "@snowbridge/api";
import { LucideGlobe, LucideWallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBalance } from "@/utils/formatting";
import { parseUnits } from "ethers";
import { TransferStatusBadge } from "./TransferStatusBadge";
import { useContext } from "react";
import { RegistryContext } from "@/app/providers";
import { AssetRegistry, ERC20Metadata } from "@snowbridge/base-types";

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
  showWallet?: boolean;
  showBagde?: boolean;
}

export function TransferTitle({
  transfer,
  showWallet,
  showBagde,
}: TransferTitleProps) {
  const assetRegistry = useContext(RegistryContext)!;

  const { destination } = getEnvDetail(transfer, assetRegistry);
  const when = new Date(transfer.info.when);

  const { tokenName, amount } = formatTokenData(
    transfer,
    assetRegistry.ethereumChains[assetRegistry.ethChainId].assets,
  );

  if (!(showWallet ?? true) && !(showBagde ?? true)) {
    return (
      <span className="block col-span-6 place-self-start text-left">
        {amount +
          " " +
          (tokenName ?? "unknown") +
          " to " +
          (destination?.name ?? "unknown") +
          " on " +
          when.toLocaleString()}
      </span>
    );
  }
  return (
    <div className="grid grid-cols-8 justify-stretch w-full">
      <TransferStatusBadge
        className={!(showBagde ?? true) ? "hidden" : "ml-8"}
        transfer={transfer}
      />
      <div
        className={cn(
          "flex px-4 mr-2 col-span-1 w-full place-content-center",
          !(showWallet ?? true) ? "hidden" : "",
        )}
      >
        {transfer.isWalletTransaction ? <LucideWallet /> : <LucideGlobe />}
      </div>
      <p className="col-span-6 place-self-start text-left">
        {amount +
          " " +
          (tokenName ?? "unknown") +
          " to " +
          (destination?.name ?? "unknown") +
          " on " +
          when.toLocaleString()}
      </p>
    </div>
  );
}
