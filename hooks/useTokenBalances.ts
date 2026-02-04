"use client";

import { assetsV2, Context } from "@snowbridge/api";
import { paraImplementation } from "@snowbridge/api/dist/parachains";
import {
  Asset,
  AssetRegistry,
  ERC20Metadata,
  EthereumLocation,
  ParachainLocation,
  TransferLocation,
} from "@snowbridge/base-types";
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

async function getEthereumBalance(
  context: Context,
  registry: AssetRegistry,
  source: TransferLocation,
  asset: ERC20Metadata,
  account: string,
): Promise<bigint> {
  const token = asset.token.toLowerCase();
  if (source.kind === "ethereum" && source.id === registry.ethChainId) {
    // Ethereum Mainnet
    if (token.toLowerCase() === assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase()) {
      try {
        return await context.ethChain(source.id).getBalance(account);
      } catch {
        return 0n;
      }
    } else {
      let b: { balance: bigint };
      try {
        b = await assetsV2.erc20Balance(
          context.ethChain(source.id),
          token,
          account,
          context.environment.gatewayContract,
        );
      } catch {
        b = { balance: 0n };
      }
      return b.balance;
    }
  } else if (source.kind === "ethereum" && source.parachain) {
    // Substrate EVM
    const asset = source.parachain.assets[token.toLowerCase()];
    try {
      return (
        await assetsV2.erc20Balance(
          context.ethChain(source.id),
          asset?.xc20 ?? token,
          account,
          context.environment.gatewayContract,
        )
      ).balance;
    } catch {
      return 0n;
    }
  } else if (source.kind === "ethereum_l2") {
    // L2
    throw Error(`Not Implemented`);
  } else {
    console.log(
      `Warning could not infer ${source.kind} ${source.id} to get token balances.`,
    );
    return 0n;
  }
}

async function fetchEthereumTokenBalances(
  context: Context,
  registry: AssetRegistry,
  source: EthereumLocation,
  assets: ERC20Metadata[],
  account: string,
): Promise<TokenBalances> {
  const balances: TokenBalances = {};
  (
    await Promise.all(
      assets.map(async (asset) => {
        const balance = await getEthereumBalance(
          context,
          registry,
          source,
          asset,
          account,
        );
        return { asset, balance };
      }),
    )
  ).forEach(({ asset, balance }) => {
    balances[asset.token] = {
      balance: balance,
      decimals: asset.decimals,
    };
  });
  return balances;
}

async function getPolkadotBalance(
  context: Context,
  registry: AssetRegistry,
  source: ParachainLocation,
  asset: ERC20Metadata | null,
  account: string,
): Promise<[bigint, boolean, ERC20Metadata | null, Asset | null]> {
  if (source.kind === "polkadot") {
    const parachain = await context.parachain(source.id);
    const paraImp = await paraImplementation(parachain);
    if (asset === null) {
      return [await paraImp.getNativeBalance(account), true, null, null];
    }
    const paraAsset = source.parachain.assets[asset.token.toLowerCase()];
    if (!paraAsset) return [0n, false, asset, paraAsset];
    if (
      source.id === registry.assetHubParaId &&
      paraAsset.location?.parents === 1 &&
      paraAsset.location?.interior === "Here"
    ) {
      return [
        await paraImp.getNativeBalance(account).catch(() => 0n),
        true,
        asset,
        paraAsset,
      ];
    }
    return [
      await paraImp
        .getTokenBalance(account, registry.ethChainId, asset.token, paraAsset)
        .catch(() => 0n),
      false,
      asset,
      paraAsset,
    ];
  } else if (source.kind === "kusama") {
    const parachain = await context.kusamaParachain(source.id);
    const paraImp = await paraImplementation(parachain);
    if (asset === null) {
      return [await paraImp.getNativeBalance(account), true, null, null];
    }
    const paraAsset = source.parachain.assets[asset.token.toLowerCase()];
    if (!paraAsset) return [0n, false, asset, paraAsset];
    if (
      source.id === registry.kusama?.assetHubParaId &&
      paraAsset.location?.parents === 1 &&
      paraAsset.location?.interior === "Here"
    ) {
      return [
        await paraImp.getNativeBalance(account).catch(() => 0n),
        true,
        asset,
        paraAsset,
      ];
    }
    return [
      await paraImp
        .getTokenBalance(account, registry.ethChainId, asset.token, paraAsset)
        .catch(() => 0n),
      false,
      asset,
      paraAsset,
    ];
  } else {
    console.log(
      `Warning could not infer ${source.kind} ${source.id} to get token balances.`,
    );
    return [0n, false, null, null];
  }
}

async function fetchPolkadotTokenBalances(
  context: Context,
  registry: AssetRegistry,
  source: ParachainLocation,
  assets: ERC20Metadata[],
  account: string,
): Promise<TokenBalances> {
  if (!account) {
    return {};
  }

  const balances: TokenBalances = {};
  (
    await Promise.all([
      ...[null, ...assets].map((asset) =>
        getPolkadotBalance(context, registry, source, asset, account),
      ),
    ])
  ).forEach(([balance, isNative, asset, paraAsset]) => {
    if (asset === null && isNative) {
      // Native asset, not transferable.
      balances[`native:${source.id}`] = {
        balance,
        decimals: source.parachain.info.tokenDecimals,
      };
    } else if (asset !== null && isNative && paraAsset) {
      // Native asset that is transferable
      balances[asset.token] = {
        balance,
        decimals: asset.decimals,
      };
      // DOT
      if (
        source.id === registry.assetHubParaId &&
        source.kind === "polkadot" &&
        asset.symbol === "DOT"
      ) {
        balances[asset.symbol.toLowerCase()] = {
          balance: balance,
          decimals: asset.decimals,
        };
      }
      // KSM
      if (
        source.id === registry.kusama?.assetHubParaId &&
        source.kind === "kusama" &&
        asset.symbol === "KSM"
      ) {
        balances[asset.symbol.toLowerCase()] = {
          balance: balance,
          decimals: asset.decimals,
        };
      }
    } else if (asset !== null) {
      balances[asset.token] = {
        balance,
        decimals: Number(asset.decimals),
      };
    }
  });

  return balances;
}

async function fetchTokenBalances([
  ,
  context,
  registry,
  source,
  assets,
  account,
]: [
  string,
  Context,
  AssetRegistry,
  TransferLocation,
  ERC20Metadata[],
  string | undefined,
]): Promise<TokenBalances> {
  if (!account) return {};
  if (source.kind === "ethereum" || source.kind === "ethereum_l2") {
    return await fetchEthereumTokenBalances(
      context,
      registry,
      source,
      assets,
      account,
    );
  }
  if (source.kind === "polkadot" || source.kind === "kusama") {
    return await fetchPolkadotTokenBalances(
      context,
      registry,
      source,
      assets,
      account,
    );
  }
  return {};
}

export function useTokenBalances(
  context: Context,
  registry: AssetRegistry,
  source: TransferLocation,
  assets: ERC20Metadata[],
  account?: string,
) {
  return useSWR(
    ["token-balances", context, registry, source, assets, account],
    fetchTokenBalances,
    SWR_CONFIG,
  );
}
