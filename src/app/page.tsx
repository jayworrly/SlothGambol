"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Header } from "@/components/ui/Header";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  return (
    <div className="bg-animated-gradient relative min-h-screen overflow-hidden">
      <Header />
      {/* Ambient background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial glow from center */}
        <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-[150px]" />

        {/* Felt green glow at bottom */}
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[1200px] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-[100px]" />

        {/* Top accent */}
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
      </div>

      {/* Floating Cards Background */}
      <FloatingCards />

      {/* Hero Section */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-foreground/80">
              Live on Avalanche C-Chain
            </span>
            <span className="text-avalanche-red font-semibold">•</span>
            <span className="text-foreground/70">Provably Fair</span>
          </div>

          {/* Main Headline */}
          <h1 className="mb-6 text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl">
            <span className="text-primary-text mb-2 block">THE FUTURE OF</span>
            <span className="from-avalanche-red via-avalanche-red to-gold block bg-gradient-to-r bg-clip-text text-transparent">
              ONLINE POKER
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-foreground/70 mx-auto mb-4 max-w-3xl text-xl leading-relaxed sm:text-2xl">
            Trustless gameplay powered by{" "}
            <span className="text-primary-text font-semibold">
              Mental Poker cryptography
            </span>
            .
          </p>
          <p className="text-foreground/60 mx-auto mb-12 max-w-2xl text-lg">
            No house edge. No middlemen. Just pure, verifiable poker where your
            cards are encrypted by every player at the table.
          </p>

          {/* CTA Buttons */}
          <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
            {authenticated ? (
              <>
                <Link
                  href="/lobby"
                  className="group from-avalanche-red to-avalanche-red/80 hover:shadow-avalanche-red/30 btn-shine relative rounded-xl bg-gradient-to-r px-10 py-5 text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                    ENTER THE LOBBY
                  </span>
                </Link>
                <Link
                  href="/cashier"
                  className="border-secondary-accent hover:border-secondary-accent/70 rounded-xl border-2 bg-transparent px-10 py-5 text-lg font-bold transition-all duration-300 hover:bg-white/5"
                >
                  <span className="flex items-center justify-center gap-3">
                    <svg
                      className="text-gold h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                    </svg>
                    DEPOSIT AVAX
                  </span>
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="glass animate-pulse-glow rounded-2xl p-8">
                  <p className="text-foreground/70 mb-4 text-lg">
                    Connect your wallet to enter
                  </p>
                  <button
                    onClick={login}
                    disabled={!ready}
                    className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:from-red-500 hover:to-red-400 hover:shadow-red-500/25 disabled:opacity-50"
                  >
                    Connect Wallet
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="mx-auto grid max-w-2xl grid-cols-3 gap-8">
            <StatItem value="$2.4M+" label="Total Volume" />
            <StatItem value="<2s" label="Settlement" />
            <StatItem value="0%" label="House Edge" highlight />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-primary-text mb-4 text-3xl font-bold sm:text-4xl">
              Why Players Choose{" "}
              <span className="text-avalanche-red">Avalanche Poker</span>
            </h2>
            <p className="text-foreground/60 mx-auto max-w-2xl">
              Experience poker as it should be—transparent, fast, and truly
              decentralized.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<CryptoLockIcon />}
              title="Mental Poker Protocol"
              description="Every card is encrypted by all players using commutative cryptography. No one—not even the server—can see cards they shouldn't."
              gradient="from-avalanche-red/20 to-avalanche-red/40"
            />
            <FeatureCard
              icon={<AvalancheIcon />}
              title="Avalanche Powered"
              description="Sub-second finality means instant bet confirmations. Transactions settle in under 2 seconds with minimal gas fees."
              gradient="from-avalanche-red/20 to-gold/20"
            />
            <FeatureCard
              icon={<ShieldIcon />}
              title="Non-Custodial"
              description="Your funds stay in smart contracts you control. Withdraw anytime. No KYC. No withdrawal limits. Your keys, your chips."
              gradient="from-felt-green/20 to-felt-dark/40"
            />
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Cash Games */}
            <div className="group relative overflow-hidden rounded-3xl">
              <div className="from-felt-green/20 to-felt-dark/40 absolute inset-0 bg-gradient-to-br" />
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-8 right-8 opacity-50">
                  <ChipStack />
                </div>
              </div>
              <div className="relative p-10">
                <div className="mb-3 text-sm font-semibold tracking-wider text-green-400">
                  CASH GAMES
                </div>
                <h3 className="text-primary-text mb-4 text-3xl font-bold">
                  Play Anytime, Leave Anytime
                </h3>
                <p className="text-foreground/70 mb-6 leading-relaxed">
                  Join tables with stakes from micro to high roller. Your chips
                  are always liquid—withdraw to your wallet whenever you want.
                </p>
                <div className="mb-8 flex flex-wrap gap-3">
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">
                    Texas Hold&apos;em
                  </span>
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">
                    Omaha
                  </span>
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">
                    2-9 Players
                  </span>
                </div>
                <Link
                  href="/lobby"
                  className="inline-flex items-center gap-2 font-semibold text-green-400 transition-colors hover:text-green-300"
                >
                  Find a Table
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Tournaments */}
            <div className="group relative overflow-hidden rounded-3xl">
              <div className="from-gold/20 to-gold-dark/40 absolute inset-0 bg-gradient-to-br" />
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-8 right-8 text-6xl opacity-30">
                  🏆
                </div>
              </div>
              <div className="relative p-10">
                <div className="text-gold mb-3 text-sm font-semibold tracking-wider">
                  TOURNAMENTS
                </div>
                <h3 className="text-primary-text mb-4 text-3xl font-bold">
                  Compete for Massive Prizes
                </h3>
                <p className="text-foreground/70 mb-6 leading-relaxed">
                  Daily and weekly tournaments with guaranteed prize pools. From
                  freerolls to high-stakes championships, there&apos;s always
                  action.
                </p>
                <div className="mb-8 flex flex-wrap gap-3">
                  <span className="bg-gold/20 text-gold rounded-full px-3 py-1 text-sm">
                    Freerolls
                  </span>
                  <span className="bg-gold/20 text-gold rounded-full px-3 py-1 text-sm">
                    Sit & Go
                  </span>
                  <span className="bg-gold/20 text-gold rounded-full px-3 py-1 text-sm">
                    MTT
                  </span>
                </div>
                <Link
                  href="/tournaments"
                  className="text-gold hover:text-gold-dark inline-flex items-center gap-2 font-semibold transition-colors"
                >
                  View Schedule
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-primary-text mb-6 text-4xl font-black sm:text-5xl">
            Ready to <span className="text-avalanche-red text-glow">Play?</span>
          </h2>
          <p className="text-foreground/70 mb-10 text-xl">
            Join thousands of players already experiencing the future of online
            poker.
          </p>
          {authenticated ? (
            <Link
              href="/lobby"
              className="from-avalanche-red to-avalanche-red/80 hover:shadow-avalanche-red/30 btn-shine inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r px-12 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              TAKE YOUR SEAT
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          ) : (
            <button
              onClick={login}
              disabled={!ready}
              className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:from-red-500 hover:to-red-400 hover:shadow-red-500/25 disabled:opacity-50"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-secondary-accent/50 relative z-10 border-t px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="from-avalanche-red to-avalanche-red/80 text-primary-text shadow-avalanche-red/20 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br font-bold shadow-lg">
                A
              </div>
              <span className="text-foreground/60 text-sm">
                Built on Avalanche • Powered by Mental Poker Cryptography
              </span>
            </div>
            <div className="text-foreground/60 flex items-center gap-8 text-sm">
              <a href="#" className="hover:text-primary-text transition-colors">
                Docs
              </a>
              <a href="#" className="hover:text-primary-text transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-primary-text transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-primary-text transition-colors">
                Twitter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Floating Cards Component
function FloatingCards() {
  const cards = [
    { suit: "♠", rank: "A", x: "10%", y: "20%", rotate: -15, delay: 0 },
    { suit: "♥", rank: "K", x: "85%", y: "15%", rotate: 20, delay: 1 },
    { suit: "♦", rank: "Q", x: "75%", y: "60%", rotate: -10, delay: 2 },
    { suit: "♣", rank: "J", x: "15%", y: "70%", rotate: 25, delay: 3 },
    { suit: "♥", rank: "A", x: "90%", y: "80%", rotate: -20, delay: 4 },
    { suit: "♠", rank: "10", x: "5%", y: "45%", rotate: 15, delay: 5 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cards.map((card, i) => (
        <div
          key={i}
          className="animate-float-slow absolute opacity-20 transition-opacity hover:opacity-40"
          style={{
            left: card.x,
            top: card.y,
            ["--rotate" as string]: `${card.rotate}deg`,
            animationDelay: `${-card.delay * 1.5}s`,
          }}
        >
          <div
            className={`poker-card ${card.suit === "♥" || card.suit === "♦" ? "red" : "black"}`}
            style={{ transform: `rotate(${card.rotate}deg)` }}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm">{card.rank}</span>
              <span className="text-lg">{card.suit}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Stat Item Component
function StatItem({
  value,
  label,
  highlight = false,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`mb-1 text-3xl font-black sm:text-4xl ${highlight ? "text-glow-gold text-emerald-400" : "text-white"}`}
      >
        {value}
      </div>
      <div className="text-sm tracking-wider text-gray-500 uppercase">
        {label}
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div
      className={`group relative rounded-2xl bg-gradient-to-br p-8 ${gradient} border-secondary-accent/50 hover:border-secondary-accent/70 border transition-all duration-300`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className="text-avalanche-red mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-black/30">
          {icon}
        </div>
        <h3 className="text-primary-text mb-3 text-xl font-bold">{title}</h3>
        <p className="text-foreground/70 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Chip Stack Component
function ChipStack() {
  return (
    <div className="flex flex-col items-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`poker-chip ${i % 3 === 0 ? "chip-red" : i % 3 === 1 ? "chip-black" : "chip-gold"} -mt-8 first:mt-0`}
          style={{
            transform: `translateX(${(i % 2) * 3}px)`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// Icons
function CryptoLockIcon() {
  return (
    <svg
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function AvalancheIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 19h6l4-7 4 7h6L12 2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
