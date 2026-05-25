import { NextRequest, NextResponse } from "next/server";

const COINMARKETCAP_QUOTES_URL =
  "https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/latest";

const SYMBOL_PATTERN = /^[0-9A-Z$@-]+$/;

interface CoinMarketCapQuote {
  symbol?: string;
  price?: number;
}

interface CoinMarketCapAsset {
  id?: number;
  symbol?: string;
  is_active?: number;
  cmc_rank?: number;
  quote?: CoinMarketCapQuote[] | { USD?: { price?: number } };
}

function sanitizeSymbols(symbols: string | null): string[] {
  if (!symbols) {
    return [];
  }

  return [
    ...new Set(
      symbols
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol.length > 0 && SYMBOL_PATTERN.test(symbol)),
    ),
  ];
}

function quotePrice(asset: CoinMarketCapAsset): number | null {
  if (Array.isArray(asset.quote)) {
    const usdQuote = asset.quote.find(
      (quote) => quote.symbol?.toUpperCase() === "USD",
    );
    return typeof usdQuote?.price === "number" ? usdQuote.price : null;
  }

  const price = asset.quote?.USD?.price;
  return typeof price === "number" ? price : null;
}

function assetRank(asset: CoinMarketCapAsset): number {
  if (typeof asset.cmc_rank === "number" && asset.cmc_rank > 0) {
    return asset.cmc_rank;
  }
  return Number.MAX_SAFE_INTEGER;
}

function flattenAssets(payload: unknown): CoinMarketCapAsset[] {
  if (Array.isArray(payload)) {
    return payload as CoinMarketCapAsset[];
  }

  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data as CoinMarketCapAsset[];
  }

  if (typeof data !== "object" || data === null) {
    return [];
  }

  return Object.values(data).flatMap((value) =>
    Array.isArray(value) ? value : [value],
  ) as CoinMarketCapAsset[];
}

function pricesFromCoinMarketCap(payload: unknown): Record<string, number> {
  const bestBySymbol = new Map<string, CoinMarketCapAsset>();

  flattenAssets(payload).forEach((asset) => {
    const symbol = asset.symbol?.toUpperCase();
    const price = quotePrice(asset);

    if (
      !symbol ||
      price === null ||
      !Number.isFinite(price) ||
      price <= 0 ||
      asset.is_active === 0
    ) {
      return;
    }

    const current = bestBySymbol.get(symbol);
    if (!current || assetRank(asset) < assetRank(current)) {
      bestBySymbol.set(symbol, asset);
    }
  });

  return Object.fromEntries(
    [...bestBySymbol.entries()].flatMap(([symbol, asset]) => {
      const price = quotePrice(asset);
      return price === null ? [] : [[symbol, price]];
    }),
  );
}

function jsonResponse(
  prices: Record<string, number>,
  error?: string,
  status = 200,
) {
  return NextResponse.json(
    {
      prices,
      ...(error && { error }),
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.COINMARKETCAP_KEY;

  if (!apiKey) {
    return jsonResponse({}, "CoinMarketCap API key is not configured", 200);
  }

  const symbols = sanitizeSymbols(request.nextUrl.searchParams.get("symbols"));
  if (symbols.length === 0) {
    return jsonResponse({});
  }

  const params = new URLSearchParams({
    symbol: symbols.join(","),
    convert: "USD",
    aux: "cmc_rank",
    skip_invalid: "true",
  });

  try {
    const response = await fetch(`${COINMARKETCAP_QUOTES_URL}?${params}`, {
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": apiKey,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return jsonResponse(
        {},
        `CoinMarketCap request failed: ${response.status} ${response.statusText}`,
        502,
      );
    }

    const payload = await response.json();
    return jsonResponse(pricesFromCoinMarketCap(payload));
  } catch (error) {
    console.error("CoinMarketCap API error:", error);
    return jsonResponse({}, "Failed to fetch token prices", 500);
  }
}
