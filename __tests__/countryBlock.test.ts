/**
 * @jest-environment node
 */

import { middleware } from "@/middleware";
import { NextURL } from "next/dist/server/web/next-url";
import { NextRequest } from "next/server"; // it's ok to import next/server here
import { instance, mock, reset, when } from "ts-mockito";

const mockedRequest: NextRequest = mock(NextRequest);
const COUNTRY_HEADER_NAME = "x-vercel-ip-country";
const REGION_HEADER_NAME = "x-vercel-ip-country-region";

afterEach(() => {
  reset(mockedRequest);
});

function countryBlockCase(
  domain: string,
  blocked: boolean,
  country?: string,
  region?: string,
) {
  test(`Domain '${domain}' from ${country ?? "n/a"}-${region ?? "*"} ${blocked ? "block" : "allow"}`, () => {
    const url = new URL("/", domain);
    const nextUrl = new NextURL(url);

    when(mockedRequest.nextUrl).thenReturn(nextUrl);
    const headers = new Headers();
    if (country) {
      headers.set(COUNTRY_HEADER_NAME, country);
    }
    if (region) {
      headers.set(REGION_HEADER_NAME, region);
    }
    when(mockedRequest.headers).thenReturn(headers);

    const result = middleware(instance(mockedRequest));
    if (!blocked) {
      expect(result).toBeUndefined();
    }
    if (blocked) {
      expect(result).toBeDefined();
      expect(result?.status).toBe(451);

      expect(result?.headers.get("x-middleware-rewrite")).toBe(
        domain + "/blocked",
      );
    }
  });
}
// and then test
describe("Country blocks are in place.", () => {
  // Don't block when running on localhost.
  countryBlockCase("https://localhost:3000", false);

  // Block when country header is not set.
  countryBlockCase("https://app.snowbridge.network", true);

  // Allow US
  countryBlockCase("https://app.snowbridge.network", false, "US");
  countryBlockCase("https://app.snowbridge.network", false, "US", "CA");

  // Country Blocks
  countryBlockCase("https://app.snowbridge.network", true, "RU");
  countryBlockCase("https://app.snowbridge.network", true, "RU", "KIR");
  countryBlockCase("https://app.snowbridge.network", true, "CU");
  countryBlockCase("https://app.snowbridge.network", true, "IR");
  countryBlockCase("https://app.snowbridge.network", true, "SY");
  countryBlockCase("https://app.snowbridge.network", true, "KP");

  // Region Blocks
  countryBlockCase("https://app.snowbridge.network", true, "UA"); // Block Unknown region
  countryBlockCase("https://app.snowbridge.network", false, "UA", "23"); // Allow Zaporizhzhia
  countryBlockCase("https://app.snowbridge.network", true, "UA", "14"); // Block Donetsk region
  countryBlockCase("https://app.snowbridge.network", true, "UA", "43"); // Block Crimea region
  countryBlockCase("https://app.snowbridge.network", true, "UA", "09"); // Block Luhansk region
});
