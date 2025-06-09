"use client";
import { assets, assetsV2, Context } from "@snowbridge/api";
import { paraImplementation } from "@snowbridge/api/dist/parachains";
import { formatBalance } from "@/utils/formatting";
import { ApiPromise } from "@polkadot/api";
import {
  AssetHub,
  DOT_DECIMALS,
  DOT_SYMBOL,
  KSM_DECIMALS,
  KSM_SYMBOL,
  RemoteAssetId,
} from "./types";
import { Option } from "@polkadot/types";
import { AssetBalance } from "@polkadot/types/interfaces";

interface TokenBalanceProps {
  context: Context;
  token: string;
  source: assetsV2.TransferLocation;
  destination: assetsV2.TransferLocation;
  registry: assetsV2.AssetRegistry;
  sourceAccount: string;
}

interface TokenBalanceKusamaProps {
  context: Context;
  token: string;
  source: string;
  registry: assetsV2.AssetRegistry;
  sourceAccount: string;
}

export async function getTokenBalance({
  context,
  token,
  source,
  destination,
  registry,
  sourceAccount,
}: TokenBalanceProps): Promise<{
  balance: bigint;
  isNativeTransfer: boolean;
  gatewayAllowance?: bigint;
  nativeBalance: bigint;
  nativeSymbol: string;
  nativeTokenDecimals: number;
  hasDotBalance: boolean;
  dotBalance: bigint;
  dotTokenSymbol: string;
  dotTokenDecimals: number;
}> {
  if (destination.type === "ethereum") {
    const para = source.parachain!;
    const parachain = para && context.hasParachain(para.parachainId)
      ? await context.parachain(para.parachainId)
      : await context.assetHub();

    const sourceParaId = para.parachainId;
    const sourceParachain = registry.parachains[sourceParaId];
    const sourceAssetMetadata = sourceParachain &&
      sourceParachain.assets[token.toLowerCase()];
    if (!sourceAssetMetadata) {
      throw Error(
        `Token ${token} not registered on source parachain ${sourceParaId}.`,
      );
    }
    const paraImp = await paraImplementation(parachain);
    let balance: any;
    // For DOT on AH, get it from the native balance pallet.
    if (
      sourceParaId == registry.assetHubParaId &&
      sourceAssetMetadata.location?.parents == 1 &&
      sourceAssetMetadata.location?.interior == "Here"
    ) {
      balance = await paraImp.getNativeBalance(sourceAccount);
    } else {
      balance = await paraImp.getTokenBalance(
        sourceAccount,
        registry.ethChainId,
        token,
        sourceAssetMetadata,
      );
    }
    let dotBalance;
    if (sourceParachain.features.hasDotBalance) {
      dotBalance = await paraImp.getDotBalance(
        sourceAccount,
      );
    }
    const nativeBalance = await paraImp.getNativeBalance(
      sourceAccount,
    );

    return {
      balance: balance ?? 0n,
      gatewayAllowance: undefined,
      isNativeTransfer: false,
      nativeBalance,
      nativeTokenDecimals: para.info.tokenDecimals,
      nativeSymbol: para.info.tokenSymbols,
      hasDotBalance: sourceParachain.features.hasDotBalance,
      dotBalance: dotBalance ?? 0n,
      dotTokenDecimals: registry.relaychain.tokenDecimals,
      dotTokenSymbol: registry.relaychain.tokenSymbols,
    };
  } else if (destination.type === "substrate") {
    const nativeBalance = await context.ethereum().getBalance(sourceAccount);
    let erc20Asset: { balance: bigint; gatewayAllowance?: bigint } = {
      balance: nativeBalance,
    };
    let isNativeTransfer = true;
    if (token !== assetsV2.ETHER_TOKEN_ADDRESS) {
      erc20Asset = await assets.assetErc20Balance(
        context,
        token,
        sourceAccount,
      );
      isNativeTransfer = false;
    }
    return {
      ...erc20Asset,
      nativeBalance,
      isNativeTransfer,
      nativeSymbol: "ETH",
      nativeTokenDecimals: 18,
      hasDotBalance: false,
      dotBalance: 0n,
      dotTokenDecimals: registry.relaychain.tokenDecimals,
      dotTokenSymbol: registry.relaychain.tokenSymbols,
    };
  } else {
    throw Error(`Unknown source type ${source.type}.`);
  }
}

