"use client";

import Link from "next/link";
import Image from "next/image";
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
        <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-[150px]" />

        {/* Felt green glow at bottom */}
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[1200px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px]" />

        {/* Top accent */}
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      {/* Floating Cards Background */}
      <FloatingCards />

      {/* Hero Section */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-5xl text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/SlothLabsIcon.png"
              alt="SlothGambol"
              width={150}
              height={150}
              className="rounded-3xl shadow-2xl shadow-purple-500/20"
            />
          </div>

          {/* Badge */}
          <div className="glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-white/80">Live on Avalanche</span>
            <span className="text-purple-400 font-semibold">•</span>
            <span className="text-white/70">Provably Fair</span>
          </div>

          {/* Main Headline */}
          <h1 className="mb-6 text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl">
            <span className="text-white mb-2 block">SLOW HANDS.</span>
            <span className="text-purple-400 block">BIG WINS.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/70 mx-auto mb-4 max-w-3xl text-xl leading-relaxed sm:text-2xl">
            The chillest poker room on the blockchain.{" "}
            <span className="text-purple-300 font-semibold">
              Trustless. Transparent. Take your time.
            </span>
          </p>
          <p className="text-white/60 mx-auto mb-12 max-w-2xl text-lg">
            No rush, no house edge. Just pure, verifiable poker powered by Mental Poker cryptography.
          </p>

          {/* CTA Buttons */}
          <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
            {authenticated ? (
              <>
                <Link
                  href="/lobby"
                  className="group from-purple-500 to-purple-500/80 hover:shadow-purple-500/30 btn-shine relative rounded-xl bg-gradient-to-r px-10 py-5 text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
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
                  href="/faucet"
                  className="border-purple-500/50 hover:border-purple-500/70 rounded-xl border-2 bg-transparent px-10 py-5 text-lg font-bold transition-all duration-300 hover:bg-purple-500/10"
                >
                  <span className="flex items-center justify-center gap-3">
                    <svg
                      className="h-5 w-5 text-purple-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    GET TEST CHIPS
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
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:from-purple-500 hover:to-violet-400 hover:shadow-purple-500/25 disabled:opacity-50"
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
              <span className="text-purple-400">SlothGambol</span>
            </h2>
            <p className="text-foreground/60 mx-auto max-w-2xl">
              Slow down and play smarter. No rush, no house edge—just pure,
              trustless poker on Avalanche.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<CryptoLockIcon />}
              title="Mental Poker Protocol"
              description="Every card is encrypted by all players using commutative cryptography. No one—not even the server—can see cards they shouldn't."
              gradient="from-purple-500/20 to-purple-500/40"
            />
            <FeatureCard
              icon={<AvalancheIcon />}
              title="Avalanche Powered"
              description="Sub-second finality means instant bet confirmations. Transactions settle in under 2 seconds with minimal gas fees."
              gradient="from-purple-500/20 to-gold/20"
            />
            <FeatureCard
              icon={<ShieldIcon />}
              title="Non-Custodial"
              description="Your funds stay in smart contracts you control. Withdraw anytime. No KYC. No withdrawal limits. Your keys, your chips."
              gradient="from-violet-500/20 to-purple-900/40"
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
              <div className="from-purple-600/20 to-violet-900/40 absolute inset-0 bg-gradient-to-br" />
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-8 right-8 opacity-50">
                  <ChipStack />
                </div>
              </div>
              <div className="relative p-10">
                <div className="mb-3 text-sm font-semibold tracking-wider text-purple-400">
                  CASH GAMES
                </div>
                <h3 className="text-primary-text mb-4 text-3xl font-bold">
                  Take Your Time, Stack Your Chips
                </h3>
                <p className="text-foreground/70 mb-6 leading-relaxed">
                  Join tables with stakes from micro to high roller. Your chips
                  are always liquid—withdraw to your wallet whenever you want.
                </p>
                <div className="mb-8 flex flex-wrap gap-3">
                  <span className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400">
                    Texas Hold&apos;em
                  </span>
                  <span className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400">
                    Omaha
                  </span>
                  <span className="rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-400">
                    2-9 Players
                  </span>
                </div>
                <Link
                  href="/lobby"
                  className="inline-flex items-center gap-2 font-semibold text-purple-400 transition-colors hover:text-purple-300"
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
            Ready to <span className="text-purple-400">Hang?</span>
          </h2>
          <p className="text-foreground/70 mb-10 text-xl">
            No rush. Kick back and play at your own pace with the chillest
            poker community on chain.
          </p>
          {authenticated ? (
            <Link
              href="/lobby"
              className="from-purple-500 to-purple-500/80 hover:shadow-purple-500/30 btn-shine inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r px-12 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
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
              className="rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:from-purple-500 hover:to-violet-400 hover:shadow-purple-500/25 disabled:opacity-50"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-purple-500/20 relative z-10 border-t px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <Image
                src="/SlothLabsIcon.png"
                alt="SlothGambol"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-foreground/60 text-sm">
                SlothGambol • Built on Avalanche • Powered by Mental Poker
              </span>
            </div>
            <div className="text-foreground/60 flex items-center gap-8 text-sm">
              <a href="#" className="hover:text-purple-400 transition-colors">
                Docs
              </a>
              <a href="#" className="hover:text-purple-400 transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-purple-400 transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-purple-400 transition-colors">
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
        <div className="text-purple-500 mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-black/30">
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
          className={`poker-chip ${i % 3 === 0 ? "chip-purple" : i % 3 === 1 ? "chip-black" : "chip-gold"} -mt-8 first:mt-0`}
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
