"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  loadState,
  saveState,
  recordBroke,
  type GlobalState,
} from "@/lib/gameStore";

const GAME_NAME = "LOOTBOX HELL";
const MAX_INVENTORY = 12;

type ItemEffect =
  | "none"
  | "worse_odds"
  | "better_odds"
  | "reveal_odds"
  | "gain_craps"
  | "lose_craps"
  | "jackpot_fragment"
  | "cursed_run"
  | "near_miss_reduce";

interface Item {
  name: string;
  effect: string; // display string
  effectKey: ItemEffect;
  type: "neutral" | "good" | "bad";
  emoji: string;
}

const ITEM_POOL: Item[] = [
  {
    name: "Lucky Coin",
    effect: "does nothing",
    effectKey: "none",
    type: "neutral",
    emoji: "🪙",
  },
  {
    name: "Cursed Chip",
    effect: "−10% all odds",
    effectKey: "worse_odds",
    type: "bad",
    emoji: "🔴",
  },
  {
    name: "House Key",
    effect: "reveals odds",
    effectKey: "reveal_odds",
    type: "good",
    emoji: "🗝️",
  },
  {
    name: "Loaded Die",
    effect: "+8% win chance",
    effectKey: "better_odds",
    type: "good",
    emoji: "🎲",
  },
  {
    name: "Broken Mirror",
    effect: "−10% all odds",
    effectKey: "worse_odds",
    type: "bad",
    emoji: "🪞",
  },
  {
    name: "Jackpot Fragment",
    effect: "combine 3 to win big",
    effectKey: "jackpot_fragment",
    type: "neutral",
    emoji: "💠",
  },
  {
    name: "Bag of Craps",
    effect: "+50 CRAPS",
    effectKey: "gain_craps",
    type: "good",
    emoji: "💰",
  },
  {
    name: "Debt Scroll",
    effect: "−80 CRAPS",
    effectKey: "lose_craps",
    type: "bad",
    emoji: "📜",
  },
  {
    name: "Rabbit's Foot",
    effect: "near-misses reduced",
    effectKey: "near_miss_reduce",
    type: "good",
    emoji: "🐇",
  },
  {
    name: "Cursed Die",
    effect: "activates cursed run",
    effectKey: "cursed_run",
    type: "bad",
    emoji: "☠️",
  },
  {
    name: "Silver Bullet",
    effect: "+30 CRAPS",
    effectKey: "gain_craps",
    type: "good",
    emoji: "🔫",
  },
  {
    name: "Worm Token",
    effect: "−20 CRAPS",
    effectKey: "lose_craps",
    type: "bad",
    emoji: "🪱",
  },
];


type Tier = "COMMON" | "RARE" | "CURSED" | "LEGENDARY";

const LOOT_TABLES: Record<Tier, string[]> = {
  COMMON: ["Lucky Coin", "Worm Token", "Broken Mirror", "Bag of Craps"],
  RARE: [
    "Loaded Die",
    "Rabbit's Foot",
    "Debt Scroll",
    "Lucky Coin",
    "Silver Bullet",
  ],
  CURSED: [
    "Cursed Chip",
    "Cursed Die",
    "Broken Mirror",
    "Worm Token",
    "Jackpot Fragment",
  ],
  LEGENDARY: [
    "House Key",
    "Jackpot Fragment",
    "Bag of Craps",
    "Loaded Die",
    "Rabbit's Foot",
  ],
};

const BOXES = [
  {
    id: 1,
    cost: 10,
    tier: "COMMON" as Tier,
    color: "border-zinc-600",
    glow: "#71717a",
  },
  {
    id: 2,
    cost: 25,
    tier: "RARE" as Tier,
    color: "border-blue-700",
    glow: "#1d4ed8",
  },
  {
    id: 3,
    cost: 50,
    tier: "CURSED" as Tier,
    color: "border-purple-700",
    glow: "#7e22ce",
  },
  {
    id: 4,
    cost: 100,
    tier: "LEGENDARY" as Tier,
    color: "border-yellow-600",
    glow: "#ca8a04",
  },
];


function rollItem(tier: Tier): Item {
  const pool = LOOT_TABLES[tier];
  const name = pool[Math.floor(Math.random() * pool.length)];
  return ITEM_POOL.find((i) => i.name === name) ?? ITEM_POOL[0];
}

function applyItemEffect(state: GlobalState, item: Item): GlobalState {
  switch (item.effectKey) {
    case "gain_craps":
      state.balance = Math.max(0, state.balance + 50);
      break;
    case "lose_craps":
      state.balance = Math.max(0, state.balance - 80);
      break;
    case "worse_odds":
      state.upgrades["cursed-run"] = true;
      break;
    case "better_odds":
      state.upgrades["house-anger"] = true;
      break;
    case "reveal_odds":
      state.upgrades["odds-reveal"] = true;
      break;
    case "near_miss_reduce":
      state.upgrades["near-miss"] = true;
      break;
    case "cursed_run":
      state.upgrades["cursed-run"] = true;
      break;
    default:
      break;
  }
  return state;
}


