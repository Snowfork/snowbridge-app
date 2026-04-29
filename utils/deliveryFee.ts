import type { AssetRegistry, ERC20Metadata, TransferLocation } from "@snowbridge/base-types";
import type {
  FeeAsset,
  forKusama,
  forInterParachain,
  toEthereumV2,
  toPolkadotSnowbridgeV2,
  toPolkadotV2,
} from "@snowbridge/api";

export type BridgeDeliveryFee =
  | toEthereumV2.DeliveryFee
  | toPolkadotV2.DeliveryFee
  | toPolkadotSnowbridgeV2.DeliveryFee
  | forInterParachain.DeliveryFee;

export type KusamaDeliveryFee = forKusama.DeliveryFee;

export type ResolvedFeeAsset = FeeAsset & {
  decimals: number;
  displaySymbol: string;
};

type DeliveryFeeContext = {
  registry: AssetRegistry;
  source: TransferLocation;
  tokenMetadata?: ERC20Metadata;
};

export function resolveFeeAsset(
  asset: FeeAsset,
  context: DeliveryFeeContext,
): ResolvedFeeAsset {
  switch (asset.symbol) {
    case "ETH":
      return { ...asset, decimals: 18, displaySymbol: "ETH" };
    case "DOT":
      return {
        ...asset,
        decimals: context.registry.relaychain.tokenDecimals ?? 0,
        displaySymbol: context.registry.relaychain.tokenSymbols ?? "DOT",
      };
    case "NATIVE":
      return {
        ...asset,
        decimals: context.source.parachain?.info.tokenDecimals ?? 0,
        displaySymbol: context.source.parachain?.info.tokenSymbols ?? "NATIVE",
      };
    default:
      if (
        context.tokenMetadata &&
        asset.symbol.toUpperCase() === context.tokenMetadata.symbol.toUpperCase()
      ) {
        return {
          ...asset,
          decimals: context.tokenMetadata.decimals,
          displaySymbol: context.tokenMetadata.symbol,
        };
      }
      return { ...asset, decimals: 18, displaySymbol: asset.symbol };
  }
}

export function getDeliveryTotals(
  delivery: BridgeDeliveryFee,
  context: DeliveryFeeContext,
): ResolvedFeeAsset[] {
  return delivery.totals.map((asset) => resolveFeeAsset(asset, context));
}

export function getDeliverySummaryItems(
  delivery: BridgeDeliveryFee,
  context: DeliveryFeeContext,
) {
  return delivery.summary.map((item) => ({
    ...item,
    ...resolveFeeAsset(item, context),
  }));
}

export function getDeliveryTotalByDisplaySymbol(
  delivery: BridgeDeliveryFee,
  displaySymbol: string,
  context: DeliveryFeeContext,
): ResolvedFeeAsset | undefined {
  return getDeliveryTotals(delivery, context).find(
    (item) => item.displaySymbol.toUpperCase() === displaySymbol.toUpperCase(),
  );
}

type KusamaFeeContext = {
  source: string;
};

export function resolveKusamaFeeAsset(
  asset: FeeAsset,
  context: KusamaFeeContext,
): ResolvedFeeAsset {
  if (asset.symbol === "DOT" || context.source === "polkadotAssetHub") {
    return { ...asset, decimals: 10, displaySymbol: "DOT" };
  }
  if (asset.symbol === "KSM" || context.source === "kusamaAssetHub") {
    return { ...asset, decimals: 12, displaySymbol: "KSM" };
  }
  return { ...asset, decimals: 12, displaySymbol: asset.symbol };
}

export function getKusamaDeliveryTotals(
  delivery: KusamaDeliveryFee,
  context: KusamaFeeContext,
): ResolvedFeeAsset[] {
  return delivery.totals.map((asset) => resolveKusamaFeeAsset(asset, context));
}

export function getKusamaDeliverySummaryItems(
  delivery: KusamaDeliveryFee,
  context: KusamaFeeContext,
) {
  return delivery.summary.map((item) => ({
    ...item,
    ...resolveKusamaFeeAsset(item, context),
  }));
}

export function getKusamaDeliveryTotalByDisplaySymbol(
  delivery: KusamaDeliveryFee,
  displaySymbol: string,
  context: KusamaFeeContext,
): ResolvedFeeAsset | undefined {
  return getKusamaDeliveryTotals(delivery, context).find(
    (item) => item.displaySymbol.toUpperCase() === displaySymbol.toUpperCase(),
  );
}
