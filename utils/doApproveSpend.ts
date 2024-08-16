"use client";
import { Context, toPolkadot } from "@snowbridge/api";
import { BrowserProvider } from "ethers";

export async function doApproveSpend(
  context: Context | null,
  ethereumProvider: BrowserProvider | null,
  token: string,
  amount: bigint,
): Promise<void> {
  if (context == null || ethereumProvider == null) {
    return;
  }

  const signer = await ethereumProvider.getSigner();
  const response = await toPolkadot.approveTokenSpend(
    context,
    signer,
    token,
    amount,
  );

  console.log("approval response", response);
  const receipt = await response.wait();
  console.log("approval receipt", receipt);
  if (receipt?.status === 0) {
    // check success
    throw Error("Token spend approval failed.");
  }
}
