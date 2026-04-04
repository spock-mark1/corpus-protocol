"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID || "PLACEHOLDER_ENV_ID",
        walletConnectors: [],
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
