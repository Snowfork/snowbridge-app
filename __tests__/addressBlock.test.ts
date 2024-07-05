import { checkOFAC } from "@/lib/ofac";
import { expect, test } from "@jest/globals";

const apiKey = process.env.CHAINALYSIS_KEY || "unknown";

describe.skip("Address blocks are in place", () => {
  test("key is set", () => {
    expect(apiKey).not.toBe("unknown");
  });
  test("Address valid.", async () => {
    let result = await checkOFAC(
      "0x90A987B944Cb1dCcE5564e5FDeCD7a54D3de27Fe",
      apiKey,
    );
    expect(result).toBe(false);
  });

  test("Substrate 58 address is valid.", async () => {
    let result = await checkOFAC(
      "5CGQZm3deufKWnVWLPuRSFrYVHZ71pTUHF1a1iHCdaozg44B",
      apiKey,
    );
    expect(result).toBe(false);
  });

  test("Substrate address is valid.", async () => {
    let result = await checkOFAC(
      "0x08ecbc83c58a5a74f7e737fec1e03589bfb1090d7df1448f7dd531306464056a",
      apiKey,
    );
    expect(result).toBe(false);
  });

  test("Even empty address is valid.", async () => {
    let result = await checkOFAC("0x", apiKey);
    expect(result).toBe(false);
  });

  test("Address 1 invalid.", async () => {
    let result = await checkOFAC(
      "0xa160cdab225685da1d56aa342ad8841c3b53f291",
      apiKey,
    );
    expect(result).toBe(true);
  });

  test("Address 2 invalid.", async () => {
    let result = await checkOFAC(
      "0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a",
      apiKey,
    );
    expect(result).toBe(true);
  });
});
