"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const NAV_ITEMS = [
  { href: "/launch", label: "Launchpad", requiresWallet: true },
  { href: "/explore", label: "Explore", requiresWallet: false },
  { href: "/leaderboard", label: "Leaderboard", requiresWallet: false },
  { href: "/dashboard", label: "Dashboard", requiresWallet: true },
];

export function Header() {
  const pathname = usePathname();
  const { setShowAuthFlow, primaryWallet, handleLogOut } = useDynamicContext();

  const truncatedAddress = primaryWallet?.address
    ? `${primaryWallet.address.slice(0, 6)}...${primaryWallet.address.slice(-4)}`
    : null;

  return (
    <header className="border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-accent font-bold tracking-wider text-sm">
            CORPUS
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors flex items-center gap-1.5 ${
                  pathname === item.href
                    ? "text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
                {item.requiresWallet && !primaryWallet && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" title="Wallet required" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        {primaryWallet ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground font-mono bg-surface border border-border px-3 py-1.5">
              {truncatedAddress}
            </span>
            <button
              onClick={() => handleLogOut()}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthFlow(true)}
            className="border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
