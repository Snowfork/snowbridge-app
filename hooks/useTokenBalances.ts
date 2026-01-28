"use client";

import { assetsV2, Context } from "@snowbridge/api";
import { AssetRegistry } from "@snowbridge/base-types";
import useSWR from "swr";

export interface TokenBalanceData {
  balance: bigint;
  decimals: number;
}

export type TokenBalances = Record<string, TokenBalanceData>;

const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5 * 60 * 1000, // 5 minutes
  refreshInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
};

async function fetchEthereumTokenBalances([, account, context, registry]: [
  string,
  string,
  Context,
  AssetRegistry,
]): Promise<TokenBalances> {
  const balances: TokenBalances = {};
  const ethChainId = registry.ethChainId;
  const assets =
    registry.ethereumChains[`ethereum_${ethChainId}`]?.assets || {};

  // Filter ERC20 tokens (exclude ETH placeholder)
  const erc20Tokens = Object.entries(assets).filter(
    ([addr]) =>
      addr.toLowerCase() !== assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase(),
  );

  const [ethBalance, ...erc20Results] = await Promise.all([
    // Fetch ETH balance
    context
      .ethereum()
      .getBalance(account)
      .catch(() => 0n),
    // Fetch all ERC20 balances in parallel
    ...erc20Tokens.map(([tokenAddress]) =>
      assetsV2
        .erc20Balance(
          context.ethereum(),
          tokenAddress,
          account,
          context.environment.gatewayContract,
        )
        .catch(() => ({ balance: 0n })),
    ),
  ]);

  // Add ETH balance
  balances[assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase()] = {
    balance: ethBalance,
    decimals: 18,
  };

  // Add ERC20 balances
  erc20Tokens.forEach(([tokenAddress, asset], index) => {
    const erc20Balance = erc20Results[index];
    balances[tokenAddress.toLowerCase()] = {
      balance: erc20Balance.balance,
      decimals: Number(asset.decimals),
    };
  });

  return balances;
}

async function fetchPolkadotTokenBalances([
  ,
  account,
  context,
  registry,
  parachainId,
]: [string, string, Context, AssetRegistry, number]): Promise<TokenBalances> {
  const balances: TokenBalances = {};

  // Registry uses string keys for parachains
  const parachainConfig = registry.parachains[String(parachainId)];

  if (!parachainConfig) {
    return balances;
  }

  // Get the appropriate parachain API
  const isAssetHub = parachainId === registry.assetHubParaId;
  const parachain = isAssetHub
    ? await context.assetHub()
    : await context.parachain(parachainId);

  const paraImp = await import("@snowbridge/api/dist/parachains").then((m) =>
    m.paraImplementation(parachain),
  );

  const ethAssets =
    registry.ethereumChains[`ethereum_${registry.ethChainId}`]?.assets || {};

  // Find the native token address (DOT for Asset Hub)
  // Native tokens have location {parents: 1, interior: "Here"}
  let nativeTokenAddress: string | null = null;
  if (isAssetHub) {
    for (const [tokenAddress] of Object.entries(ethAssets)) {
      const parachainAsset =
        parachainConfig.assets?.[tokenAddress.toLowerCase()];
      if (
        parachainAsset?.location?.parents === 1 &&
        parachainAsset?.location?.interior === "Here"
      ) {
        nativeTokenAddress = tokenAddress.toLowerCase();
        break;
      }
    }
  }

  // Filter tokens that have metadata on this parachain
  // Exclude ETHER_TOKEN_ADDRESS and the native token (will be fetched separately)
  const bridgeableTokens = Object.entries(ethAssets).filter(
    ([tokenAddress]) => {
      if (
        tokenAddress.toLowerCase() ===
        assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase()
      ) {
        return false;
      }
      // Skip native token - we'll fetch it via getNativeBalance
      if (
        nativeTokenAddress &&
        tokenAddress.toLowerCase() === nativeTokenAddress
      ) {
        return false;
      }
      return !!parachainConfig.assets?.[tokenAddress.toLowerCase()];
    },
  );

  // Fetch native balance and all token balances in parallel
  const [nativeBalance, ...tokenResults] = await Promise.all([
    paraImp.getNativeBalance(account).catch(() => 0n),
    ...bridgeableTokens.map(([tokenAddress]) =>
      paraImp
        .getTokenBalance(
          account,
          registry.ethChainId,
          tokenAddress,
          parachainConfig.assets[tokenAddress.toLowerCase()],
        )
        .catch(() => 0n),
    ),
  ]);

  // Add native balance under its token address (for Asset Hub/DOT) or parachain key
  if (nativeTokenAddress) {
    // Store DOT balance under its actual token address so TokenSelector can find it
    const nativeAsset = ethAssets[nativeTokenAddress];
    balances[nativeTokenAddress] = {
      balance: nativeBalance,
      decimals: nativeAsset?.decimals ?? registry.relaychain.tokenDecimals,
    };
  } else {
    // For non-Asset Hub parachains, store under native:{parachainId} key
    const nativeKey = `native:${parachainId}`;
    balances[nativeKey] = {
      balance: nativeBalance,
      decimals: parachainConfig.info.tokenDecimals,
    };
  }

  // Also keep "dot" key for backward compatibility with PolkadotTokenList
  if (isAssetHub) {
    balances["dot"] = {
      balance: nativeBalance,
      decimals: registry.relaychain.tokenDecimals,
    };
  }

  // Add token balances
  bridgeableTokens.forEach(([tokenAddress, asset], index) => {
    balances[tokenAddress.toLowerCase()] = {
      balance: tokenResults[index],
      decimals: Number(asset.decimals),
    };
  });

  return balances;
}

export function useEthereumTokenBalances(
  account: string | undefined,
  context: Context | null,
  registry: AssetRegistry | null,
) {
  return useSWR(
    account && context && registry
      ? ["eth-token-balances", account, context, registry]
      : null,
    fetchEthereumTokenBalances,
    SWR_CONFIG,
  );
}

export function usePolkadotTokenBalances(
  account: string | undefined,
  context: Context | null,
  registry: AssetRegistry | null,
  parachainId?: number,
) {
  // Default to Asset Hub if no parachain ID provided
  const effectiveParachainId = parachainId ?? registry?.assetHubParaId;

  return useSWR(
    account && context && registry && effectiveParachainId
      ? [
          "polkadot-token-balances",
          account,
          context,
          registry,
          effectiveParachainId,
        ]
      : null,
    fetchPolkadotTokenBalances,
    SWR_CONFIG,
  );
}
