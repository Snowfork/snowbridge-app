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
import { AssetRegistry } from "@snowbridge/base-types";
import { formatBalance } from "@/utils/formatting";
import { assetsV2, Context } from "@snowbridge/api";
import { getTokenBalance } from "@/utils/balances";
import { useAtomValue } from "jotai";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { fetchTokenPrices } from "@/utils/coindesk";
import { ChevronsUpDown } from "lucide-react";

type TokenSelectorProps = {
  value: string | undefined;
  onChange: (value: string) => void;
  assets: string[];
  assetRegistry: AssetRegistry;
  ethChainId: number;
  sourceAccount: string | undefined;
  source: assetsV2.TransferLocation;
  destination: assetsV2.TransferLocation;
};

export const TokenSelector: FC<TokenSelectorProps> = ({
  value,
  onChange,
  assets,
  assetRegistry,
  ethChainId,
  sourceAccount,
  source,
  destination,
}) => {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [balances, setBalances] = useState<
    Record<string, { balance: bigint; decimals: number }>
  >({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const context = useAtomValue(snowbridgeContextAtom);

  // Fetch balances for all tokens
  useEffect(() => {
    if (!sourceAccount || !context) {
      setBalances({});
      return;
    }

    const fetchBalances = async () => {
      const newBalances: Record<string, { balance: bigint; decimals: number }> =
        {};

      await Promise.all(
        assets.map(async (token) => {
          try {
            const balance = await getTokenBalance({
              context,
              token,
              source,
              destination,
              registry: assetRegistry,
              sourceAccount,
            });

            if (balance?.balance) {
              const asset =
                assetRegistry.ethereumChains[ethChainId].assets[
                  token.toLowerCase()
                ];
              newBalances[token.toLowerCase()] = {
                balance: balance.balance,
                decimals: Number(asset.decimals),
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
  }, [
    sourceAccount,
    context,
    assets.join(","),
    source,
    destination,
    assetRegistry,
    ethChainId,
  ]);

  useEffect(() => {
    const fetchPrices = async () => {
      const tokenSymbols = assets.map((t) => {
        const asset =
          assetRegistry.ethereumChains[ethChainId].assets[t.toLowerCase()];
        return asset.symbol;
      });

      const priceData = await fetchTokenPrices(tokenSymbols);
      setPrices(priceData);
    };

    fetchPrices();

    // Refresh prices every 5 minutes
    const interval = setInterval(fetchPrices, 300000);
    return () => clearInterval(interval);
  }, [assets, assetRegistry, ethChainId]);

  const selectedAsset = value
    ? assetRegistry.ethereumChains[ethChainId].assets[value.toLowerCase()]
    : null;

  const filteredAssets = useMemo(() => {
    let filtered = assets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = assets.filter((t) => {
        const asset =
          assetRegistry.ethereumChains[ethChainId].assets[t.toLowerCase()];
        return (
          asset.name.toLowerCase().includes(query) ||
          asset.symbol.toLowerCase().includes(query)
        );
      });
    }

    // Sort by balance (highest first), then alphabetically
    return [...filtered].sort((a, b) => {
      const balanceA = balances?.[a.toLowerCase()]?.balance ?? 0n;
      const balanceB = balances?.[b.toLowerCase()]?.balance ?? 0n;

      // If both have balance or both don't have balance
      if (
        (balanceA > 0n && balanceB > 0n) ||
        (balanceA === 0n && balanceB === 0n)
      ) {
        if (balanceA !== balanceB) {
          // Sort by balance (descending)
          return balanceA > balanceB ? -1 : 1;
        }
        // If same balance, sort alphabetically by name
        const assetA =
          assetRegistry.ethereumChains[ethChainId].assets[a.toLowerCase()];
        const assetB =
          assetRegistry.ethereumChains[ethChainId].assets[b.toLowerCase()];
        return assetA.name.localeCompare(assetB.name);
      }

      // Tokens with balance come before tokens without balance
      return balanceA > 0n ? -1 : 1;
    });
  }, [assets, searchQuery, assetRegistry, ethChainId, balances]);

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
          className="w-32 h-10 flex items-center justify-between border-0 bg-transparent hover:bg-accent/50 rounded px-2"
        >
          {selectedAsset ? (
            <SelectItemWithIcon
              label={selectedAsset.name}
              image={selectedAsset.symbol}
              altImage="token_generic"
            />
          ) : (
            <span className="text-muted-foreground">Token</span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Token</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tokens found
            </div>
          ) : (
            filteredAssets.map((t) => {
              const asset =
                assetRegistry.ethereumChains[ethChainId].assets[
                  t.toLowerCase()
                ];
              const tokenBalance = balances?.[t.toLowerCase()];

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
                t.length > 10
                  ? `${t.substring(0, 6)}...${t.substring(t.length - 4)}`
                  : t;

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
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-accent rounded-md transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <SelectItemWithIcon
                      label=""
                      image={asset.symbol}
                      altImage="token_generic"
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{asset.name}</span>
                      <a
                        href={`${process.env.NEXT_PUBLIC_ETHEREUM_EXPLORER}${t}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        {truncatedAddress}
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm">{formattedBalance}</span>
                    {usdValue && (
                      <span className="text-xs text-muted-foreground">
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
