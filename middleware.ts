import type { NextRequest } from "next/server";
import { geolocation, ipAddress } from "@vercel/edge";
import { NextResponse } from "next/server";

const BLOCKED_COUNTRIES = [
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "RU", // Russia
  "unknown", // Block if we cannot identify country
];

const BLOCKED_REGIONS = [
  { country: "UA", region: "14" }, // Ukraine Donetsk
  { country: "UA", region: "43" }, // Ukraine Crimea
  { country: "UA", region: "09" }, // Ukraine Luhansk
  { country: "UA", region: "unknown" }, // Ukraine if we cannot identify region
];

export const config = {
  matcher: "/((?!api|_next/static|not-found|blocked|favicon.ico).*)",
};

export function middleware(req: NextRequest) {
  const geo = geolocation(req);
  const ip = ipAddress(req) || req.ip;
  // If country is unknown we default to US.

  const country = geo.country ?? "unknown";
  const region = geo.countryRegion ?? "unknown";

  console.log("!!!!!!!!!!!!!!!!!!!!!!! remove this log", geo);

  let blocked = false;

  // Block countries
  if (BLOCKED_COUNTRIES.includes(country)) {
    console.log("Country blocked", geo);
    blocked = true;
  }

  // Block regions
  if (
    BLOCKED_REGIONS.find(
      (x) => x.country === country && x.region === region,
    ) !== undefined
  ) {
    console.log("Region blocked", geo);
    blocked = true;
  }

  if (blocked) {
    req.nextUrl.pathname = "/blocked";
    return NextResponse.rewrite(req.nextUrl, { status: 451 });
  }
}
