"use client";

import {
  ComponentPropsWithoutRef,
  FC,
  forwardRef,
  useState,
  useMemo,
  useCallback,
} from "react";
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
import { fetchTokenPrices } from "@/utils/tokenPrices";
import { ChevronsUpDown, ArrowUpRight } from "lucide-react";
import { etherscanERC20TokenLink } from "@/lib/explorerLinks";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import useSWR from "swr";
import { Description } from "@radix-ui/react-dialog";

type TokenSelectorProps = {
  value?: string;
  onChange: (_: string) => void;
  assets: string[];
  assetRegistry: AssetRegistry;
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
  sourceAccount,
  source,
}) => {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  const assetMeta = useMemo(
    () =>
      Object.values(
        assetRegistry.ethereumChains[`ethereum_${assetRegistry.ethChainId}`]
          .assets,
      ).filter((a) =>
        assets.find((x) => x.toLowerCase() === a.token.toLowerCase()),
      ),
    [assets, assetRegistry],
  );

  const selectedAsset = assetMeta.find(
    (x) => x.token.toLowerCase() === value?.toLowerCase(),
  );

  return (
    <Dialog
      open={tokenModalOpen}
      onOpenChange={(open) => {
        setTokenModalOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <TokenPill symbol={selectedAsset?.symbol} />
      </DialogTrigger>
      <DialogContent className="glass more-blur">
        <Description></Description>
        <TokenList
          source={source}
          assetMeta={assetMeta}
          registry={assetRegistry}
          sourceAccount={sourceAccount}
          onChange={useCallback(
            (a: string) => {
              onChange(a);
              setTokenModalOpen(false);
            },
            [onChange],
          )}
        />
      </DialogContent>
    </Dialog>
  );
};

type TokenListProps = {
  source: TransferLocation;
  assetMeta: ERC20Metadata[];
  sourceAccount?: string;
  registry: AssetRegistry;
  onChange: (_: string) => unknown;
};
const TokenList: FC<TokenListProps> = (props) => {
  const { registry, source, assetMeta, sourceAccount, onChange } = props;

  const context = useAtomValue(snowbridgeContextAtom)!;

  const { data: balances } = useTokenBalances(
    context,
    registry,
    source,
    assetMeta,
    sourceAccount,
  );

  const symbols = useMemo(() => assetMeta.map((a) => a.symbol), [assetMeta]);

  const { data: prices } = useSWR(
    ["token-prices", symbols],
    () => fetchTokenPrices(symbols),
    PRICE_SWR_CONFIG,
  );

  const sortedAssets = useMemo(() => {
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
    return [...assetMeta].sort((a, b) => {
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
  }, [assetMeta, balances, prices]);

  const options: TokenOption[] = sortedAssets.map((asset) => {
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
    let usdValue: string | undefined;
    if (tokenBalance && tokenBalance.balance > 0n && tokenPrice) {
      const balanceInTokens =
        Number(tokenBalance.balance) / Math.pow(10, tokenBalance.decimals);
      usdValue = formatUsdValue(balanceInTokens * tokenPrice);
    }

    return {
      key: asset.token,
      symbol: asset.symbol,
      name: asset.name,
      balance: formattedBalance,
      usdValue,
      link:
        asset.token.toLowerCase() !== assetsV2.ETHER_TOKEN_ADDRESS.toLowerCase()
          ? {
              label: truncatedAddress,
              href: etherscanERC20TokenLink(
                registry.environment,
                registry.ethChainId,
                asset.token,
              ),
            }
          : undefined,
    };
  });

  return <TokenOptionList options={options} onSelect={onChange} />;
};

export type TokenOption = {
  key: string;
  symbol: string;
  name: string;
  balance?: string;
  usdValue?: string;
  link?: { label: string; href: string };
};

export const TokenPill = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { symbol?: string }
>(({ symbol, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className="h-7 px-3 py-1 flex items-center justify-center gap-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-white/90 dark:hover:bg-slate-600 rounded-full flex-shrink-0 transition-colors"
    {...props}
  >
    {symbol ? (
      <>
        <div className="relative w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={`/images/${symbol.toLowerCase()}.png`}
            fallbackSrc="/images/token_generic.png"
            width={16}
            height={16}
            alt={symbol}
            className="rounded-full"
          />
        </div>
        <span className="text-xs font-medium">{symbol}</span>
      </>
    ) : (
      <span className="text-muted-foreground text-xs">Token</span>
    )}
    <ChevronsUpDown className="h-3 w-3 opacity-50" />
  </button>
));
TokenPill.displayName = "TokenPill";

export const TokenOptionList: FC<{
  options: TokenOption[];
  onSelect: (key: string) => unknown;
}> = ({ options, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(query) ||
        o.symbol.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  return (
    <>
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
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tokens found</div>
        ) : (
          filtered.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onSelect(option.key);
              }}
              className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-md transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <SelectItemWithIcon
                  label=""
                  image={option.symbol}
                  altImage="token_generic"
                />
                <div className="flex flex-col items-start">
                  <span className="font-medium text-primary">
                    {option.symbol}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                    {option.name}
                    {option.link && (
                      <span
                        className="hover:underline cursor-pointer inline-flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(option.link!.href);
                        }}
                      >
                        ({option.link.label}
                        <ArrowUpRight className="w-3 h-3" />)
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {option.balance !== undefined && (
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-primary">
                    {option.balance}
                  </span>
                  {option.usdValue && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {option.usdValue}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </>
  );
};
