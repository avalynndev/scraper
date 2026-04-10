"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

const BOXES = [
  { id: 1, cost: 10, tier: "COMMON", color: "border-zinc-600" },
  { id: 2, cost: 25, tier: "RARE", color: "border-blue-700" },
  { id: 3, cost: 50, tier: "CURSED", color: "border-purple-700" },
  { id: 4, cost: 100, tier: "LEGENDARY", color: "border-yellow-600" },
];

const POSSIBLE_ITEMS = [
  { name: "Lucky Coin", effect: "does nothing", type: "neutral" },
  { name: "Cursed Chip", effect: "everything worse", type: "bad" },
  { name: "House Key", effect: "reveals secrets", type: "good" },
  { name: "Loaded Die", effect: "+5% on coin flips", type: "good" },
  { name: "Broken Mirror", effect: "−10% all odds", type: "bad" },
  { name: "Jackpot Fragment", effect: "combine 3 to win big", type: "neutral" },
];

export default function LootboxPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,197,94,0.05)_0%,transparent_60%)]" />
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
          <Badge
            variant="outline"
            className="border-green-900 text-green-400 font-mono text-xs"
          >
            DANGER: CHAOS
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">100 CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full">
        <div className="flex-1 p-6 lg:p-10 border-r border-border">
          <div className="mb-8">
            <h1 className="text-5xl font-black tracking-tighter">
              LOOTBOX HELL
            </h1>
            <p className="font-mono text-xs opacity-40 mt-2 tracking-widest">
              ITEMS THAT RUIN EVERYTHING
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {BOXES.map((box) => (
              <div
                key={box.id}
                className={`border-2 ${box.color} p-6 flex flex-col items-center gap-4 group hover:opacity-80 cursor-pointer transition-opacity`}
              >
                <div className="text-5xl group-hover:scale-110 transition-transform">
                  📦
                </div>

                <div className="text-center">
                  <div className="text-xs font-mono opacity-40 tracking-widest mb-1">
                    {box.tier}
                  </div>
                  <div className="font-black text-xl tabular-nums">
                    {box.cost}
                  </div>
                  <div className="text-xs font-mono opacity-50">CRAPS</div>
                </div>

                <Button
                  size="sm"
                  className="w-full font-bold tracking-wide text-xs"
                >
                  OPEN
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="text-xs font-mono opacity-30 tracking-wider mb-4">
              POSSIBLE ITEMS (PARTIAL LIST)
            </div>
            <div className="space-y-2">
              {POSSIBLE_ITEMS.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between border border-border px-4 py-2"
                >
                  <div className="font-mono text-sm">{item.name}</div>
                  <div
                    className={`text-xs font-mono ${item.type === "good" ? "text-green-400" : item.type === "bad" ? "text-red-400" : "opacity-40"}`}
                  >
                    {item.effect}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-72 flex flex-col">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="font-black">INVENTORY</div>
            <div className="text-xs font-mono opacity-30">0 / 12</div>
          </div>

          <div className="flex-1 p-6">
            <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20">
              <div className="text-4xl">🕳️</div>
              <div className="text-xs font-mono text-center">
                No items yet.
                <br />
                Open a box.
              </div>
            </div>
          </div>

          <div className="border-t border-border p-6">
            <div className="text-xs font-mono opacity-30 tracking-wider mb-3">
              ACTIVE EFFECTS
            </div>
            <div className="text-xs font-mono opacity-20 text-center py-4">
              None
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
