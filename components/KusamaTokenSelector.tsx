"use client";

import { FC, useState, useMemo, useEffect } from "react";
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
import { AssetRegistry } from "@snowbridge/base-types";
import { formatBalance } from "@/utils/formatting";
import { Context } from "@snowbridge/api";
import { getKusamaTokenBalance } from "@/utils/balances";
import { useAtomValue } from "jotai";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { fetchTokenPrices } from "@/utils/coindesk";
import { ChevronsUpDown } from "lucide-react";

type KusamaTokenSelectorProps = {
  value: string | undefined;
  onChange: (value: string) => void;
  tokens: Record<string, any> | undefined;
  assetRegistry: AssetRegistry;
  sourceAccount: string | undefined;
  source: string;
};

export const KusamaTokenSelector: FC<KusamaTokenSelectorProps> = ({
  value,
  onChange,
  tokens,
  assetRegistry,
  sourceAccount,
  source,
}) => {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [balances, setBalances] = useState<
    Record<string, { balance: bigint; decimals: number }>
  >({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const context = useAtomValue(snowbridgeContextAtom);

  // Get list of token addresses
  const tokenList = useMemo(() => {
    if (!tokens) return [];
    return Object.values(tokens)
      .map((t: any) => t.token?.toLowerCase())
      .filter((t): t is string => !!t);
  }, [tokens]);

  // Fetch balances for all tokens
  useEffect(() => {
    if (!sourceAccount || !context || tokenList.length === 0) {
      setBalances({});
      return;
    }

    const fetchBalances = async () => {
      const newBalances: Record<string, { balance: bigint; decimals: number }> =
        {};

      await Promise.all(
        tokenList.map(async (token) => {
          try {
            const balance = await getKusamaTokenBalance({
              context,
              token,
              source,
              registry: assetRegistry,
              sourceAccount,
            });

            if (balance?.tokenBalance) {
              newBalances[token] = {
                balance: balance.tokenBalance,
                decimals: Number(balance.tokenDecimals),
              };
            }
          } catch (error) {
            console.error(`Error fetching balance for ${token}:`, error);
          }
        }),
      );

      setBalances(newBalances);
    };

    fetchBalances();
  }, [sourceAccount, context, tokenList, source, assetRegistry]);

  useEffect(() => {
    const fetchPrices = async () => {
      const tokenSymbols = tokenList
        .map((t) => {
          const asset =
            assetRegistry.ethereumChains?.[assetRegistry.ethChainId]?.assets?.[
              t
            ];
          return asset?.symbol;
        })
        .filter((s): s is string => !!s);

      if (tokenSymbols.length > 0) {
        const priceData = await fetchTokenPrices(tokenSymbols);
        setPrices(priceData);
      }
    };

    fetchPrices();

    // Refresh prices every 5 minutes
    const interval = setInterval(fetchPrices, 300000);
    return () => clearInterval(interval);
  }, [tokenList, assetRegistry]);

  const selectedAsset = value
    ? assetRegistry.ethereumChains?.[assetRegistry.ethChainId]?.assets?.[
        value.toLowerCase()
      ]
    : null;

  const filteredTokens = useMemo(() => {
    let filtered = tokenList;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = tokenList.filter((t) => {
        const asset =
          assetRegistry.ethereumChains?.[assetRegistry.ethChainId]?.assets?.[t];
        if (!asset) return false;
        return (
          asset.name.toLowerCase().includes(query) ||
          asset.symbol.toLowerCase().includes(query)
        );
      });
    }

    // Helper to get token info for sorting
    const getTokenInfo = (tokenAddress: string) => {
      const tokenBalance = balances?.[tokenAddress];
      const balance = tokenBalance?.balance ?? 0n;
      const hasBalance = balance > 0n;

      let usdValue = 0;
      if (hasBalance && tokenBalance) {
        const asset =
          assetRegistry.ethereumChains?.[assetRegistry.ethChainId]?.assets?.[
            tokenAddress
          ];
        const price = prices?.[asset?.symbol?.toUpperCase()] ?? 0;
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
      const assetA =
        assetRegistry.ethereumChains?.[assetRegistry.ethChainId]?.assets?.[a];
      const assetB =
        assetRegistry.ethereumChains?.[assetRegistry.ethChainId]?.assets?.[b];
      return (assetA?.name ?? "").localeCompare(assetB?.name ?? "");
    });
  }, [tokenList, searchQuery, assetRegistry, balances, prices]);

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
          className="h-7 px-3 py-1 flex items-center justify-center gap-1.5 text-xs bg-white hover:bg-white/90 rounded-full flex-shrink-0 transition-colors"
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
            className="w-full bg-white/80 border-gray-200"
          />
        </div>
        <div className="max-h-96 overflow-y-auto ui-slimscroll bg-white/40 rounded-lg">
          {filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tokens found
            </div>
          ) : (
            filteredTokens.map((t) => {
              const asset =
                assetRegistry.ethereumChains?.[assetRegistry.ethChainId]
                  ?.assets?.[t];
              if (!asset) return null;

              const tokenBalance = balances?.[t];

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

              const tokenPrice = prices[asset.symbol.toUpperCase()];
              let usdValue: string | null = null;
              if (tokenBalance && tokenBalance.balance > 0n && tokenPrice) {
                const balanceInTokens =
                  Number(tokenBalance.balance) /
                  Math.pow(10, tokenBalance.decimals);
                const usdAmount = balanceInTokens * tokenPrice;
                usdValue = `$${usdAmount.toFixed(2)}`;
              }

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onChange(t);
                    setSearchQuery("");
                    setTokenModalOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white/50 rounded-md transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <SelectItemWithIcon
                      label=""
                      image={asset.symbol}
                      altImage="token_generic"
                    />
                    <div className="flex flex-col items-start">
                      <span
                        className="font-medium"
                        style={{ color: "#212d41" }}
                      >
                        {asset.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {asset.symbol}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#212d41" }}
                    >
                      {formattedBalance}
                    </span>
                    {usdValue && (
                      <span className="text-xs text-gray-500">{usdValue}</span>
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
