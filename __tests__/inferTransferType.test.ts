import { describe, expect, test } from "vitest";
import type { AssetRegistry } from "@snowbridge/base-types";
import type { Transfer } from "@/store/transferActivity";
import { inferTransferDetails } from "@/utils/inferTransferType";

const registry = {
  ethChainId: 1,
  parachains: {
    polkadot_2034: { id: 2034, kind: "polkadot", key: "polkadot_2034" },
  },
  ethereumChains: {
    ethereum_1: { id: 1, kind: "ethereum", key: "ethereum_1", assets: {} },
    ethereum_l2_42161: {
      id: 42161,
      kind: "ethereum_l2",
      key: "ethereum_l2_42161",
      name: "Arbitrum",
      assets: {},
    },
  },
} as unknown as AssetRegistry;

function transfer(destinationId: number): Transfer {
  return {
    id: "0x447ae8d0",
    sourceKind: "polkadot",
    sourceId: 2034,
    destinationKind: "ethereum_l2",
    destinationId,
  } as Transfer;
}

describe("inferTransferDetails", () => {
  test("an unknown L2 chain id does not throw", () => {
    const details = inferTransferDetails(transfer(1), registry);
    expect(details.kind).toBe("polkadot->ethereum_l2");
    expect(details.destination.key).toBe("ethereum_l2_1");
    expect(details.destination.id).toBe(1);
  });

  test("a known L2 chain still resolves from the registry", () => {
    const details = inferTransferDetails(transfer(42161), registry);
    expect(details.destination.kind).toBe("ethereum_l2");
    if (details.destination.kind !== "ethereum_l2") return;
    expect(details.destination.ethChain.name).toBe("Arbitrum");
  });
});
