// Mapping of token symbols that need special handling for CoinMarketCap.
const TOKEN_SYMBOL_MAPPING: Record<string, string> = {
  WETH: "ETH",
  ETHER: "ETH",
  WND: "DOT", // Westend uses same price as DOT for approximation.
  HDX: "HDX",
};

// Price cache with 5-minute TTL.
const CACHE_TTL_MS = 5 * 60 * 1000;
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();

function normalizeSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  return TOKEN_SYMBOL_MAPPING[upperSymbol] || upperSymbol;
}

function getCachedPrice(symbol: string): number | null {
  const cached = priceCache.get(symbol.toUpperCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }
  return null;
}

function setCachedPrice(symbol: string, price: number): void {
  priceCache.set(symbol.toUpperCase(), { price, timestamp: Date.now() });
}

interface TokenPricesResponse {
  prices?: Record<string, number>;
}

export async function fetchTokenPrices(
  tokenSymbols: string[],
): Promise<Record<string, number>> {
  if (tokenSymbols.length === 0) {
    return {};
  }

  const priceMap: Record<string, number> = {};
  const symbolsToFetch: string[] = [];

  tokenSymbols.forEach((symbol) => {
    const upperSymbol = symbol.toUpperCase();
    const cachedPrice = getCachedPrice(upperSymbol);
    if (cachedPrice !== null) {
      priceMap[upperSymbol] = cachedPrice;
    } else {
      symbolsToFetch.push(symbol);
    }
  });

  if (symbolsToFetch.length === 0) {
    return priceMap;
  }

  const normalizedSymbols = symbolsToFetch.map(normalizeSymbol);
  const uniqueSymbols = [...new Set(normalizedSymbols)];

  try {
    const params = new URLSearchParams({
      symbols: uniqueSymbols.join(","),
    });
    const response = await fetch(`/api/token-prices?${params.toString()}`);

    if (!response.ok) {
      return priceMap;
    }

    const data = (await response.json()) as TokenPricesResponse;
    const prices = data.prices ?? {};

    symbolsToFetch.forEach((symbol) => {
      const upperSymbol = symbol.toUpperCase();
      const mappedSymbol = normalizeSymbol(symbol);
      const price = prices[mappedSymbol];

      if (typeof price === "number" && Number.isFinite(price) && price > 0) {
        priceMap[upperSymbol] = price;
        setCachedPrice(upperSymbol, price);
      }
    });

    return priceMap;
  } catch {
    return priceMap;
  }
}
