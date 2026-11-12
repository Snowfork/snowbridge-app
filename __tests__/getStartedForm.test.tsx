import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import { GetStartedForm } from "@/components/home/GetStartedForm";
import { ethereumAccountAtom } from "@/store/ethereum";
import { bridgeInfoFor } from "@snowbridge/registry";

const ethereumSource = {
  kind: "ethereum",
  id: 1,
  key: "ethereum_1",
  destinations: {
    polkadot_1000: {
      kind: "polkadot",
      id: 1000,
      key: "polkadot_1000",
      assets: ["0x0000000000000000000000000000000000000000"],
    },
  },
};

const polkadotDestination = ethereumSource.destinations.polkadot_1000;

vi.mock("@snowbridge/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@snowbridge/registry")>();
  return {
    ...actual,
    getTransferLocations: () => [ethereumSource],
    getTransferLocation: (
      _registry: unknown,
      location: typeof ethereumSource | typeof polkadotDestination,
    ) => location,
  };
});

vi.mock("@/components/TokenSelector", () => ({
  TokenSelector: ({ sourceAccount }: { sourceAccount?: string }) => (
    <div data-testid="token-selector" data-source-account={sourceAccount} />
  ),
}));

vi.mock("@/utils/tokenPrices", () => ({
  fetchTokenPrices: async () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const registry = bridgeInfoFor("polkadot_mainnet").registry;

describe("GetStartedForm", () => {
  test("passes the connected Ethereum account to the token selector", () => {
    const store = createStore();
    const account = "0x1111111111111111111111111111111111111111";
    store.set(ethereumAccountAtom, account);

    render(
      <Provider store={store}>
        <GetStartedForm assetRegistry={registry} routes={[]} />
      </Provider>,
    );

    expect(screen.getByTestId("token-selector")).toHaveAttribute(
      "data-source-account",
      account,
    );
  });
});
