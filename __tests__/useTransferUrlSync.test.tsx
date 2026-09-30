import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, test } from "vitest";
import { useTransferUrlSync } from "@/hooks/useTransferUrlSync";

function TransferUrlHarness() {
  const [transfer, setTransfer] = useState({
    source: "ethereum_1",
    destination: "polkadot_1000",
    token: "0x0000000000000000000000000000000000000000",
    amount: "0.0",
  });
  const location = useLocation();

  useTransferUrlSync(transfer);

  return (
    <>
      <button
        onClick={() =>
          setTransfer({
            source: "polkadot_1000",
            destination: "ethereum_1",
            token: "0x1111111111111111111111111111111111111111",
            amount: "12.5",
          })
        }
      >
        Change transfer
      </button>
      <output>{location.pathname + location.search}</output>
    </>
  );
}

describe("useTransferUrlSync", () => {
  test("replaces the send URL when transfer choices change", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/send?source=ethereum_1&destination=polkadot_1000&token=0x0000000000000000000000000000000000000000&amount=0.0",
        ]}
      >
        <TransferUrlHarness />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change transfer" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "/send?source=polkadot_1000&destination=ethereum_1&token=0x1111111111111111111111111111111111111111&amount=12.5",
      ),
    );
  });
});
