"use client";

import { initializeWeb3Modal } from "@/lib/client/web3modal";
import { BridgeInfo } from "@snowbridge/base-types";
import { Provider } from "jotai";
import { ThemeProvider } from "next-themes";
import { createContext, useEffect } from "react";

export const BridgeInfoContext = createContext<BridgeInfo | null>(null);

interface ProviderParams {
  children: React.ReactNode;
  info: BridgeInfo;
}

export function Providers({ children, info }: ProviderParams) {
  initializeWeb3Modal();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BridgeInfoContext.Provider value={info}>
        <Provider>{children}</Provider>
      </BridgeInfoContext.Provider>
    </ThemeProvider>
  );
}
