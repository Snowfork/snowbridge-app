"use client";

import { AssetRegistry } from "@snowbridge/base-types";
import { Provider } from "jotai";
import { createContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LunoProvider } from "@luno-kit/react";
import { lunoKitConfig } from "@/lib/client/lunokit";

export const RegistryContext = createContext<AssetRegistry | null>(null);

const queryClient = new QueryClient();

interface ProviderParams {
  children: React.ReactNode;
  registry: AssetRegistry;
}

export function Providers({ children, registry }: ProviderParams) {
  return (
    <QueryClientProvider client={queryClient}>
      <LunoProvider config={lunoKitConfig}>
        <RegistryContext.Provider value={registry}>
          <Provider>{children}</Provider>
        </RegistryContext.Provider>
      </LunoProvider>
    </QueryClientProvider>
  );
}
