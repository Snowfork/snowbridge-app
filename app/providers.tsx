"use client";

import { BridgeInfo } from "@snowbridge/base-types";
import { Provider } from "jotai";
import { createContext } from "react";

export const BridgeInfoContext = createContext<BridgeInfo | null>(null);

interface ProviderParams {
  children: React.ReactNode;
  info: BridgeInfo;
}

export function Providers({ children, info }: ProviderParams) {
  return (
    <BridgeInfoContext.Provider value={info}>
      <Provider>{children}</Provider>
    </BridgeInfoContext.Provider>
  );
}