export default function LootboxPage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<GlobalState["upgrades"] | null>(
    null,
  );

  const [inventory, setInventory] = useState<Item[]>([]);
  const [opening, setOpening] = useState<number | null>(null); // box id being opened
  const [revealed, setRevealed] = useState<Item | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [fragments, setFragments] = useState(0);

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);

    const saved = localStorage.getItem("casino_inventory_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Item[];
        setInventory(parsed);
        setFragments(
          parsed.filter((i) => i.effectKey === "jackpot_fragment").length,
        );
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("casino_inventory_v1", JSON.stringify(inventory));
  }, [inventory, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const state = loadState();
    state.balance = balance;
    saveState(state);
    if (balance <= 0) recordBroke();
  }, [balance, hydrated]);

  const handleOpen = (box: (typeof BOXES)[0]) => {
    if (balance < box.cost || opening !== null || !hydrated) return;
    if (inventory.length >= MAX_INVENTORY) return;

    setOpening(box.id);
    setRevealed(null);
    setBalance((b) => b - box.cost);

    setTimeout(() => {
      const item = rollItem(box.tier);

      let state = loadState();
      state = applyItemEffect(state, item);
      saveState(state);
      setUpgrades(state.upgrades);
      if (state.balance !== balance - box.cost) {
        setBalance(state.balance);
      }

      setInventory((inv) => [...inv, item].slice(0, MAX_INVENTORY));
      setOpenCount((c) => c + 1);

      if (item.effectKey === "jackpot_fragment") {
        setFragments((f) => {
          const next = f + 1;
          if (next >= 3) {
            setBalance((b) => b + 1000);
            setInventory((inv) =>
              inv.filter((i) => i.effectKey !== "jackpot_fragment"),
            );
            return 0;
          }
          return next;
        });
      }

      setRevealed(item);
      setOpening(null);

      const st = loadState();
      st.stats.totalSpins += 1;
      st.stats.gamesPlayed[GAME_NAME] =
        (st.stats.gamesPlayed[GAME_NAME] ?? 0) + 1;
      if (!st.stats.winRates[GAME_NAME])
        st.stats.winRates[GAME_NAME] = { wins: 0, plays: 0 };
      st.stats.winRates[GAME_NAME].plays += 1;
      if (item.type === "good") st.stats.winRates[GAME_NAME].wins += 1;
      saveState(st);
    }, 1200);
  };

  const handleDiscard = (index: number) => {
    setInventory((inv) => {
      const item = inv[index];
      if (item.effectKey === "jackpot_fragment")
        setFragments((f) => Math.max(0, f - 1));
      return inv.filter((_, i) => i !== index);
    });
  };

  const activeEffects = inventory
    .filter(
      (i) =>
        i.effectKey !== "none" &&
        i.effectKey !== "jackpot_fragment" &&
        i.effectKey !== "gain_craps" &&
        i.effectKey !== "lose_craps",
    )
    .reduce<Record<string, number>>((acc, i) => {
      acc[i.effect] = (acc[i.effect] ?? 0) + 1;
      return acc;
    }, {});

  if (!hydrated) return null;

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
        <div className="flex items-center gap-4 flex-wrap justify-end gap-y-2">
          {fragments > 0 && (
            <Badge
              variant="outline"
              className="border-blue-900 text-blue-400 font-mono text-xs"
            >
              FRAGMENTS: {fragments}/3
            </Badge>
          )}
          {upgrades?.["cursed-run"] && (
            <Badge
              variant="outline"
              className="border-red-900 text-red-400 font-mono text-xs animate-pulse"
            >
              CURSED
            </Badge>
          )}
          <Badge
            variant="outline"
            className="border-green-900 text-green-400 font-mono text-xs"
          >
            DANGER: CHAOS
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">{balance} CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full">
        {/* Left: boxes + item pool */}
        <div className="flex-1 p-6 lg:p-10 border-r border-border space-y-10">
          <div>
            <h1 className="text-5xl font-black tracking-tighter">
              LOOTBOX HELL
            </h1>
            <p className="font-mono text-xs opacity-40 mt-2 tracking-widest">
              ITEMS THAT RUIN EVERYTHING
            </p>
            {inventory.length >= MAX_INVENTORY && (
              <p className="font-mono text-xs text-red-400 mt-2">
                INVENTORY FULL — DISCARD AN ITEM FIRST
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {BOXES.map((box) => {
              const isOpening = opening === box.id;
              const canAfford = balance >= box.cost;
              const isFull = inventory.length >= MAX_INVENTORY;

              return (
                <div
                  key={box.id}
                  className={`border-2 ${box.color} p-6 flex flex-col items-center gap-4 transition-all ${
                    !canAfford || isFull
                      ? "opacity-40"
                      : "group hover:opacity-80 cursor-pointer"
                  }`}
                >
                  <div
                    className={`text-5xl transition-transform ${
                      isOpening
                        ? "animate-bounce"
                        : canAfford && !isFull
                          ? "group-hover:scale-110"
                          : ""
                    }`}
                  >
                    {isOpening ? "✨" : "📦"}
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
                    disabled={!canAfford || isOpening || isFull}
                    onClick={() => handleOpen(box)}
                  >
                    {isOpening ? "OPENING..." : "OPEN"}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Reveal flash */}
          {revealed && (
            <div
              className={`border p-5 text-center space-y-2 transition-all ${
                revealed.type === "good"
                  ? "border-green-700"
                  : revealed.type === "bad"
                    ? "border-red-700"
                    : "border-border"
              }`}
            >
              <div className="text-4xl">{revealed.emoji}</div>
              <div className="font-black text-xl">{revealed.name}</div>
              <div
                className={`font-mono text-sm ${
                  revealed.type === "good"
                    ? "text-green-400"
                    : revealed.type === "bad"
                      ? "text-red-400"
                      : "opacity-50"
                }`}
              >
                {revealed.effect}
              </div>
              <div className="text-xs font-mono opacity-30">
                Added to inventory
              </div>
            </div>
          )}

          {/* Jackpot hint */}
          {fragments > 0 && (
            <div className="border border-blue-800 p-4 text-center space-y-1">
              <div className="font-mono text-xs text-blue-400 tracking-widest">
                JACKPOT FRAGMENTS: {fragments} / 3
              </div>
              <div className="font-mono text-xs opacity-30">
                Collect 3 to win 1000 CRAPS
              </div>
              <div className="w-full h-1 bg-border mt-2">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(fragments / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-mono opacity-30 tracking-wider mb-4">
              POSSIBLE ITEMS (PARTIAL LIST)
            </div>
            <div className="space-y-2">
              {ITEM_POOL.slice(0, 6).map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between border border-border px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.emoji}</span>
                    <div className="font-mono text-sm">{item.name}</div>
                  </div>
                  <div
                    className={`text-xs font-mono ${
                      item.type === "good"
                        ? "text-green-400"
                        : item.type === "bad"
                          ? "text-red-400"
                          : "opacity-40"
                    }`}
                  >
                    {item.effect}
                  </div>
                </div>
              ))}
              <div className="text-xs font-mono opacity-20 text-center py-2">
                + {ITEM_POOL.length - 6} more items…
              </div>
            </div>
          </div>
        </div>

        {/* Right: inventory + effects */}
        <div className="w-full lg:w-72 flex flex-col">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="font-black">INVENTORY</div>
            <div className="text-xs font-mono opacity-30">
              {inventory.length} / {MAX_INVENTORY}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {inventory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20">
                <div className="text-4xl">🕳️</div>
                <div className="text-xs font-mono text-center">
                  No items yet.
                  <br />
                  Open a box.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {inventory.map((item, i) => (
                  <div
                    key={i}
                    className={`border px-3 py-2 flex items-center justify-between gap-2 ${
                      item.type === "good"
                        ? "border-green-900/50"
                        : item.type === "bad"
                          ? "border-red-900/50"
                          : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-black truncate">
                          {item.name}
                        </div>
                        <div
                          className={`font-mono text-xs truncate ${
                            item.type === "good"
                              ? "text-green-400"
                              : item.type === "bad"
                                ? "text-red-400"
                                : "opacity-30"
                          }`}
                        >
                          {item.effect}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDiscard(i)}
                      className="text-xs font-mono opacity-20 hover:opacity-60 shrink-0 transition-opacity"
                      title="Discard"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-6">
            <div className="text-xs font-mono opacity-30 tracking-wider mb-3">
              ACTIVE EFFECTS
            </div>
            {Object.keys(activeEffects).length === 0 ? (
              <div className="text-xs font-mono opacity-20 text-center py-4">
                None
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(activeEffects).map(([effect, count]) => (
                  <div
                    key={effect}
                    className="flex items-center justify-between"
                  >
                    <div className="text-xs font-mono opacity-60">{effect}</div>
                    {count > 1 && (
                      <div className="text-xs font-mono text-red-400">
                        ×{count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 text-xs font-mono opacity-20 text-center">
              Boxes opened: {openCount}
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
