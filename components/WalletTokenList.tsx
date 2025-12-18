"use client";

import { FC, useContext } from "react";
import { ImageWithFallback } from "./ui/image-with-fallback";
import { formatBalance } from "@/utils/formatting";
import { useAtomValue } from "jotai";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { ethereumAccountAtom } from "@/store/ethereum";
import { RegistryContext } from "@/app/providers";
import { fetchTokenPrices } from "@/utils/coindesk";
import { Loader2, RefreshCw } from "lucide-react";
import useSWR from "swr";
import {
  useEthereumTokenBalances,
  usePolkadotTokenBalances,
} from "@/hooks/useTokenBalances";

interface TokenDisplayItem {
  symbol: string;
  name: string;
  balance: string;
  usdValue: string | null;
  icon: string;
}

const PRICE_SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5 * 60 * 1000,
  refreshInterval: 5 * 60 * 1000,
};

export const EthereumTokenList: FC = () => {
  const context = useAtomValue(snowbridgeContextAtom);
  const registry = useContext(RegistryContext);
  const ethereumAccount = useAtomValue(ethereumAccountAtom);

  const {
    data: balances,
    isLoading,
    isValidating,
    mutate,
  } = useEthereumTokenBalances(ethereumAccount ?? undefined, context, registry);

  // Fetch prices
  const symbols = registry
    ? [
        "ETH",
        ...Object.values(
          registry.ethereumChains[registry.ethChainId]?.assets || {},
        ).map((a) => a.symbol),
      ]
    : [];

  const { data: prices } = useSWR(
    symbols.length > 0 ? ["eth-prices", symbols.join(",")] : null,
    () => fetchTokenPrices(symbols),
    PRICE_SWR_CONFIG,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!balances || !registry) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        No tokens found
      </div>
    );
  }

  // Build display list
  const ethAssets = registry.ethereumChains[registry.ethChainId]?.assets || {};
  const tokenList: TokenDisplayItem[] = [];

  // Add ETH if balance > 0
  const ethKey = "0x0000000000000000000000000000000000000000";
  const ethBalance = balances[ethKey]?.balance ?? 0n;
  if (ethBalance > 0n) {
    const ethPrice = prices?.["ETH"] || 0;
    const ethNum = Number(ethBalance) / Math.pow(10, 18);
    tokenList.push({
      symbol: "ETH",
      name: "Ethereum",
      balance: formatBalance({
        number: ethBalance,
        decimals: 18,
        displayDecimals: 6,
      }),
      usdValue: ethPrice ? `$${(ethNum * ethPrice).toFixed(2)}` : null,
      icon: "ethereum",
    });
  }

  // Add ERC20 tokens with balance > 0
  for (const [tokenAddress, asset] of Object.entries(ethAssets)) {
    if (tokenAddress.toLowerCase() === ethKey) continue;
    const tokenBalance = balances[tokenAddress.toLowerCase()]?.balance ?? 0n;
    if (tokenBalance > 0n) {
      const tokenPrice = prices?.[asset.symbol.toUpperCase()] || 0;
      const balanceNum =
        Number(tokenBalance) / Math.pow(10, Number(asset.decimals));
      tokenList.push({
        symbol: asset.symbol,
        name: asset.name,
        balance: formatBalance({
          number: tokenBalance,
          decimals: Number(asset.decimals),
          displayDecimals: 6,
        }),
        usdValue: tokenPrice
          ? `$${(balanceNum * tokenPrice).toFixed(2)}`
          : null,
        icon: asset.symbol.toLowerCase(),
      });
    }
  }

  if (tokenList.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        No tokens found
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Balances
        </div>
        <button
          onClick={() => mutate()}
          disabled={isValidating}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          title="Refresh balances"
        >
          <RefreshCw
            className={`w-3 h-3 text-muted-foreground ${isValidating ? "animate-spin" : ""}`}
          />
        </button>
      </div>
      {tokenList.map((token) => (
        <div
          key={token.symbol}
          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ImageWithFallback
              src={`/images/${token.icon}.png`}
              fallbackSrc="/images/token_generic.png"
              width={24}
              height={24}
              alt={token.symbol}
              className="rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{token.symbol}</span>
              <span className="text-xs text-muted-foreground">
                {token.name}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{token.balance}</span>
            {token.usdValue && (
              <span className="text-xs text-muted-foreground">
                {token.usdValue}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface PolkadotTokenListProps {
  account: string | undefined;
}

export const PolkadotTokenList: FC<PolkadotTokenListProps> = ({ account }) => {
  const context = useAtomValue(snowbridgeContextAtom);
  const registry = useContext(RegistryContext);

  const {
    data: balances,
    isLoading,
    isValidating,
    mutate,
  } = usePolkadotTokenBalances(account, context, registry);

  // Fetch prices
  const symbols = registry
    ? [
        "DOT",
        ...Object.values(
          registry.ethereumChains[registry.ethChainId]?.assets || {},
        ).map((a) => a.symbol),
      ]
    : [];

  const { data: prices } = useSWR(
    symbols.length > 0 ? ["polkadot-prices", symbols.join(",")] : null,
    () => fetchTokenPrices(symbols),
    PRICE_SWR_CONFIG,
  );

  if (!account) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        Select an account to view balances
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!balances || !registry) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        No tokens found
      </div>
    );
  }

  // Build display list
  const ethAssets = registry.ethereumChains[registry.ethChainId]?.assets || {};
  const tokenList: TokenDisplayItem[] = [];

  // Add bridgeable tokens with balance > 0 (includes DOT)
  for (const [tokenAddress, asset] of Object.entries(ethAssets)) {
    const tokenBalance = balances[tokenAddress.toLowerCase()]?.balance ?? 0n;
    if (tokenBalance > 0n) {
      const tokenPrice = prices?.[asset.symbol.toUpperCase()] || 0;
      const balanceNum =
        Number(tokenBalance) / Math.pow(10, Number(asset.decimals));
      tokenList.push({
        symbol: asset.symbol,
        name: asset.name,
        balance: formatBalance({
          number: tokenBalance,
          decimals: Number(asset.decimals),
          displayDecimals: 6,
        }),
        usdValue: tokenPrice
          ? `$${(balanceNum * tokenPrice).toFixed(2)}`
          : null,
        icon: asset.symbol.toLowerCase(),
      });
    }
  }

  if (tokenList.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        No tokens found
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Balances
        </div>
        <button
          onClick={() => mutate()}
          disabled={isValidating}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          title="Refresh balances"
        >
          <RefreshCw
            className={`w-3 h-3 text-muted-foreground ${isValidating ? "animate-spin" : ""}`}
          />
        </button>
      </div>
      {tokenList.map((token) => (
        <div
          key={token.symbol}
          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ImageWithFallback
              src={`/images/${token.icon}.png`}
              fallbackSrc="/images/token_generic.png"
              width={24}
              height={24}
              alt={token.symbol}
              className="rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{token.symbol}</span>
              <span className="text-xs text-muted-foreground">
                {token.name}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{token.balance}</span>
            {token.usdValue && (
              <span className="text-xs text-muted-foreground">
                {token.usdValue}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
