"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { PokerChipIcon } from "./PokerChipIcon";
import { shortenAddress } from "@/lib/utils";

export function Header() {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { address, isConnected } = useAccount();

  const displayAddress = address || user?.wallet?.address;

  return (
    <header className="border-secondary-accent bg-background/50 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <PokerChipIcon className="text-gold h-8 w-8" />
            <span
              className="from-gold to-gold-dark bg-gradient-to-r bg-clip-text text-xl font-bold text-transparent"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}
            >
              Avalanche Poker
            </span>
          </Link>

          {authenticated && (
            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/lobby"
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                Lobby
              </Link>
              <Link
                href="/tournaments"
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                Tournaments
              </Link>
              <Link
                href="/profile"
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/cashier"
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                Cashier
              </Link>
            </nav>
          )}
        </div>

        {/* Auth Button */}
        {ready && (
          <>
            {authenticated ? (
              <div className="flex items-center gap-3">
                {displayAddress && (
                  <div className="hidden sm:flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-gray-300">
                      {shortenAddress(displayAddress)}
                    </span>
                  </div>
                )}
                <button
                  onClick={logout}
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-6 py-2 font-semibold text-white shadow-lg transition-all hover:from-red-500 hover:to-red-400 hover:shadow-red-500/25"
              >
                Connect
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
