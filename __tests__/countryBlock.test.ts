/**
 * @jest-environment node
 */

import { middleware } from "@/middleware";
import { NextURL } from "next/dist/server/web/next-url";
import { NextRequest } from "next/server"; // it's ok to import next/server here
import { instance, mock, reset, when } from "ts-mockito";

const mockedRequest: NextRequest = mock(NextRequest);

afterEach(() => {
  reset(mockedRequest);
});
// and then test
test("Country blocks are in place.", async () => {
  const domain = "https://example.com";
  const url = new URL("/some-path", domain);

  const nextUrl = new NextURL(url);

  when(mockedRequest.nextUrl).thenReturn(nextUrl);

  const result = middleware(instance(mockedRequest));

  expect(result).toBeDefined();

  expect(result.status).toBe(200);

  expect(result.headers.get("x-middleware-rewrite")).toBe(
    domain + "/other-path",
  );
});
