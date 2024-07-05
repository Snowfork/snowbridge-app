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

  const country = geo.country ?? "unknown";
  const region = geo.countryRegion ?? "unknown";

  let blocked = false;

  // Block countries
  if (BLOCKED_COUNTRIES.includes(country)) {
    blocked = true;
  }

  // Block regions
  if (
    BLOCKED_REGIONS.find(
      (x) => x.country === country && x.region === region,
    ) !== undefined
  ) {
    blocked = true;
  }

  if (
    blocked &&
    geo.region === "dev1" &&
    req.nextUrl.host === "localhost:3000"
  ) {
    blocked = false;
  }

  if (blocked) {
    console.log("Country/Region blocked", country, region);
    req.nextUrl.pathname = "/blocked";
    return NextResponse.rewrite(req.nextUrl, { status: 451 });
  }
}
