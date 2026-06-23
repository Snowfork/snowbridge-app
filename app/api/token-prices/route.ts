import { NextRequest, NextResponse } from "next/server";

// USD token prices are served by the Snowbridge indexer's `latestTokenPrices`
// GraphQL query (populated hourly by the indexer pricefetcher), replacing the
// previous direct CoinMarketCap integration.
const GRAPHQL_API_URL = process.env.NEXT_PUBLIC_GRAPHQL_API_URL;

const SYMBOL_PATTERN = /^[0-9A-Z$@-]+$/;

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

// Build a map of UPPERCASE symbol -> USD price from the indexer rows. Keyed
// uppercase to match the symbols the client requested (the indexer stores
// mixed-case symbols such as "wstETH"); matching there is case-insensitive.
function pricesFromIndexer(rows: TokenPriceRow[]): Record<string, number> {
  const prices: Record<string, number> = {};

  for (const row of rows) {
    const symbol = row?.symbol?.toUpperCase();
    const price = row?.priceUSD;

    if (!symbol || typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    prices[symbol] = price;
  }

  return prices;
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
  if (!GRAPHQL_API_URL) {
    return jsonResponse({}, "Indexer GraphQL URL is not configured", 200);
  }

  const symbols = sanitizeSymbols(request.nextUrl.searchParams.get("symbols"));
  if (symbols.length === 0) {
    return jsonResponse({});
  }

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: LATEST_TOKEN_PRICES_QUERY,
        variables: { symbols },
      }),
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return jsonResponse(
        {},
        `Indexer request failed: ${response.status} ${response.statusText}`,
        502,
      );
    }

    const payload = await response.json();

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return jsonResponse(
        {},
        `Indexer query error: ${payload.errors[0]?.message ?? "unknown error"}`,
        502,
      );
    }

    const rows: TokenPriceRow[] = payload?.data?.latestTokenPrices ?? [];
    return jsonResponse(pricesFromIndexer(rows));
  } catch (error) {
    console.error("Indexer token price error:", error);
    return jsonResponse({}, "Failed to fetch token prices", 500);
  }
}