export async function getKusamaTokenBalance({
  context,
  token,
  source,
  registry,
  sourceAccount,
}: TokenBalanceKusamaProps): Promise<{
  tokenBalance: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  nativeBalance: bigint;
  feeTokenSymbol: string;
  feeTokenDecimals: number;
}> {
  if (source === AssetHub.Polkadot) {
    const parachain = await context.assetHub();
    const sourceParaId = registry.assetHubParaId;
    const sourceMetadata = registry.parachains[sourceParaId];
    if (!sourceMetadata) {
      throw Error(
        `Polkadot AssetHub parachain metadata not found (parachain ${sourceParaId}).`,
      );
    }
    const sourceAssetMetadata = sourceMetadata.assets[token.toLowerCase()];
    if (!sourceAssetMetadata) {
      throw Error(
        `Token ${token} not registered on Polkadot AssetHub (parachain ${sourceParaId}).`,
      );
    }
    const paraImp = await paraImplementation(parachain);

    let nativeBalance: bigint;
    let tokenBalance: bigint;
    // If the token being sent is also DOT, we only need to fetch the DOT balance.
    if (sourceAssetMetadata.symbol === DOT_SYMBOL) {
      nativeBalance = tokenBalance = await paraImp.getNativeBalance(
        sourceAccount,
      );
    } else {
      [nativeBalance, tokenBalance] = await Promise.all([
        await paraImp.getNativeBalance(sourceAccount),
        await paraImp.getTokenBalance(
          sourceAccount,
          registry.ethChainId,
          token,
          sourceAssetMetadata,
        ),
      ]);
    }

    let tokenDecimals = sourceAssetMetadata.decimals;
    let tokenSymbol = sourceAssetMetadata.symbol;
    if (!tokenDecimals || !tokenSymbol) {
      tokenDecimals =
        registry.ethereumChains[registry.ethChainId].assets[token].decimals;
      tokenSymbol =
        registry.ethereumChains[registry.ethChainId].assets[token].symbol;
    }

    return {
      tokenBalance,
      tokenDecimals,
      tokenSymbol,
      nativeBalance,
      feeTokenDecimals: DOT_DECIMALS,
      feeTokenSymbol: DOT_SYMBOL,
    };
  } else if (source === AssetHub.Kusama) {
    const parachain = await context.kusamaAssetHub();
    if (!parachain) {
      throw Error(`Unable to connect to Kusama AssetHub.`);
    }
    const sourceParaId = registry.kusama?.assetHubParaId;
    if (!sourceParaId) {
      throw Error(`Kusama AssetHub parachain ID not set.`);
    }
    const sourceMetadata = registry.kusama?.parachains[sourceParaId];
    if (!sourceMetadata) {
      throw Error(
        `Polkadot AssetHub parachain metadata not found (parachain ${sourceParaId}).`,
      );
    }
    const sourceAssetMetadata = sourceMetadata.assets[token.toLowerCase()];
    if (!sourceAssetMetadata) {
      throw Error(
        `Token ${token} not registered on Polkadot AssetHub (parachain ${sourceParaId}).`,
      );
    }

    const paraImp = await paraImplementation(parachain);
    let nativeBalance: bigint;
    let tokenBalance: bigint;
    // If the token being sent is also KSM, we only need to fetch the KSM balance.
    if (sourceAssetMetadata.symbol === KSM_SYMBOL) {
      nativeBalance = tokenBalance = await paraImp.getNativeBalance(
        sourceAccount,
      );
    } else {
      [nativeBalance, tokenBalance] = await Promise.all([
        await paraImp.getNativeBalance(sourceAccount),
        await paraImp.getTokenBalance(
          sourceAccount,
          registry.ethChainId,
          token,
          sourceAssetMetadata,
        ),
      ]);
    }

    let tokenDecimals = sourceAssetMetadata.decimals;
    let tokenSymbol = sourceAssetMetadata.symbol;
    if (!tokenDecimals || !tokenSymbol) {
      tokenDecimals =
        registry.ethereumChains[registry.ethChainId].assets[token].decimals;
      tokenSymbol =
        registry.ethereumChains[registry.ethChainId].assets[token].symbol;
    }

    return {
      tokenBalance,
      tokenDecimals,
      tokenSymbol,
      nativeBalance,
      feeTokenDecimals: KSM_DECIMALS,
      feeTokenSymbol: KSM_SYMBOL,
    };
  } else {
    throw Error(`Unknown source type ${source}.`);
  }
}

export async function fetchForeignAssetsBalances(
  api: ApiPromise,
  remoteAssetId: RemoteAssetId,
  sourceAccount: string,
  decimals: number,
) {
  const foreignAssets = await api.query.foreignAssets.account<
    Option<AssetBalance>
  >(remoteAssetId, sourceAccount);

  return formatBalance({
    number: foreignAssets.unwrapOrDefault().balance.toBigInt(),
    decimals,
    displayDecimals: 3,
  });
}
