"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const NAV_ITEMS = [
  { href: "/explore", label: "Agents", requiresWallet: false },
  { href: "/network", label: "Activity", requiresWallet: false },
  { href: "/marketplace", label: "Playbooks", requiresWallet: false },
  { href: "/leaderboard", label: "Leaderboard", requiresWallet: false },
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
          <Link href="/" className="text-nav-accent font-bold tracking-wider text-sm">
            CORPUS
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors flex items-center gap-1.5 ${
                  pathname === item.href
                    ? "text-nav-accent"
                    : "text-muted hover:text-nav-foreground"
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

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`hidden md:inline-flex text-sm transition-colors items-center gap-1.5 ${
              pathname === "/dashboard"
                ? "text-nav-accent"
                : "text-muted hover:text-nav-foreground"
            }`}
          >
            Dashboard
            {!primaryWallet && (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" title="Wallet required" />
            )}
          </Link>
          <Link
            href="/launch"
            className={`hidden md:inline-flex border px-4 py-2 text-sm transition-colors ${
              pathname === "/launch"
                ? "border-accent text-nav-accent"
                : "border-border text-nav-foreground hover:bg-surface-hover"
            }`}
          >
            Launchpad
          </Link>
          {primaryWallet ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-nav-foreground font-mono bg-surface border border-border px-3 py-1.5">
                {truncatedAddress}
              </span>
              <button
                onClick={() => handleLogOut()}
                className="text-xs text-muted hover:text-nav-foreground transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthFlow(true)}
              className="border border-border px-4 py-2 text-sm text-nav-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
