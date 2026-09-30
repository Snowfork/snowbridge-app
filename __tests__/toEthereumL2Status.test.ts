import { describe, expect, test } from "vitest";
import { history } from "@snowbridge/api";

function transfer(overrides: Record<string, unknown> = {}) {
  return {
    id: "0x9a1218d9",
    sourceNetwork: "polkadot",
    sourceParaId: 2034,
    destinationNetwork: "ethereum_l2",
    l2ChainId: 8453,
    timestamp: "2026-09-30T05:00:48.000Z",
    senderAddress: "0x1",
    tokenAddress: "0x0",
    destinationAddress: "0x2",
    amount: "1100000000000000",
    txHash: "0x3",
    blockNumber: 1,
    status: history.TransferStatus.Pending,
    toDestination: {
      blockNumber: 26088082,
      txHash: "0x7cca16d5",
      messageId: "0x9a1218d9",
      channelId: "",
      nonce: 1444,
      success: true,
    },
    ...overrides,
  };
}

describe("buildToEthereumTransferResult L2 status", () => {
  test("a filled L2 transfer is complete when the indexer status is complete and no fill row exists", () => {
    const result = history.buildToEthereumTransferResult(
      transfer({ status: history.TransferStatus.Complete }),
    );
    expect(result.status).toBe(history.TransferStatus.Complete);
    expect(result.toEthereumL2).toBeUndefined();
  });

  test("an L2 transfer stays pending until the indexer status leaves pending", () => {
    const result = history.buildToEthereumTransferResult(transfer());
    expect(result.status).toBe(history.TransferStatus.Pending);
  });

  test("an L2 transfer is failed when the indexer status is failed", () => {
    const result = history.buildToEthereumTransferResult(
      transfer({ status: history.TransferStatus.Failed }),
    );
    expect(result.status).toBe(history.TransferStatus.Failed);
  });

  test("a failed Ethereum dispatch stays failed even if the indexer status is complete", () => {
    const result = history.buildToEthereumTransferResult(
      transfer({
        status: history.TransferStatus.Complete,
        toDestination: {
          blockNumber: 1,
          txHash: "0x4",
          messageId: "0x9a1218d9",
          channelId: "",
          nonce: 1,
          success: false,
        },
      }),
    );
    expect(result.status).toBe(history.TransferStatus.Failed);
  });

  test("an indexed fill row still completes the transfer", () => {
    const result = history.buildToEthereumTransferResult(
      transfer({
        toEthereumL2: {
          blockNumber: 10,
          depositId: "4696356",
          txHash: "0xfill",
        },
      }),
    );
    expect(result.status).toBe(history.TransferStatus.Complete);
    expect(result.toEthereumL2?.txHash).toBe("0xfill");
  });

  test("an Ethereum destination is complete after a successful dispatch", () => {
    const result = history.buildToEthereumTransferResult(
      transfer({ destinationNetwork: "ethereum", l2ChainId: 1 }),
    );
    expect(result.status).toBe(history.TransferStatus.Complete);
  });
});
