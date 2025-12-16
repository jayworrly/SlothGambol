"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/ui/Header";

interface Tournament {
  id: string;
  name: string;
  variant: "texas_holdem" | "omaha";
  buyIn: string;
  prizePool: string;
  players: number;
  maxPlayers: number;
  startTime: Date;
  status: "registering" | "running" | "completed";
}

// Mock data
const mockTournaments: Tournament[] = [
  {
    id: "1",
    name: "Avalanche Sunday Million",
    variant: "texas_holdem",
    buyIn: "1",
    prizePool: "50",
    players: 42,
    maxPlayers: 100,
    startTime: new Date(Date.now() + 3600000),
    status: "registering",
  },
  {
    id: "2",
    name: "Omaha Championship",
    variant: "omaha",
    buyIn: "0.5",
    prizePool: "15",
    players: 28,
    maxPlayers: 50,
    startTime: new Date(Date.now() + 7200000),
    status: "registering",
  },
  {
    id: "3",
    name: "Micro Stakes Freeroll",
    variant: "texas_holdem",
    buyIn: "0",
    prizePool: "1",
    players: 150,
    maxPlayers: 200,
    startTime: new Date(Date.now() - 1800000),
    status: "running",
  },
];

export default function TournamentsPage() {
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState<"all" | "registering" | "running">(
    "all",
  );

  const filteredTournaments = mockTournaments.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="bg-background border-secondary-accent max-w-md rounded-xl border p-8 text-center shadow-xl">
            <h2 className="text-primary-text mb-4 text-2xl font-bold">
              Connect Your Wallet
            </h2>
            <p className="text-foreground/70 mb-6">
              Please connect your crypto wallet to view tournaments.
            </p>
            <p className="text-foreground/50 text-sm">
              Click the "Connect Wallet" button in the header to get started.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-primary-text text-3xl font-bold">Tournaments</h1>
          <div className="flex gap-2">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === "registering"}
              onClick={() => setFilter("registering")}
            >
              Registering
            </FilterButton>
            <FilterButton
              active={filter === "running"}
              onClick={() => setFilter("running")}
            >
              Running
            </FilterButton>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <div className="text-foreground/60 py-12 text-center">
            No tournaments found
          </div>
        )}
      </main>
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const timeUntilStart = tournament.startTime.getTime() - Date.now();
  const isStartingSoon = timeUntilStart > 0 && timeUntilStart < 1800000;

  return (
    <div className="bg-background/50 border-secondary-accent rounded-xl border p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-primary-text text-xl font-semibold">
              {tournament.name}
            </h3>
            <StatusBadge status={tournament.status} />
          </div>
          <div className="text-foreground/70 flex gap-6 text-sm">
            <span>
              {tournament.variant === "texas_holdem" ? "Hold'em" : "Omaha"}
            </span>
            <span>
              Buy-in:{" "}
              <span className="text-primary-text">
                {tournament.buyIn === "0" ? "Free" : `${tournament.buyIn} AVAX`}
              </span>
            </span>
            <span>
              Prize Pool:{" "}
              <span className="text-green-400">
                {tournament.prizePool} AVAX
              </span>
            </span>
            <span>
              Players:{" "}
              <span className="text-primary-text">
                {tournament.players}/{tournament.maxPlayers}
              </span>
            </span>
          </div>
        </div>

        <div className="text-right">
          {tournament.status === "registering" && (
            <>
              <p
                className={`mb-2 text-sm ${isStartingSoon ? "text-gold" : "text-foreground/70"}`}
              >
                Starts {formatTimeUntil(timeUntilStart)}
              </p>
              <button className="bg-avalanche-red hover:bg-avalanche-red/80 text-primary-text rounded-lg px-6 py-2 font-semibold transition-colors">
                Register
              </button>
            </>
          )}
          {tournament.status === "running" && (
            <button className="bg-secondary-accent/50 hover:bg-secondary-accent/70 text-primary-text rounded-lg px-6 py-2 font-semibold transition-colors">
              Watch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Tournament["status"] }) {
  const styles = {
    registering: "bg-green-500/20 text-green-400 border-green-500/50",
    running: "bg-gold/20 text-gold border-gold/50",
    completed:
      "bg-secondary-accent/20 text-foreground/60 border-secondary-accent/50",
  };

  const labels = {
    registering: "Registering",
    running: "In Progress",
    completed: "Completed",
  };

  return (
    <span className={`rounded border px-2 py-0.5 text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary-accent text-white"
          : "bg-secondary-accent/30 text-foreground/70 hover:text-primary-text"
      }`}
    >
      {children}
    </button>
  );
}
function formatTimeUntil(ms: number): string {
  if (ms < 0) return "Started";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `in ${hours}h ${minutes % 60}m`;
  }
  return `in ${minutes}m`;
}
