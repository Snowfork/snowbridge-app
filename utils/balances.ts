"use client";
import { Context } from "@snowbridge/api";
import { paraImplementation } from "@snowbridge/api/dist/parachains";
import {
  AssetHub,
  DOT_DECIMALS,
  DOT_SYMBOL,
  KSM_DECIMALS,
  KSM_SYMBOL,
} from "./types";
import { AssetRegistry } from "@snowbridge/base-types";

interface TokenBalanceKusamaProps {
  context: Context;
  token: string;
  source: string;
  registry: AssetRegistry;
  sourceAccount: string;
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
    const sourceMetadata = registry.parachains[`polkadot_${sourceParaId}`];
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
      nativeBalance = tokenBalance =
        await paraImp.getNativeBalance(sourceAccount);
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
        registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[token]
          .decimals;
      tokenSymbol =
        registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[token]
          .symbol;
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
    const sourceMetadata =
      registry.kusama?.parachains[`kusama_${sourceParaId}`];
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
      nativeBalance = tokenBalance =
        await paraImp.getNativeBalance(sourceAccount);
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
        registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[token]
          .decimals;
      tokenSymbol =
        registry.ethereumChains[`ethereum_${registry.ethChainId}`].assets[token]
          .symbol;
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
