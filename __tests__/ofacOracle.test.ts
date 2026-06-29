import { describe, test, expect } from "vitest";
import { isAddressSanctioned } from "@/lib/client/ofacOracle";

// The oracle is EVM-only. Non-EVM (Substrate SS58) addresses can't be screened
// and resolve to false without any network call.
describe("OFAC oracle address handling", () => {
  test("Substrate SS58 address is not flagged (and makes no oracle call)", async () => {
    const result = await isAddressSanctioned(
      "5CGQZm3deufKWnVWLPuRSFrYVHZ71pTUHF1a1iHCdaozg44B",
    );
    expect(result).toBe(false);
  });

  test("empty / invalid address is not flagged", async () => {
    expect(await isAddressSanctioned("0x")).toBe(false);
    expect(await isAddressSanctioned("not-an-address")).toBe(false);
  });
});
