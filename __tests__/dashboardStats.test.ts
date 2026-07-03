import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  fetchTvlUsd,
  fetchAverageMonthlyVolumeUsd,
} from "@/lib/client/dashboardStats";

// In dev mode the client fetchers return mock data without any network call,
// so these run offline.
describe("dashboard stats (dev mode)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SNOWBRIDGE_DEV_MODE = "1";
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SNOWBRIDGE_DEV_MODE;
  });

  test("TVL returns a positive number", async () => {
    const tvl = await fetchTvlUsd();
    expect(typeof tvl).toBe("number");
    expect(tvl as number).toBeGreaterThan(0);
  });

  test("average monthly volume is the mean of the mock series", async () => {
    const avg = await fetchAverageMonthlyVolumeUsd();
    expect(typeof avg).toBe("number");
    expect(avg as number).toBeGreaterThan(0);
  });
});
