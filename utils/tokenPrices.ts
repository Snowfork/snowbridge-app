import { getEnvironment } from "@/lib/snowbridgeEnv";

// Mapping of token symbols to the symbol the indexer prices them under.
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

// USD token prices come from the Snowbridge indexer's `latestTokenPrices`
// GraphQL query (populated by the indexer pricefetcher). Queried directly from
// the browser so the app needs no server; the indexer matches symbols
// case-insensitively, so UPPERCASE requests resolve mixed-case rows.
const LATEST_TOKEN_PRICES_QUERY = `
  query LatestTokenPrices($symbols: [String!]) {
    latestTokenPrices(symbols: $symbols) {
      symbol
      priceUSD
    }
  }
`;

interface TokenPriceRow {
  symbol?: string;
  priceUSD?: number;
}

// Returns a map of UPPERCASE symbol -> USD price.
async function fetchPricesFromIndexer(
  symbols: string[],
): Promise<Record<string, number>> {
  const response = await fetch(getEnvironment().indexerGraphQlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: LATEST_TOKEN_PRICES_QUERY,
      variables: { symbols },
    }),
  });

  if (!response.ok) {
    throw new Error(`Indexer request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message ?? "Indexer query error");
  }

  const rows: TokenPriceRow[] = payload?.data?.latestTokenPrices ?? [];
  const prices: Record<string, number> = {};
  for (const row of rows) {
    const symbol = row?.symbol?.toUpperCase();
    const price = row?.priceUSD;
    if (
      symbol &&
      typeof price === "number" &&
      Number.isFinite(price) &&
      price > 0
    ) {
      prices[symbol] = price;
    }
  }
  return prices;
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
    const prices = await fetchPricesFromIndexer(uniqueSymbols);

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
