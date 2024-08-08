"use client";
import { Context, toPolkadot } from "@snowbridge/api";
import { BrowserProvider } from "ethers";
import { doApproveSpend } from "../utils/doApproveSpend";

export async function doDepositAndApproveWeth(
  context: Context | null,
  ethereumProvider: BrowserProvider | null,
  token: string,
  amount: bigint,
): Promise<void> {
  if (context == null || ethereumProvider == null) return;

  const signer = await ethereumProvider.getSigner();
  const response = await toPolkadot.depositWeth(context, signer, token, amount);
  console.log("deposit response", response);
  const receipt = await response.wait();
  console.log("deposit receipt", receipt);
  if (receipt?.status === 0) {
    // check success
    throw Error("Token deposit failed.");
  }

  return await doApproveSpend(context, ethereumProvider, token, amount);
}
