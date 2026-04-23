// Mapping of token symbols that need special handling for CoinDesk API
const TOKEN_SYMBOL_MAPPING: Record<string, string> = {
  WETH: "ETH", // WETH uses same price as ETH
  Ether: "ETH",
  WND: "DOT", // Westend uses same price as DOT for approximation
  HDX: "HYDRADX", // Hydration token is listed as HYDRADX on CryptoCompare
};

// Price cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();

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

function isRateLimited(status: number, data: any): boolean {
  if (status === 429) return true;
  // CryptoCompare returns HTTP 200 with Response: "Error" and Type: 99 on rate limit
  if (data?.Response === "Error") {
    const message: string = data.Message ?? "";
    if (/rate limit/i.test(message) || data.Type === 99) return true;
  }
  return false;
}

// Track the index of the key currently in use so subsequent calls start from
// the last working key instead of retrying a known-exhausted one. Initialized
// lazily on first fetch so the starting key is randomized per client, spreading
// load across keys instead of every user hammering index 0 first.
let activeKeyIndex: number | null = null;

export async function fetchTokenPrices(
  tokenSymbols: string[],
): Promise<Record<string, number>> {
  const apiKeys = (process.env.NEXT_PUBLIC_COINDESK_KEY ?? "")
    .split(";")
    .map((k) => k.trim())
    .filter(Boolean);

  if (apiKeys.length === 0) {
    // Silently return empty object if API key is not configured
    return {};
  }

  if (tokenSymbols.length === 0) {
    return {};
  }

  const priceMap: Record<string, number> = {};
  const symbolsToFetch: string[] = [];

  // Check cache first
  tokenSymbols.forEach((symbol) => {
    const upperSymbol = symbol.toUpperCase();
    const cachedPrice = getCachedPrice(upperSymbol);
    if (cachedPrice !== null) {
      priceMap[upperSymbol] = cachedPrice;
    } else {
      symbolsToFetch.push(symbol);
    }
  });

  // If all prices are cached, return early
  if (symbolsToFetch.length === 0) {
    return priceMap;
  }

  // Map symbols and normalize for API call
  const normalizedSymbols = symbolsToFetch.map((symbol) => {
    const upperSymbol = symbol.toUpperCase();
    return TOKEN_SYMBOL_MAPPING[upperSymbol] || upperSymbol;
  });

  // Remove duplicates
  const uniqueSymbols = [...new Set(normalizedSymbols)];

  if (activeKeyIndex === null) {
    activeKeyIndex = Math.floor(Math.random() * apiKeys.length);
  }

  // Try each API key in turn, rotating past ones that are rate limited.
  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const keyIndex = (activeKeyIndex + attempt) % apiKeys.length;
    const apiKey = apiKeys[keyIndex];

    try {
      // CoinDesk API (powered by CryptoCompare) endpoint
      const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${uniqueSymbols.join(",")}&tsyms=USD&api_key=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (isRateLimited(response.status, null)) {
          continue;
        }
        return priceMap;
      }

      const data = await response.json();

      if (isRateLimited(response.status, data)) {
        continue;
      }

      activeKeyIndex = keyIndex;

      // Map prices back to original token symbols and cache them
      symbolsToFetch.forEach((symbol) => {
        const upperSymbol = symbol.toUpperCase();
        const mappedSymbol = TOKEN_SYMBOL_MAPPING[upperSymbol] || upperSymbol;

        if (data[mappedSymbol]?.USD) {
          const price = data[mappedSymbol].USD;
          priceMap[upperSymbol] = price;
          setCachedPrice(upperSymbol, price);
        }
      });

      return priceMap;
    } catch (error) {
      // Network or parse error — try the next key.
      continue;
    }
  }

  // All keys exhausted — return whatever we have from cache
  return priceMap;
}
