import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

// Block Austria, prefer Germany
const BLOCKED_COUNTRY = "AT";

// Limit middleware pathname config
export const config = {
  matcher: "/",
};

export function middleware(req: NextRequest) {
  // Extract country
  const country = req.geo?.country || "US";
  console.log("bad log", req.ip || "no ip", country);

  // Specify the correct pathname
  if (country === BLOCKED_COUNTRY) {
    req.nextUrl.pathname = "/blocked";
  }

  // Rewrite to URL
  return NextResponse.rewrite(req.nextUrl);
}
