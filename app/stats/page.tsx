"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { loadState, resetState, type GlobalState } from "@/lib/gameStore";

const VERDICTS = [
  "You should have stopped.",
  "The wheel loved you. Briefly.",
  "Statistically impressive failure.",
  "The house was always going to win.",
  "You were warned.",
  "Mathematically inevitable.",
];

export default function StatsPage() {
  const [state, setState] = useState<GlobalState | null>(null);
  const [verdict] = useState(
    () => VERDICTS[Math.floor(Math.random() * VERDICTS.length)],
  );

  useEffect(() => {
    setState(loadState());
  }, []);

  const handleReset = () => {
    resetState();
    setState(loadState());
  };

  const handleExport = () => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "casino-stats.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!state) return null;

  const { stats, balance } = state;
  const netProfit = stats.totalGained - stats.totalLost;
  const profitColor = netProfit >= 0 ? "text-green-400" : "text-red-400";

  const winRates: Record<string, number> = {};
  for (const [game, data] of Object.entries(stats.winRates)) {
    winRates[game] = data.plays > 0 ? data.wins / data.plays : 0;
  }

  const sortedGames = Object.entries(stats.gamesPlayed).sort(
    (a, b) => b[1] - a[1],
  );

  const mostPlayed = sortedGames[0]?.[0] ?? "—";
  const worstGame =
    Object.entries(winRates).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "—";

  const timeSpentMinutes = Math.floor(stats.timeSpentMs / 60000);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_0%,transparent_60%)]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between p-6 border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-mono opacity-60 hover:opacity-100 transition-opacity"
        >
          <IconArrowLeft size={14} />
          BACK TO FLOOR
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono opacity-50">
            BALANCE:{" "}
            <span className="opacity-100 font-black">{balance} CRAPS</span>
          </div>
          <Badge
            variant="outline"
            className="border-blue-900 text-blue-400 font-mono text-xs"
          >
            BRUTAL HONESTY
          </Badge>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 lg:px-10 py-10 space-y-10">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter">STATISTICS</h1>
          <p className="font-mono text-xs opacity-40 tracking-widest">
            BRUTAL HONESTY ABOUT YOUR FAILURES
          </p>
        </div>

        <div className="border border-border p-6 text-center space-y-3">
          <div className="text-xs font-mono opacity-30 tracking-widest">
            VERDICT
          </div>
          <div className="font-mono text-xl opacity-60">"{verdict}"</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border p-6 space-y-2">
            <div className="text-xs font-mono opacity-30">TOTAL GAINED</div>
            <div className="font-black text-3xl tabular-nums text-green-400">
              +{stats.totalGained.toLocaleString()}
            </div>
            <div className="text-xs font-mono opacity-40">CRAPS</div>
          </div>
          <div className="border border-border p-6 space-y-2">
            <div className="text-xs font-mono opacity-30">TOTAL LOST</div>
            <div className="font-black text-3xl tabular-nums text-red-400">
              −{stats.totalLost.toLocaleString()}
            </div>
            <div className="text-xs font-mono opacity-40">CRAPS</div>
          </div>
          <div className="border border-border p-6 space-y-2">
            <div className="text-xs font-mono opacity-30">NET PROFIT</div>
            <div className={`font-black text-3xl tabular-nums ${profitColor}`}>
              {netProfit >= 0 ? "+" : ""}
              {netProfit.toLocaleString()}
            </div>
            <div className="text-xs font-mono opacity-40">CRAPS</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border p-6 space-y-4">
            <div className="text-xs font-mono opacity-30 tracking-widest">
              RECORDS
            </div>
            {[
              {
                label: "Biggest win",
                value: `+${stats.biggestWin}`,
                color: "text-green-400",
              },
              {
                label: "Biggest loss",
                value: `−${stats.biggestLoss}`,
                color: "text-red-400",
              },
              {
                label: "Times went broke",
                value: stats.timesBroke,
                color: "text-red-400",
              },
              {
                label: "Longest loss streak",
                value: stats.longestLossStreak,
                color: "text-red-400",
              },
              {
                label: "Total spins/plays",
                value: stats.totalSpins,
                color: "",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="text-sm font-mono opacity-60">{label}</div>
                <div className={`font-black tabular-nums ${color}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="text-xs font-mono opacity-30 tracking-widest">
              SESSION ANALYSIS
            </div>
            {[
              {
                label: "Time spent gambling",
                value:
                  timeSpentMinutes > 0
                    ? `${timeSpentMinutes} min`
                    : "tracking…",
              },
              {
                label: "Game that ruined you",
                value: worstGame,
                color: "text-red-400",
              },
              { label: "Most played game", value: mostPlayed },
              {
                label: "Current CRAPS balance",
                value: `${balance}`,
                color: balance < 20 ? "text-red-400" : "text-green-400",
              },
            ].map(({ label, value, color = "" }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="text-sm font-mono opacity-60">{label}</div>
                <div className={`font-black ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {sortedGames.length > 0 ? (
          <div className="border border-border">
            <div className="p-6 border-b border-border">
              <div className="text-xs font-mono opacity-30 tracking-widest">
                GAMES PLAYED
              </div>
            </div>
            <div className="divide-y divide-border">
              {sortedGames.map(([game, plays]) => {
                const wr = winRates[game] ?? 0;
                const winRateColor =
                  wr >= 0.5 ? "text-green-400" : "text-red-400";

                return (
                  <div
                    key={game}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm">{game}</div>
                      <div className="text-xs font-mono opacity-30 mt-1">
                        {plays} rounds played
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs font-mono opacity-30">
                          WIN RATE
                        </div>
                        <div
                          className={`font-black tabular-nums ${winRateColor}`}
                        >
                          {(wr * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="w-32 h-2 border border-border overflow-hidden">
                        <div
                          className={`h-full ${
                            wr >= 0.5 ? "bg-green-400" : "bg-red-400"
                          } transition-all`}
                          style={{ width: `${wr * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="border border-border p-10 text-center font-mono opacity-30">
            No games played yet. Go lose some CRAPS first.
          </div>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1 font-mono"
            onClick={handleExport}
          >
            EXPORT DATA
          </Button>
          <Button
            variant="destructive"
            className="flex-1 font-mono"
            onClick={handleReset}
          >
            RESET ALL STATS
          </Button>
        </div>

        <div className="text-center font-mono text-xs opacity-20 leading-relaxed max-w-md mx-auto">
          Statistics are tracked in your browser's localStorage and persist
          across sessions. They serve as a reminder of your inevitable
          statistical downfall.
        </div>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
