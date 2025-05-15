"use client";
import { assets, assetsV2, Context } from "@snowbridge/api";
import { formatBalance } from "@/utils/formatting";
import { ApiPromise } from "@polkadot/api";
import { AssetHub, RemoteAssetId } from "./types";
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
    const parachain =
      para && context.hasParachain(para.parachainId)
        ? await context.parachain(para.parachainId)
        : await context.assetHub();

    const sourceParaId = para.parachainId;
    const sourceParachain = registry.parachains[sourceParaId];
    const sourceAssetMetadata =
      sourceParachain && sourceParachain.assets[token.toLowerCase()];
    if (!sourceAssetMetadata) {
      throw Error(
        `Token ${token} not registered on source parachain ${sourceParaId}.`,
      );
    }
    let balance: any;
    // For DOT on AH, get it from the native balance pallet.
    if (
      sourceParaId == registry.assetHubParaId &&
      sourceAssetMetadata.location?.parents == 1 &&
      sourceAssetMetadata.location?.interior == "Here"
    ) {
      balance = await assetsV2.getNativeBalance(parachain, sourceAccount);
    } else {
      balance = await assetsV2.getTokenBalance(
        parachain,
        para.info.specName,
        sourceAccount,
        registry.ethChainId,
        token,
        sourceAssetMetadata,
      );
    }
    let dotBalance;
    if (sourceParachain.features.hasDotBalance) {
      dotBalance = await assetsV2.getDotBalance(
        parachain,
        para.info.specName,
        sourceAccount,
      );
    }
    const nativeBalance = await assetsV2.getNativeBalance(
      parachain,
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
  dotBalance: bigint;
  dotTokenSymbol: string;
  dotTokenDecimals: number;
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

    let dotBalance: bigint;
    let tokenBalance: bigint;
    // If the token being sent is also DOT, we only need to fetch the DOT balance.
    if (
      sourceAssetMetadata.location?.parents == 1 &&
      sourceAssetMetadata.location?.interior == "Here"
    ) {
      dotBalance = tokenBalance = await assetsV2.getDotBalance(
        parachain,
        sourceMetadata.info.specName,
        sourceAccount,
      );
    } else {
      // For DOT on AH, get it from the native balance pallet.
      [dotBalance, tokenBalance] = await Promise.all([
        assetsV2.getDotBalance(
          parachain,
          sourceMetadata.info.specName,
          sourceAccount,
        ),
        await assetsV2.getTokenBalance(
          parachain,
          sourceMetadata.info.specName,
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
      dotBalance,
      dotTokenDecimals: registry.relaychain.tokenDecimals,
      dotTokenSymbol: registry.relaychain.tokenSymbols,
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

    const [dotBalance, tokenBalance] = await Promise.all([
      // For DOT on KSM, get it from the foreign assets pallet.
      assetsV2.getDotBalance(
        parachain,
        sourceMetadata.info.specName,
        sourceAccount,
      ),
      // Get token balance
      await assetsV2.getTokenBalance(
        parachain,
        sourceMetadata.info.specName,
        sourceAccount,
        registry.ethChainId,
        token,
        sourceAssetMetadata,
      ),
    ]);

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
      dotBalance,
      dotTokenDecimals: registry.relaychain.tokenDecimals,
      dotTokenSymbol: registry.relaychain.tokenSymbols,
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
