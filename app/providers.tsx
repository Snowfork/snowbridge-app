"use client";

import { AssetRegistry } from "@snowbridge/base-types";
import { Provider } from "jotai";
import { createContext } from "react";

export const RegistryContext = createContext<AssetRegistry | null>(null);

interface ProviderParams {
  children: React.ReactNode;
  registry: AssetRegistry;
}

export function Providers({ children, registry }: ProviderParams) {
  return (
    <RegistryContext.Provider value={registry}>
      <Provider>{children}</Provider>
    </RegistryContext.Provider>
  );
}
