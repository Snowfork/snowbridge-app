// Mapping of token symbols that need special handling for CoinDesk API
const TOKEN_SYMBOL_MAPPING: Record<string, string> = {
  WETH: "ETH", // WETH uses same price as ETH
  Ether: "ETH",
  WND: "DOT", // Westend uses same price as DOT for approximation
};

export async function fetchTokenPrices(
  tokenSymbols: string[],
): Promise<Record<string, number>> {
  const apiKey = process.env.NEXT_PUBLIC_COINDESK_KEY;

  if (!apiKey) {
    // Silently return empty object if API key is not configured
    return {};
  }

  if (tokenSymbols.length === 0) {
    return {};
  }

  // Map symbols and normalize
  const normalizedSymbols = tokenSymbols.map((symbol) => {
    const upperSymbol = symbol.toUpperCase();
    return TOKEN_SYMBOL_MAPPING[upperSymbol] || upperSymbol;
  });

  // Remove duplicates
  const uniqueSymbols = [...new Set(normalizedSymbols)];

  try {
    // CoinDesk API (powered by CryptoCompare) endpoint
    const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${uniqueSymbols.join(",")}&tsyms=USD&api_key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      // Silently return empty object if API is unavailable or rate limited
      return {};
    }

    const data = await response.json();

    // Map prices back to original token symbols
    const priceMap: Record<string, number> = {};
    tokenSymbols.forEach((symbol) => {
      const upperSymbol = symbol.toUpperCase();
      const mappedSymbol = TOKEN_SYMBOL_MAPPING[upperSymbol] || upperSymbol;

      if (data[mappedSymbol]?.USD) {
        priceMap[upperSymbol] = data[mappedSymbol].USD;
      }
    });

    return priceMap;
  } catch (error) {
    // Silently return empty object if API fails - app should continue working
    return {};
  }
}
