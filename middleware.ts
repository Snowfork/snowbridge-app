import type { NextRequest } from "next/server";
import { geolocation, ipAddress } from "@vercel/edge";
import { NextResponse } from "next/server";

const BLOCKED_COUNTRIES = ["US"];

export const config = {
  matcher: "/((?!api|_next/static|not-found|blocked|favicon.ico).*)",
};

export function middleware(req: NextRequest) {
  const geo = req.geo ?? geolocation(req);
  const ip = req.ip ?? ipAddress(req);
  // If country is unknown we default to US.

  const country = geo.country ?? "US";
  console.log("!!!!!!!!!!!!!!!!!!!!!!! remove this log", ip, geo);

  // Specify the correct pathname
  if (BLOCKED_COUNTRIES.includes(country) || true) {
    console.log("Country blocked", country);
    req.nextUrl.pathname = "/blocked";
    return NextResponse.rewrite(req.nextUrl, { status: 451 });
  }
}
