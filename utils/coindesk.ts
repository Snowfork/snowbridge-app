const TOKEN_SYMBOL_MAPPING: Record<string, string> = {
  WETH: "ETH",
  Ether: "ETH",
  WND: "DOT",
};

export async function fetchTokenPrices(
  tokenSymbols: string[],
): Promise<Record<string, number>> {
  const apiKey = process.env.NEXT_PUBLIC_COINDESK_KEY;

  if (!apiKey) {
    // Silent return, as USD prices shouldn't be required for the app
    // to work.
    return {};
  }

  if (tokenSymbols.length === 0) {
    return {};
  }

  const normalizedSymbols = tokenSymbols.map((symbol) => {
    const upperSymbol = symbol.toUpperCase();
    return TOKEN_SYMBOL_MAPPING[upperSymbol] || upperSymbol;
  });

  // Remove duplicates
  const uniqueSymbols = [...new Set(normalizedSymbols)];

  try {
    const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${uniqueSymbols.join(",")}&tsyms=USD&api_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
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
    return {};
  }
}
