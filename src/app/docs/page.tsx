"use client";

import { Header } from "@/components/ui/Header";
import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Header />

      <main className="container mx-auto max-w-4xl flex-1 px-4 py-12">
        {/* Title */}
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-white">Documentation</h1>
          <p className="text-lg text-gray-400">
            Everything you need to know about SlothGambol - the chillest on-chain poker platform.
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 rounded-xl border border-purple-500/20 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Contents</h2>
          <ul className="space-y-2 text-purple-400">
            <li><a href="#overview" className="hover:text-purple-300">Overview</a></li>
            <li><a href="#getting-started" className="hover:text-purple-300">Getting Started</a></li>
            <li><a href="#how-it-works" className="hover:text-purple-300">How It Works</a></li>
            <li><a href="#smart-contracts" className="hover:text-purple-300">Smart Contracts</a></li>
            <li><a href="#mental-poker" className="hover:text-purple-300">Mental Poker Protocol</a></li>
            <li><a href="#faq" className="hover:text-purple-300">FAQ</a></li>
          </ul>
        </nav>

        {/* Overview */}
        <Section id="overview" title="Overview">
          <p>
            SlothGambol is a decentralized poker platform built on Avalanche. We combine the speed
            of Avalanche&apos;s sub-second finality with cryptographic card shuffling to create a
            provably fair, non-custodial poker experience.
          </p>
          <FeatureGrid>
            <Feature
              title="Non-Custodial"
              description="Your chips stay in smart contracts you control. Withdraw anytime."
            />
            <Feature
              title="Provably Fair"
              description="Mental Poker cryptography ensures no one can cheat - not even us."
            />
            <Feature
              title="Fast Settlement"
              description="Avalanche's sub-2-second finality means instant chip transfers."
            />
            <Feature
              title="No House Edge"
              description="Peer-to-peer poker. We don't take rake from your pots."
            />
          </FeatureGrid>
        </Section>

        {/* Getting Started */}
        <Section id="getting-started" title="Getting Started">
          <h3 className="mb-4 text-xl font-semibold text-white">1. Connect Your Wallet</h3>
          <p className="mb-6">
            Click &quot;Connect&quot; in the top right and use MetaMask or any WalletConnect-compatible wallet.
            Make sure you&apos;re on the Avalanche Fuji Testnet.
          </p>

          <h3 className="mb-4 text-xl font-semibold text-white">2. Get Test AVAX</h3>
          <p className="mb-6">
            Visit our <Link href="/faucet" className="text-purple-400 hover:text-purple-300">Faucet</Link> page
            to get free test AVAX from the official Avalanche faucet, then claim test chips.
          </p>

          <h3 className="mb-4 text-xl font-semibold text-white">3. Join a Table</h3>
          <p className="mb-6">
            Head to the <Link href="/lobby" className="text-purple-400 hover:text-purple-300">Lobby</Link>,
            pick a table that matches your stakes, click an empty seat, and buy in.
          </p>

          <h3 className="mb-4 text-xl font-semibold text-white">4. Play Poker</h3>
          <p>
            Once seated, wait for another player to join. The game starts automatically with 2+ players.
            Use the action buttons or keyboard shortcuts to play.
          </p>

          <div className="mt-6 rounded-lg bg-gray-800/50 p-4">
            <h4 className="mb-2 font-semibold text-white">Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
              <div><kbd className="rounded bg-gray-700 px-2 py-1">F</kbd> Fold</div>
              <div><kbd className="rounded bg-gray-700 px-2 py-1">C</kbd> Check/Call</div>
              <div><kbd className="rounded bg-gray-700 px-2 py-1">R</kbd> Raise</div>
              <div><kbd className="rounded bg-gray-700 px-2 py-1">A</kbd> All-In</div>
            </div>
          </div>
        </Section>

        {/* How It Works */}
        <Section id="how-it-works" title="How It Works">
          <h3 className="mb-4 text-xl font-semibold text-white">Chip Flow</h3>
          <div className="mb-8 space-y-4">
            <Step number={1} title="Deposit">
              Send AVAX to the ChipVault contract. Your balance is tracked on-chain.
            </Step>
            <Step number={2} title="Join Table">
              When you sit down, your buy-in amount is locked in the smart contract.
            </Step>
            <Step number={3} title="Play">
              Hands are dealt using Mental Poker cryptography. Bets are tracked by the server.
            </Step>
            <Step number={4} title="Settlement">
              When you leave or a hand ends, winnings are settled on-chain atomically.
            </Step>
            <Step number={5} title="Withdraw">
              Your available balance can be withdrawn to your wallet anytime.
            </Step>
          </div>

          <h3 className="mb-4 text-xl font-semibold text-white">Architecture</h3>
          <p>
            SlothGambol uses a hybrid architecture for the best balance of speed and security:
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-gray-400">
            <li><strong className="text-white">Smart Contracts:</strong> Handle deposits, withdrawals, chip locking, and settlement</li>
            <li><strong className="text-white">Game Server:</strong> Manages real-time gameplay, hand logic, and Mental Poker coordination</li>
            <li><strong className="text-white">WebSocket:</strong> Provides instant updates for a smooth playing experience</li>
            <li><strong className="text-white">Database:</strong> Stores hand history and player statistics</li>
          </ul>
        </Section>

        {/* Smart Contracts */}
        <Section id="smart-contracts" title="Smart Contracts">
          <div className="rounded-xl border border-purple-500/20 bg-gray-900/50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">ChipVault</h3>
            <p className="mb-4 text-gray-400">
              The main contract that manages all chip balances, table locks, and settlements.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Network:</span>
                <span className="text-white">Avalanche Fuji Testnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Address:</span>
                <a
                  href="https://testnet.snowtrace.io/address/0x4168d40F0B2906495510517646a8FB406cfbB38b"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-purple-400 hover:text-purple-300"
                >
                  0x4168d40F...cfbB38b
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verified:</span>
                <a
                  href="https://repo.sourcify.dev/contracts/full_match/43113/0x4168d40F0B2906495510517646a8FB406cfbB38b/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  Sourcify ✓
                </a>
              </div>
            </div>
          </div>

          <h3 className="mb-4 mt-8 text-xl font-semibold text-white">Key Functions</h3>
          <div className="space-y-4">
            <FunctionDoc
              name="deposit()"
              description="Deposit AVAX to receive chips. Min 0.01 AVAX, Max 1000 AVAX."
              access="Public"
            />
            <FunctionDoc
              name="withdraw(amount)"
              description="Withdraw AVAX from your available balance."
              access="Public"
            />
            <FunctionDoc
              name="lockChips(player, amount, tableId)"
              description="Lock chips when a player joins a table. Called by authorized servers."
              access="Server Only"
            />
            <FunctionDoc
              name="settleTable(tableId, players, deltas)"
              description="Settle a hand by applying win/loss deltas. Must sum to zero."
              access="Server Only"
            />
          </div>
        </Section>

        {/* Mental Poker */}
        <Section id="mental-poker" title="Mental Poker Protocol">
          <p className="mb-6">
            Mental Poker is a cryptographic protocol that allows players to play a fair game of
            cards without a trusted third party to shuffle and deal. Here&apos;s how it works:
          </p>

          <div className="space-y-6">
            <div className="rounded-lg bg-gray-800/50 p-4">
              <h4 className="mb-2 font-semibold text-purple-400">1. Commitment Phase</h4>
              <p className="text-gray-400">
                Each player generates a secret key and commits to it by publishing a hash.
                This ensures no one can change their key later.
              </p>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-4">
              <h4 className="mb-2 font-semibold text-purple-400">2. Shuffle Phase</h4>
              <p className="text-gray-400">
                Players take turns encrypting and shuffling the deck. Each player&apos;s encryption
                layer ensures that no single party knows the card order.
              </p>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-4">
              <h4 className="mb-2 font-semibold text-purple-400">3. Dealing</h4>
              <p className="text-gray-400">
                To reveal a card, all players except the recipient provide their decryption keys
                for that specific card. Only the recipient can see their hole cards.
              </p>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-4">
              <h4 className="mb-2 font-semibold text-purple-400">4. Showdown</h4>
              <p className="text-gray-400">
                At showdown, players reveal their keys to decrypt all cards. Anyone can verify
                the shuffle was fair by checking the cryptographic proofs.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-amber-400">
              <strong>Note:</strong> Mental Poker is currently in development. The testnet uses
              server-side shuffling while we complete the full cryptographic implementation.
            </p>
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" title="Frequently Asked Questions">
          <div className="space-y-6">
            <FAQ
              question="Is this real money?"
              answer="Currently, SlothGambol is on Avalanche Fuji Testnet using test AVAX. This has no real value. Mainnet launch with real AVAX is planned for the future."
            />
            <FAQ
              question="How do I get test chips?"
              answer="Visit the Faucet page, get free test AVAX from the Avalanche faucet, then claim chips. There's a 1-hour cooldown between claims."
            />
            <FAQ
              question="Can I trust the shuffle?"
              answer="Once Mental Poker is fully implemented, the shuffle is provably fair - cryptographically guaranteed. No one (including us) can manipulate the cards."
            />
            <FAQ
              question="What happens if I disconnect?"
              answer="Your chips remain locked at the table. If you don't return within the time limit, you'll be folded automatically. Your remaining chips will be unlocked."
            />
            <FAQ
              question="Is there rake?"
              answer="No! SlothGambol doesn't take any rake from pots. It's pure peer-to-peer poker."
            />
            <FAQ
              question="Which wallets are supported?"
              answer="MetaMask, WalletConnect, Coinbase Wallet, and most Ethereum-compatible wallets work with SlothGambol."
            />
            <FAQ
              question="Where can I report bugs?"
              answer="Please report issues on our GitHub repository or reach out on Discord."
            />
          </div>
        </Section>

        {/* Footer Links */}
        <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <a
            href="https://github.com/jayworrly/SlothGambol"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400"
          >
            GitHub
          </a>
          <a
            href="https://testnet.snowtrace.io/address/0x4168d40F0B2906495510517646a8FB406cfbB38b"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400"
          >
            Contract
          </a>
          <Link href="/lobby" className="hover:text-purple-400">
            Play Now
          </Link>
        </div>
      </main>
    </div>
  );
}

// Components

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="mb-6 text-2xl font-bold text-white">{title}</h2>
      <div className="text-gray-400 leading-relaxed">{children}</div>
    </section>
  );
}

function FeatureGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">{children}</div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-4">
      <h4 className="mb-1 font-semibold text-white">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="text-gray-400">{children}</p>
      </div>
    </div>
  );
}

function FunctionDoc({
  name,
  description,
  access,
}: {
  name: string;
  description: string;
  access: string;
}) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <code className="text-purple-400">{name}</code>
        <span className={`text-xs px-2 py-1 rounded ${
          access === "Public" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
        }`}>
          {access}
        </span>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h4 className="mb-2 font-semibold text-white">{question}</h4>
      <p className="text-gray-400">{answer}</p>
    </div>
  );
}
