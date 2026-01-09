import { NextRequest, NextResponse } from "next/server";
import { DuneClient } from "@duneanalytics/client-sdk";

export async function GET(request: NextRequest) {
  try {
    // Initialize Dune client with API key from environment variable
    const dune = new DuneClient(process.env.DUNE_API_KEY!);

    // Get the latest result for your query
    const queryResult = await dune.getLatestResult({ queryId: 6386607 });

    // Return the result with cache headers
    return NextResponse.json(
      {
        success: true,
        data: queryResult,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers":
            "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
        },
      },
    );
  } catch (error) {
    console.error("Dune API error:", error);

    // Don't expose internal error details to the client
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch portfolio value",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
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
