"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

interface WalletGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function WalletGate({
  children,
  title = "Connect Wallet to Continue",
  description = "This feature requires a connected wallet.",
}: WalletGateProps) {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();

  if (primaryWallet) return <>{children}</>;

  return (
    <div className="max-w-lg mx-auto px-6 py-32 text-center">
      <div className="bg-surface border border-border p-10">
        <div className="text-muted text-xs mb-6 tracking-wider">[WALLET REQUIRED]</div>
        <div className="w-12 h-12 mx-auto mb-6 border border-border flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-accent mb-2">{title}</h2>
        <p className="text-sm text-muted mb-8 leading-relaxed">{description}</p>
        <button
          onClick={() => setShowAuthFlow(true)}
          className="bg-accent text-background px-8 py-2.5 text-sm font-medium hover:bg-foreground transition-colors"
        >
          Connect Wallet
        </button>
        <p className="text-xs text-muted mt-6">
          Supports MetaMask, WalletConnect, and HashPack
        </p>
      </div>
    </div>
  );
}

export function ConnectButton({ label = "Connect Wallet", className = "" }: { label?: string; className?: string }) {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();

  if (primaryWallet) return null;

  return (
    <button
      onClick={() => setShowAuthFlow(true)}
      className={`border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors ${className}`}
    >
      {label}
    </button>
  );
}

export function useWallet() {
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();
  return {
    isConnected: !!primaryWallet,
    address: primaryWallet?.address ?? null,
    connect: () => setShowAuthFlow(true),
  };
}
