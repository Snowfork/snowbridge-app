import { NextResponse } from "next/server";
import { checkOFAC } from "../app/blocked/api/util";
import { expect, test } from "@jest/globals";

describe("Address blocks are in place", () => {
  test("Address valid.", async () => {
    let result = await checkOFAC("0x90A987B944Cb1dCcE5564e5FDeCD7a54D3de27Fe");
    expect(result).toBe(false);
    let response = NextResponse.json({
      sourceBanned: result,
      beneficiaryBanned: result,
    });
    expect(response).toBeDefined();
  });

  test("Address invalid.", async () => {
    let result = await checkOFAC("0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a");
    expect(result).toBe(true);
  });
});
