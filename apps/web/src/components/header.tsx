"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const NAV_ITEMS = [
  { href: "/launch", label: "Launchpad" },
  { href: "/explore", label: "Explore" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard", label: "Dashboard" },
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
                className={`text-sm transition-colors ${
                  pathname === item.href
                    ? "text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
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
            className="border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
