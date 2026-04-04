"use client";

import { useEffect } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

export function Providers({ children }: { children: React.ReactNode }) {
  // Suppress IDKit Radix Dialog accessibility warnings
  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;
    const suppress = (orig: typeof console.error) => (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("DialogContent") || msg.includes("DialogTitle") || msg.includes("aria-describedby")) return;
      orig(...args);
    };
    console.error = suppress(origError);
    console.warn = suppress(origWarn);
    return () => { console.error = origError; console.warn = origWarn; };
  }, []);

  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID || "PLACEHOLDER_ENV_ID",
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
