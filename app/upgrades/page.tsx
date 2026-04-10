"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { loadState, buyUpgrade, type OwnedUpgrades } from "@/lib/gameStore";

const UPGRADES: Array<{
  category: string;
  items: Array<{
    id: keyof OwnedUpgrades;
    name: string;
    description: string;
    cost: number;
    effect: string;
    type: "good" | "neutral" | "bad";
  }>;
}> = [
  {
    category: "TRANSPARENCY",
    items: [
      {
        id: "odds-reveal",
        name: "Odds Transparency",
        description: "See the actual win probability before each spin.",
        cost: 500,
        effect: "+info",
        type: "good",
      },
      {
        id: "dealer-meter",
        name: "Dealer Honesty Meter",
        description: "Unlocks the honesty meter in Dealer is a Liar.",
        cost: 300,
        effect: "+reveal",
        type: "good",
      },
      {
        id: "near-miss",
        name: "Near-Miss Reduction",
        description: "Fewer psychological near-misses on the slot.",
        cost: 250,
        effect: "+mental",
        type: "good",
      },
    ],
  },
  {
    category: "STABILITY",
    items: [
      {
        id: "volatility",
        name: "Reduced Volatility",
        description: "Swings are smaller. Wins and losses both.",
        cost: 400,
        effect: "±less",
        type: "neutral",
      },
      {
        id: "house-anger",
        name: "House Anger Reduction",
        description: "The house forgives you slightly faster.",
        cost: 200,
        effect: "+forgive",
        type: "good",
      },
    ],
  },
  {
    category: "CHAOS (DANGEROUS)",
    items: [
      {
        id: "chaos-mode",
        name: "Chaos Mode",
        description:
          "Multiplies all odds variance by 3×. Jackpots are real. So is ruin.",
        cost: 150,
        effect: "3× chaos",
        type: "bad",
      },
      {
        id: "house-provoke",
        name: "Provoke the House",
        description: "Angers the system on purpose. Something changes.",
        cost: 50,
        effect: "??",
        type: "bad",
      },
      {
        id: "cursed-run",
        name: "Cursed Run",
        description: "Start a run where everything is slightly worse forever.",
        cost: 1,
        effect: "−all",
        type: "bad",
      },
    ],
  },
];

const effectColors: Record<string, string> = {
  good: "text-green-400",
  neutral: "opacity-60",
  bad: "text-red-400",
};

export default function ShopPage() {
  const [balance, setBalanceState] = useState(0);
  const [owned, setOwned] = useState<OwnedUpgrades | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const state = loadState();
    setBalanceState(state.balance);
    setOwned(state.upgrades);
  }, []);

  const handleBuy = (id: keyof OwnedUpgrades, cost: number) => {
    const success = buyUpgrade(id, cost);
    if (success) {
      const state = loadState();
      setBalanceState(state.balance);
      setOwned(state.upgrades);
      setFlash(id);
      setTimeout(() => setFlash(null), 1500);
    }
  };

  const ownedList = owned
    ? (Object.entries(owned) as [keyof OwnedUpgrades, boolean][])
        .filter(([, v]) => v)
        .map(([k]) => k)
    : [];

  const allItems = UPGRADES.flatMap((c) => c.items);

  if (!owned) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.05)_0%,transparent_60%)]" />
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
            <span className="opacity-100 font-black">{balance} BALANCE</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full">
        <div className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <h1 className="text-5xl font-black tracking-tighter">UPGRADES</h1>
            <p className="font-mono text-xs opacity-40 mt-2 tracking-widest">
              SPEND CRAPS TO RIG THE SYSTEM
            </p>
            <p className="font-mono text-xs opacity-30 mt-1">
              CRAPS are earned by playing games. Check your stats page.
            </p>
          </div>

          <div className="space-y-10">
            {UPGRADES.map((cat) => (
              <div key={cat.category}>
                <div className="text-xs font-mono opacity-30 tracking-widest mb-4 flex items-center gap-3">
                  {cat.category}
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {cat.items.map((item) => {
                    const isOwned = owned[item.id];
                    const canAfford = balance >= item.cost;
                    const justBought = flash === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`border p-5 flex flex-col gap-4 transition-colors group ${
                          isOwned
                            ? "border-green-900/50 bg-green-950/10"
                            : "border-border hover:border-foreground/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-black text-base leading-tight">
                            {item.name}
                            {isOwned && (
                              <span className="ml-2 text-green-400 text-xs font-mono">
                                ✓ OWNED
                              </span>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs shrink-0 ${effectColors[item.type]} border-current/30`}
                          >
                            {item.effect}
                          </Badge>
                        </div>

                        <p className="text-sm font-mono opacity-40 leading-relaxed flex-1">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between gap-3">
                          <div className="font-black text-xl tabular-nums">
                            {item.cost}
                            <span className="text-xs font-mono opacity-40 ml-1">
                              CRAPS
                            </span>
                          </div>
                          {isOwned ? (
                            <div className="flex items-center gap-1 text-green-400 font-mono text-xs">
                              <IconCheck size={14} />
                              ACTIVE
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant={
                                item.type === "bad" ? "destructive" : "default"
                              }
                              className={`font-bold tracking-wide shrink-0 transition-all ${
                                justBought ? "scale-95 opacity-60" : ""
                              }`}
                              disabled={!canAfford}
                              onClick={() => handleBuy(item.id, item.cost)}
                            >
                              {canAfford ? "BUY" : "TOO POOR"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 border-l border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="font-black">OWNED</div>
            <div className="text-xs font-mono opacity-30 mt-1">
              {ownedList.length} upgrade{ownedList.length !== 1 ? "s" : ""}{" "}
              active
            </div>
          </div>

          {ownedList.length === 0 ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center gap-3 opacity-20">
              <div className="text-4xl">🕳️</div>
              <div className="text-xs font-mono text-center">
                Nothing purchased yet.
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 space-y-3 overflow-y-auto">
              {ownedList.map((id) => {
                const item = allItems.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <div
                    key={id}
                    className="border border-green-900/40 p-3 space-y-1"
                  >
                    <div className="font-mono text-xs font-black text-green-400">
                      {item.name}
                    </div>
                    <div className="font-mono text-xs opacity-40 leading-snug">
                      {item.effect}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border p-6">
            <div className="text-xs font-mono opacity-30 tracking-wider mb-3">
              GLOBAL MODIFIERS
            </div>
            <div className="space-y-2">
              {[
                {
                  label: `Base odds: ${owned["chaos-mode"] ? "CHAOS" : owned["cursed-run"] ? "cursed" : "normal"}`,
                  color: owned["chaos-mode"]
                    ? "text-red-400"
                    : owned["cursed-run"]
                      ? "text-red-400"
                      : "opacity-20",
                },
                {
                  label: `Near-misses: ${owned["near-miss"] ? "reduced" : "full"}`,
                  color: owned["near-miss"] ? "text-green-400" : "opacity-20",
                },
                {
                  label: `Odds visible: ${owned["odds-reveal"] ? "YES" : "no"}`,
                  color: owned["odds-reveal"] ? "text-blue-400" : "opacity-20",
                },
                {
                  label: `Chaos: ${owned["chaos-mode"] ? "ON" : "OFF"}`,
                  color: owned["chaos-mode"]
                    ? "text-red-400 animate-pulse"
                    : "opacity-20",
                },
              ].map(({ label, color }) => (
                <div key={label} className={`text-xs font-mono ${color}`}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
