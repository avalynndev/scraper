"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import {
  loadState,
  saveState,
  recordSpin,
  recordBroke,
  recordLossStreak,
  type OwnedUpgrades,
} from "@/lib/gameStore";

export default function ScraperHomePage() {
  const [hydrated, setHydrated] = React.useState(false);

  const [balance, setBalanceState] = React.useState(100);
  const [houseMessage, setHouseMessage] = React.useState(
    "The house is watching.",
  );
  const [glitchText, setGlitchText] = React.useState(false);

  const messages = [
    "The house is watching.",
    "Your luck is running out.",
    "We know your patterns.",
    "You'll be back.",
    "The odds are never in your favor.",
    "Try again. We dare you.",
    "Statistical certainty approaches.",
  ];

  React.useEffect(() => {
    const state = loadState();
    setBalanceState(state.balance);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    const state = loadState();
    state.balance = balance;
    saveState(state);
    if (balance === 0) recordBroke();
  }, [balance, hydrated]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setHouseMessage(messages[Math.floor(Math.random() * messages.length)]);
      setGlitchText(true);
      setTimeout(() => setGlitchText(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const games = [
    {
      id: "rigged",
      name: "RIGGED SLOT",
      description: "The jackpot moves away from you.",
      danger: "HIGH",
      disabled: false,
      color: "from-purple-600 to-pink-600",
    },
    {
      id: "wheel",
      name: "WHEEL OF REGRET",
      description: "Spin costs rise. So do punishments.",
      danger: "MEDIUM",
      disabled: false,
      color: "from-yellow-600 to-red-600",
    },
    {
      id: "lootbox",
      name: "LOOTBOX HELL",
      description: "Items that ruin everything.",
      danger: "CHAOS",
      disabled: false,
      color: "from-green-600 to-emerald-600",
    },
    {
      id: "all-in",
      name: "ALL-IN BUTTON",
      description: "50% double. 50% nothing.",
      danger: "EXTREME",
      disabled: true,
      color: "from-red-600 to-orange-600",
    },
    {
      id: "dealer",
      name: "DEALER IS A LIAR",
      description: "Trust nobody. Especially the dealer.",
      danger: "VARIABLE",
      disabled: true,
      color: "from-blue-600 to-cyan-600",
    },
    {
      id: "martingale",
      name: "MARTINGALE SIM",
      description: "Statistically guaranteed failure.",
      danger: "CERTAIN",
      disabled: true,
      color: "from-gray-600 to-slate-600",
    },
  ];

  if (!hydrated) return null; 

  return (
    <div className="min-h-screen overflow-hidden relative">
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-16 mt-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-8xl font-black tracking-tighter mb-2 relative">
                <span className="bg-linear-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-[gradient_3s_ease_infinite] bg-size-[200%_auto]">
                  SCRAPER
                </span>
              </h1>
              <p className="text-xl font-mono tracking-wider opacity-50">
                A FAKE CASINO WHERE EVERYTHING IS RIGGED
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <ModeToggle />
              <div className="text-right space-y-2">
                <div className="text-sm font-mono opacity-50">YOUR BALANCE</div>
                <div className="text-6xl font-black tabular-nums tracking-tight text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                  {balance}
                </div>
                <div className="text-2xl font-mono opacity-60">CRAPS</div>
              </div>
            </div>
          </div>

          <div className="bg-destructive/20 border border-destructive/50 px-6 py-4 rounded-none">
            <p
              className={`text-destructive font-mono text-sm text-center transition-all ${
                glitchText ? "blur-sm" : ""
              }`}
            >
              ⚠ {houseMessage}
            </p>
          </div>
        </header>

        <div className="mb-16">
          <h2 className="text-3xl font-black mb-8 tracking-tight flex items-center gap-4">
            <span>CASINO FLOOR</span>
            <span className="text-xs font-mono opacity-50 font-normal">
              [6 WAYS TO LOSE EVERYTHING]
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const cardContent = (
                <Card
                  className={`transition-all duration-300 group relative overflow-hidden ${
                    game.disabled
                      ? "opacity-50 grayscale cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${game.color} ${
                      game.disabled
                        ? "opacity-5"
                        : "opacity-0 group-hover:opacity-10"
                    } transition-opacity duration-300`}
                  />

                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={`border-${game.color} text-${game.color} font-mono text-xs`}
                      >
                        {game.danger}
                      </Badge>
                      <div className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
                        🎰
                      </div>
                    </div>

                    <CardTitle className="text-2xl font-black tracking-tight">
                      {game.name}
                    </CardTitle>

                    <CardDescription className="font-mono text-sm">
                      {game.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <Button
                      disabled={game.disabled}
                      className="w-full font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {game.disabled ? "LOCKED" : "PLAY NOW →"}
                    </Button>
                  </CardContent>
                </Card>
              );

              return game.disabled ? (
                <div key={game.id}>{cardContent}</div>
              ) : (
                <Link key={game.id} href={`/games/${game.id}`}>
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-purple transition-colors">
            <CardHeader>
              <CardTitle className="text-xl font-black text-purple-400">
                UPGRADES
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Spend CRAPS to rig the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/upgrades">
                <Button
                  variant="outline"
                  className="w-full border-purple-900 text-purple-400 "
                >
                  Browse Shop →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-900/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-xl font-black text-blue-400">
                STATISTICS
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Brutal honesty about your failures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/stats">
                <Button
                  variant="outline"
                  className="w-full border-blue-900 text-blue-400"
                >
                  View Stats →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-red-900/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-xl font-black text-red-400">
                RESET
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Start over. We knew you'd be back.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-red-900 text-red-400"
                onClick={() => setBalanceState(100)}
              >
                Reset to 100 CRAPS
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs font-mono opacity-30">
            SCRAPER v1.0 • ALL BETS FINAL • THE HOUSE ALWAYS WINS
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
}
