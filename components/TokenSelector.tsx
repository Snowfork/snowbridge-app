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
import { AssetRegistry } from "@snowbridge/base-types";
import { formatBalance } from "@/utils/formatting";
import { assetsV2 } from "@snowbridge/api";
import { useAtomValue } from "jotai";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { fetchTokenPrices } from "@/utils/coindesk";
import { ChevronsUpDown, ArrowUpRight } from "lucide-react";
import { etherscanERC20TokenLink } from "@/lib/explorerLinks";
import {
  useEthereumTokenBalances,
  usePolkadotTokenBalances,
} from "@/hooks/useTokenBalances";
import { RegistryContext } from "@/app/providers";
import useSWR from "swr";

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
  const context = useAtomValue(snowbridgeContextAtom);
  const registry = useContext(RegistryContext);

  // Use shared balance hooks based on source type
  const isEthereumSource = source.type === "ethereum";
  const sourceParachainId = source.parachain?.parachainId;

  const { data: ethBalances } = useEthereumTokenBalances(
    isEthereumSource ? sourceAccount : undefined,
    context,
    registry,
  );

  const { data: polkadotBalances } = usePolkadotTokenBalances(
    !isEthereumSource ? sourceAccount : undefined,
    context,
    registry,
    sourceParachainId,
  );

  // Use the appropriate balances based on source
  const balances = isEthereumSource ? ethBalances : polkadotBalances;

  // Fetch prices with SWR
  const tokenSymbols = assets.map((t) => {
    const asset =
      assetRegistry.ethereumChains[ethChainId].assets[t.toLowerCase()];
    return asset.symbol;
  });

  const { data: prices } = useSWR(
    tokenSymbols.length > 0 ? ["token-prices", tokenSymbols.join(",")] : null,
    () => fetchTokenPrices(tokenSymbols),
    PRICE_SWR_CONFIG,
  );

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

    // Helper to get token info for sorting
    const getTokenInfo = (tokenAddress: string) => {
      const tokenBalance = balances?.[tokenAddress.toLowerCase()];
      const balance = tokenBalance?.balance ?? 0n;
      const hasBalance = balance > 0n;

      let usdValue = 0;
      if (hasBalance && tokenBalance) {
        const asset =
          assetRegistry.ethereumChains[ethChainId].assets[
            tokenAddress.toLowerCase()
          ];
        const price = prices?.[asset.symbol.toUpperCase()] ?? 0;
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
        assetRegistry.ethereumChains[ethChainId].assets[a.toLowerCase()];
      const assetB =
        assetRegistry.ethereumChains[ethChainId].assets[b.toLowerCase()];
      return assetA.name.localeCompare(assetB.name);
    });
  }, [assets, searchQuery, assetRegistry, ethChainId, balances, prices]);

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
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
                t.length > 10 ? `${t.substring(0, 10)}...` : t;

              const tokenPrice = prices?.[asset.symbol.toUpperCase()];
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
                        {asset.symbol}
                      </span>
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                        {asset.name}
                        {t.toLowerCase() !==
                          assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase() && (
                          <span
                            className="hover:underline cursor-pointer inline-flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                etherscanERC20TokenLink(
                                  assetRegistry.environment,
                                  ethChainId,
                                  t,
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
