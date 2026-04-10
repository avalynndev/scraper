"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

const MOCK_STATS = {
  totalGained: 2450,
  totalLost: 3890,
  netProfit: -1440,
  biggestWin: 500,
  biggestLoss: 800,
  timesBroke: 3,
  gamesPlayed: {
    "ALL-IN BUTTON": 47,
    "RIGGED SLOT": 28,
    "WHEEL OF REGRET": 15,
    "DEALER IS A LIAR": 12,
    "LOOTBOX HELL": 8,
    "MARTINGALE SIM": 2,
  },
  winRates: {
    "ALL-IN BUTTON": 0.43,
    "RIGGED SLOT": 0.12,
    "WHEEL OF REGRET": 0.31,
    "DEALER IS A LIAR": 0.58,
    "LOOTBOX HELL": 0.25,
    "MARTINGALE SIM": 0.0,
  },
  worstGame: "RIGGED SLOT",
  longestLossStreak: 12,
  totalSpins: 112,
  averageBet: 34,
  timeSpentMinutes: 127,
};

const VERDICTS = [
  "You should have stopped.",
  "The wheel loved you. Briefly.",
  "Statistically impressive failure.",
  "The house was always going to win.",
  "You were warned.",
  "Mathematically inevitable.",
];

export default function StatsPage() {
  const verdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
  const profitColor =
    MOCK_STATS.netProfit >= 0 ? "text-green-400" : "text-red-400";

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
        <Badge
          variant="outline"
          className="border-blue-900 text-blue-400 font-mono text-xs"
        >
          BRUTAL HONESTY
        </Badge>
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
              +{MOCK_STATS.totalGained.toLocaleString()}
            </div>
            <div className="text-xs font-mono opacity-40">CRAPS</div>
          </div>

          <div className="border border-border p-6 space-y-2">
            <div className="text-xs font-mono opacity-30">TOTAL LOST</div>
            <div className="font-black text-3xl tabular-nums text-red-400">
              −{MOCK_STATS.totalLost.toLocaleString()}
            </div>
            <div className="text-xs font-mono opacity-40">CRAPS</div>
          </div>

          <div className="border border-border p-6 space-y-2">
            <div className="text-xs font-mono opacity-30">NET PROFIT</div>
            <div className={`font-black text-3xl tabular-nums ${profitColor}`}>
              {MOCK_STATS.netProfit >= 0 ? "+" : ""}
              {MOCK_STATS.netProfit.toLocaleString()}
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
                value: `+${MOCK_STATS.biggestWin}`,
                color: "text-green-400",
              },
              {
                label: "Biggest loss",
                value: `−${MOCK_STATS.biggestLoss}`,
                color: "text-red-400",
              },
              {
                label: "Times went broke",
                value: MOCK_STATS.timesBroke,
                color: "text-red-400",
              },
              {
                label: "Longest loss streak",
                value: MOCK_STATS.longestLossStreak,
                color: "text-red-400",
              },
              {
                label: "Total spins/plays",
                value: MOCK_STATS.totalSpins,
                color: "",
              },
              {
                label: "Average bet size",
                value: `${MOCK_STATS.averageBet} CRAPS`,
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
              TIME ANALYSIS
            </div>
            {[
              {
                label: "Time spent gambling",
                value: `${MOCK_STATS.timeSpentMinutes} min`,
              },
              {
                label: "Game that ruined you",
                value: MOCK_STATS.worstGame,
                color: "text-red-400",
              },
              {
                label: "Most played game",
                value: Object.entries(MOCK_STATS.gamesPlayed).sort(
                  (a, b) => b[1] - a[1],
                )[0][0],
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

        <div className="border border-border">
          <div className="p-6 border-b border-border">
            <div className="text-xs font-mono opacity-30 tracking-widest">
              GAMES PLAYED
            </div>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(MOCK_STATS.gamesPlayed).map(([game, plays]) => {
              const winRate =
                MOCK_STATS.winRates[game as keyof typeof MOCK_STATS.winRates];
              const winRateColor =
                winRate >= 0.5 ? "text-green-400" : "text-red-400";

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
                        {(winRate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="w-32 h-2 border border-border overflow-hidden">
                      <div
                        className={`h-full ${winRate >= 0.5 ? "bg-green-400" : "bg-red-400"} transition-all`}
                        style={{ width: `${winRate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1 font-mono">
            EXPORT DATA
          </Button>
          <Button variant="destructive" className="flex-1 font-mono">
            RESET ALL STATS
          </Button>
        </div>

        <div className="text-center font-mono text-xs opacity-20 leading-relaxed max-w-md mx-auto">
          These statistics are tracked locally and persist across sessions. They
          serve as a reminder of your inevitable statistical downfall.
        </div>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
