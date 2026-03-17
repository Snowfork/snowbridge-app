import { NextResponse } from "next/server";

/** Response shape from https://dashboard.snowbridge.network/api/tvl */
interface SnowbridgeTvlResponse {
  tvlUsd: number;
  balanceEth?: number;
  ethPriceUsd?: number;
  ethTvlUsd?: number;
  tokenTvlUsd?: number;
  tokens?: Array<{ symbol: string; balance: number; balanceUsd: number }>;
}

/** Mock TVL data for local UI testing (matches dashboard.snowbridge.network/api/tvl shape) */
const MOCK_TVL_DATA: SnowbridgeTvlResponse = {
  tvlUsd: 56337162.01133176,
  balanceEth: 976.5710405272512,
  ethPriceUsd: 2058.221763020397,
  ethTvlUsd: 2009999.7687486622,
  tokenTvlUsd: 54327162.242583096,
  tokens: [
    {
      symbol: "TRAC",
      balance: 119281209.23419076,
      balanceUsd: 37718971.6203163,
    },
    {
      symbol: "tBTC",
      balance: 76.04455057725438,
      balanceUsd: 5371901.960729454,
    },
    {
      symbol: "wstETH",
      balance: 847.3487207767344,
      balanceUsd: 2147955.5038143694,
    },
    {
      symbol: "PAXG",
      balance: 327.9124754157182,
      balanceUsd: 1702568.8338588753,
    },
    {
      symbol: "MYTH",
      balance: 463588835.0483255,
      balanceUsd: 1345868.4536134077,
    },
    {
      symbol: "KILT",
      balance: 58152417.939953,
      balanceUsd: 1026784.4500338034,
    },
    {
      symbol: "WETH",
      balance: 471.55014787057473,
      balanceUsd: 973111.6622948119,
    },
    {
      symbol: "LINK",
      balance: 105646.04313901994,
      balanceUsd: 959678.4418698573,
    },
    {
      symbol: "sUSDe",
      balance: 655014.1222437759,
      balanceUsd: 800710.581008186,
    },
    {
      symbol: "USDT",
      balance: 637817.098979,
      balanceUsd: 637784.7203503338,
    },
    {
      symbol: "USDC",
      balance: 539162.662554,
      balanceUsd: 539110.6342056852,
    },
    {
      symbol: "AAVE",
      balance: 3832.070503882414,
      balanceUsd: 427287.2557997714,
    },
    {
      symbol: "SKY",
      balance: 2975778.8777356995,
      balanceUsd: 233065.93977023155,
    },
    {
      symbol: "CFG",
      balance: 1168835.3352360001,
      balanceUsd: 163272.0141173313,
    },
    {
      symbol: "LDO",
      balance: 591494.6805530414,
      balanceUsd: 170362.35770828882,
    },
    {
      symbol: "ENA",
      balance: 859004.0389897999,
      balanceUsd: 89781.85705662453,
    },
    {
      symbol: "WBTC",
      balance: 0.26863588,
      balanceUsd: 18945.956035768795,
    },
  ],
};

function jsonResponse(
  success: boolean,
  tvlUsd: number | null,
  data: SnowbridgeTvlResponse | null,
  error?: string,
  status = 200,
) {
  return NextResponse.json(
    {
      success,
      tvlUsd,
      ...(data && { data }),
      ...(error && { error }),
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers":
          "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
      },
    },
  );
}

export async function GET() {
  // Use server-only env so API route reliably sees it at runtime (NEXT_PUBLIC_* can be build-time only)
  const useMock =
    process.env.SNOWBRIDGE_DEV_MODE === "1" ||
    process.env.NEXT_PUBLIC_SNOWBRIDGE_DEV_MODE === "1";
  if (useMock) {
    return jsonResponse(true, MOCK_TVL_DATA.tvlUsd, MOCK_TVL_DATA);
  }

  try {
    const tvlResponse = await fetch(
      "https://dashboard.snowbridge.network/api/tvl",
      {
        next: { revalidate: 300 },
      },
    );

    if (!tvlResponse.ok) {
      throw new Error(
        `Failed to fetch TVL from Snowbridge dashboard: ${tvlResponse.status} ${tvlResponse.statusText}`,
      );
    }

    const tvlData = (await tvlResponse.json()) as SnowbridgeTvlResponse;
    const tvlUsd =
      tvlData != null && typeof tvlData.tvlUsd === "number"
        ? tvlData.tvlUsd
        : null;

    return jsonResponse(true, tvlUsd, tvlData);
  } catch (error) {
    console.error("Snowbridge TVL API error:", error);
    return jsonResponse(
      false,
      null,
      null,
      "Failed to fetch portfolio value",
      500,
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers":
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
