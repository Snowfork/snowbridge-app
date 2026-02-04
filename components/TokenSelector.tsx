"use client";

import { FC, useState, useMemo, useContext } from "react";
import { SelectItemWithIcon } from "./SelectItemWithIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { ImageWithFallback } from "./ui/image-with-fallback";
import {
  AssetRegistry,
  ERC20Metadata,
  TransferLocation,
} from "@snowbridge/base-types";
import { formatBalance, formatUsdValue } from "@/utils/formatting";
import { assetsV2 } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { fetchTokenPrices } from "@/utils/coindesk";
import { ChevronsUpDown, ArrowUpRight } from "lucide-react";
import { etherscanERC20TokenLink } from "@/lib/explorerLinks";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { BridgeInfoContext } from "@/app/providers";
import useSWR from "swr";

type TokenSelectorProps = {
  value?: string;
  onChange: (_: string) => void;
  assets: string[];
  assetRegistry: AssetRegistry;
  ethChainId: number;
  sourceAccount?: string;
  source: TransferLocation;
  destination: TransferLocation;
};

const PRICE_SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 5 * 60 * 1000,
  refreshInterval: 5 * 60 * 1000,
};

export const TokenSelector: FC<TokenSelectorProps> = ({
  value,
  onChange,
  assets,
  assetRegistry,
  ethChainId,
  sourceAccount,
  source,
}) => {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const context = useAtomValue(snowbridgeContextAtom)!;
  const { registry } = useContext(BridgeInfoContext)!;

  const [assetMeta, symbols] = useMemo(() => {
    const meta = Object.values(
      assetRegistry.ethereumChains[`ethereum_${ethChainId}`].assets,
    ).filter((a) =>
      assets.find((x) => x.toLowerCase() === a.token.toLowerCase()),
    );
    const symbols = meta.map((m) => m.symbol);
    return [meta, symbols];
  }, [assets, assetRegistry, ethChainId]);

  const { data: balances } = useTokenBalances(
    context,
    registry,
    source,
    assetMeta,
    sourceAccount,
  );

  const { data: prices } = useSWR(
    ["token-prices", symbols],
    () => fetchTokenPrices(symbols),
    PRICE_SWR_CONFIG,
  );

  const selectedAsset = assetMeta.find(
    (x) => x.token.toLowerCase() === value?.toLowerCase(),
  );

  const filteredAssets = useMemo(() => {
    let filtered = assetMeta;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = assetMeta.filter((m) => {
        return (
          m.name.toLowerCase().includes(query) ||
          m.symbol.toLowerCase().includes(query)
        );
      });
    }

    // Helper to get token info for sorting
    const getTokenInfo = (token: ERC20Metadata) => {
      const tokenBalance = balances?.[token.token.toLowerCase()];
      const balance = tokenBalance?.balance ?? 0n;
      const hasBalance = balance > 0n;

      let usdValue = 0;
      if (hasBalance && tokenBalance) {
        const price = prices?.[token.symbol.toUpperCase()] ?? 0;
        const balanceInTokens =
          Number(balance) / Math.pow(10, tokenBalance.decimals);
        usdValue = balanceInTokens * price;
      }

      return { hasBalance, usdValue };
    };

    // Sort by: 1) USD value (highest first), 2) has balance but no price, 3) no balance
    return [...filtered].sort((a, b) => {
      const infoA = getTokenInfo(a);
      const infoB = getTokenInfo(b);

      // Both have USD value - sort by value descending
      if (infoA.usdValue > 0 && infoB.usdValue > 0) {
        return infoB.usdValue - infoA.usdValue;
      }

      // One has USD value, one doesn't - USD value comes first
      if (infoA.usdValue > 0 && infoB.usdValue === 0) return -1;
      if (infoB.usdValue > 0 && infoA.usdValue === 0) return 1;

      // Neither has USD value - check if they have balance
      // Tokens with balance come before tokens without balance
      if (infoA.hasBalance && !infoB.hasBalance) return -1;
      if (infoB.hasBalance && !infoA.hasBalance) return 1;

      // Same category - sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [assetMeta, searchQuery, balances, prices]);

  return (
    <Dialog
      open={tokenModalOpen}
      onOpenChange={(open) => {
        setTokenModalOpen(open);
        if (!open) {
          setSearchQuery("");
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="h-7 px-3 py-1 flex items-center justify-center gap-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-white/90 dark:hover:bg-slate-600 rounded-full flex-shrink-0 transition-colors"
        >
          {selectedAsset ? (
            <>
              <div className="relative w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={`/images/${selectedAsset.symbol.toLowerCase()}.png`}
                  fallbackSrc="/images/token_generic.png"
                  width={16}
                  height={16}
                  alt={selectedAsset.symbol}
                  className="rounded-full"
                />
              </div>
              <span className="text-xs font-medium">
                {selectedAsset.symbol}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">Token</span>
          )}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass more-blur">
        <DialogHeader>
          <DialogTitle className="text-center font-medium text-primary">
            Select Token
          </DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-600"
          />
        </div>
        <div className="max-h-96 overflow-y-auto ui-slimscroll bg-white/40 dark:bg-slate-800/60 rounded-lg">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tokens found
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const tokenBalance = balances?.[asset.token.toLowerCase()];

              let formattedBalance: string;
              if (tokenBalance && tokenBalance.balance > 0n) {
                formattedBalance = formatBalance({
                  number: tokenBalance.balance,
                  decimals: tokenBalance.decimals,
                  displayDecimals: 8,
                });
              } else {
                formattedBalance = "0.00";
              }

              const truncatedAddress =
                asset.token.length > 10
                  ? `${asset.token.substring(0, 10)}...`
                  : asset.token;

              const tokenPrice = prices?.[asset.symbol.toUpperCase()];
              let usdValue: string | null = null;
              if (tokenBalance && tokenBalance.balance > 0n && tokenPrice) {
                const balanceInTokens =
                  Number(tokenBalance.balance) /
                  Math.pow(10, tokenBalance.decimals);
                const usdAmount = balanceInTokens * tokenPrice;
                usdValue = formatUsdValue(usdAmount);
              }

              return (
                <button
                  key={asset.token}
                  type="button"
                  onClick={() => {
                    onChange(asset.token);
                    setSearchQuery("");
                    setTokenModalOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-md transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <SelectItemWithIcon
                      label=""
                      image={asset.symbol}
                      altImage="token_generic"
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-primary">
                        {asset.symbol}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                        {asset.name}
                        {asset.token.toLowerCase() !==
                          assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase() && (
                          <span
                            className="hover:underline cursor-pointer inline-flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                etherscanERC20TokenLink(
                                  assetRegistry.environment,
                                  ethChainId,
                                  asset.token,
                                ),
                              );
                            }}
                          >
                            ({truncatedAddress}
                            <ArrowUpRight className="w-3 h-3" />)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-primary">
                      {formattedBalance}
                    </span>
                    {usdValue && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {usdValue}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
