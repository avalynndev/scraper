"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  effect: string;
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
    borderClass: "border-zinc-600",
    glowRgb: "113,113,122",
    glowA: "0.7",
    labelColor: "#a1a1aa",
  },
  {
    id: 2,
    cost: 25,
    tier: "RARE" as Tier,
    borderClass: "border-blue-700",
    glowRgb: "59,130,246",
    glowA: "0.8",
    labelColor: "#60a5fa",
  },
  {
    id: 3,
    cost: 50,
    tier: "CURSED" as Tier,
    borderClass: "border-purple-700",
    glowRgb: "168,85,247",
    glowA: "0.8",
    labelColor: "#c084fc",
  },
  {
    id: 4,
    cost: 100,
    tier: "LEGENDARY" as Tier,
    borderClass: "border-yellow-600",
    glowRgb: "234,179,8",
    glowA: "0.9",
    labelColor: "#facc15",
  },
];

const TIER_OVERLAY: Record<Tier, string> = {
  COMMON: "rgba(0,0,0,0.93)",
  RARE: "rgba(2,12,36,0.96)",
  CURSED: "rgba(18,0,36,0.96)",
  LEGENDARY: "rgba(28,18,0,0.97)",
};

const TIER_BEAM: Record<Tier, string> = {
  COMMON: "#a1a1aa",
  RARE: "#3b82f6",
  CURSED: "#a855f7",
  LEGENDARY: "#eab308",
};

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

function removeItemEffect(
  state: GlobalState,
  discarded: Item,
  remaining: Item[],
): GlobalState {
  const stillActive = remaining.some(
    (i) => i.effectKey === discarded.effectKey,
  );
  if (stillActive) return state;
  switch (discarded.effectKey) {
    case "worse_odds":
      state.upgrades["cursed-run"] = false;
      break;
    case "better_odds":
      state.upgrades["house-anger"] = false;
      break;
    case "reveal_odds":
      state.upgrades["odds-reveal"] = false;
      break;
    case "near_miss_reduce":
      state.upgrades["near-miss"] = false;
      break;
    case "cursed_run":
      state.upgrades["cursed-run"] = false;
      break;
    default:
      break;
  }
  return state;
}

interface PendingOpen {
  boxId: number;
  tier: Tier;
  cost: number;
  clicks: number;
  shaking: boolean;
}

export default function LootboxPage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<GlobalState["upgrades"] | null>(
    null,
  );
  const [inventory, setInventory] = useState<Item[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [fragments, setFragments] = useState(0);
  const [pending, setPending] = useState<PendingOpen | null>(null);
  const [reveal, setReveal] = useState<{ item: Item; tier: Tier } | null>(null);
  const [revealPhase, setRevealPhase] = useState<"enter" | "show" | "exit">(
    "enter",
  );

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);
    try {
      const saved = localStorage.getItem("casino_inventory_v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Item[];
        setInventory(parsed);
        setFragments(
          parsed.filter((i) => i.effectKey === "jackpot_fragment").length,
        );
      }
    } catch {}
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

  const handleBoxClick = useCallback(
    (box: (typeof BOXES)[0]) => {
      if (!hydrated) return;
      if (inventory.length >= MAX_INVENTORY) return;
      if (balance < box.cost) return;

      if (pending && pending.boxId !== box.id) {
        setPending(null);
        return;
      }

      const currentClicks = pending?.clicks ?? 0;
      const nextClicks = currentClicks + 1;

      if (nextClicks <= 3) {
        setPending({
          boxId: box.id,
          tier: box.tier,
          cost: box.cost,
          clicks: nextClicks,
          shaking: true,
        });
        setTimeout(
          () => setPending((p) => (p ? { ...p, shaking: false } : null)),
          420,
        );
      } else {
        setBalance((b) => b - box.cost);
        setPending(null);
        triggerOpen(box.tier, box.cost);
      }
    },
    [hydrated, balance, inventory.length, pending],
  );

  function triggerOpen(tier: Tier, _cost: number) {
    const item = rollItem(tier);

    let state = loadState();
    state = applyItemEffect(state, item);
    saveState(state);
    setUpgrades({ ...state.upgrades });

    if (item.effectKey === "gain_craps" || item.effectKey === "lose_craps") {
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

    const st = loadState();
    st.stats.totalSpins += 1;
    st.stats.gamesPlayed[GAME_NAME] =
      (st.stats.gamesPlayed[GAME_NAME] ?? 0) + 1;
    if (!st.stats.winRates[GAME_NAME])
      st.stats.winRates[GAME_NAME] = { wins: 0, plays: 0 };
    st.stats.winRates[GAME_NAME].plays += 1;
    if (item.type === "good") st.stats.winRates[GAME_NAME].wins += 1;
    saveState(st);

    setReveal({ item, tier });
    setRevealPhase("enter");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealPhase("show"));
    });
  }

  function dismissReveal() {
    setRevealPhase("exit");
    setTimeout(() => setReveal(null), 380);
  }

  const handleDiscard = (index: number) => {
    setInventory((inv) => {
      const item = inv[index];
      const remaining = inv.filter((_, i) => i !== index);

      if (item.effectKey === "jackpot_fragment") {
        setFragments((f) => Math.max(0, f - 1));
      }

      let state = loadState();
      state = removeItemEffect(state, item, remaining);
      saveState(state);
      setUpgrades({ ...state.upgrades });

      return remaining;
    });
  };

  const activeEffects = inventory
    .filter(
      (i) =>
        !["none", "jackpot_fragment", "gain_craps", "lose_craps"].includes(
          i.effectKey,
        ),
    )
    .reduce<Record<string, number>>((acc, i) => {
      acc[i.effect] = (acc[i.effect] ?? 0) + 1;
      return acc;
    }, {});

  if (!hydrated) return null;

  const beamColor = reveal ? TIER_BEAM[reveal.tier] : "#fff";
  const overlayBg = reveal ? TIER_OVERLAY[reveal.tier] : "rgba(0,0,0,0.95)";
  const itemColor =
    reveal?.item.type === "good"
      ? "#4ade80"
      : reveal?.item.type === "bad"
        ? "#f87171"
        : "#a1a1aa";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {reveal && (
        <div
          onClick={dismissReveal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: overlayBg,
            opacity: revealPhase === "exit" ? 0 : 1,
            transition: "opacity 0.38s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "280px",
              height: "100%",
              background: `linear-gradient(to bottom, transparent 5%, ${beamColor}18 40%, ${beamColor}28 55%, transparent 95%)`,
              opacity: revealPhase === "show" ? 1 : 0,
              transition: "opacity 0.55s ease 0.1s",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "2px",
              height: "100%",
              background: `linear-gradient(to bottom, transparent, ${beamColor}90, transparent)`,
              opacity: revealPhase === "show" ? 0.7 : 0,
              transition: "opacity 0.45s ease 0.15s",
              pointerEvents: "none",
            }}
          />

          {revealPhase === "show" &&
            Array.from({ length: 14 }).map((_, i) => {
              const left = 15 + ((i * 5.2) % 70);
              const top = 8 + ((i * 7.3) % 80);
              const size = 3 + (i % 5);
              const dur = 1.4 + (i % 3) * 0.6;
              const delay = (i % 4) * 0.25;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: "50%",
                    background: beamColor,
                    opacity: 0.35 + (i % 3) * 0.18,
                    animation: `lbParticle ${dur}s ease-in-out ${delay}s infinite alternate`,
                    pointerEvents: "none",
                  }}
                />
              );
            })}

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform:
                revealPhase === "show"
                  ? "scale(1) translateY(0)"
                  : "scale(0.55) translateY(48px)",
              opacity: revealPhase === "show" ? 1 : 0,
              transition:
                "transform 0.52s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease",
            }}
          >
            <div
              style={{
                fontSize: "88px",
                lineHeight: 1,
                marginBottom: "12px",
                filter: `drop-shadow(0 0 28px ${beamColor})`,
                animation:
                  revealPhase === "show"
                    ? "lbFloat 2.2s ease-in-out infinite alternate"
                    : "none",
              }}
            >
              {reveal.item.emoji}
            </div>
            <div style={{ fontSize: "68px", lineHeight: 1, opacity: 0.88 }}>
              📦
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "130px",
                height: "22px",
                borderRadius: "50%",
                background: beamColor,
                opacity: 0.22,
                filter: "blur(14px)",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "44px",
              textAlign: "center",
              transform:
                revealPhase === "show" ? "translateY(0)" : "translateY(24px)",
              opacity: revealPhase === "show" ? 1 : 0,
              transition: "transform 0.5s ease 0.18s, opacity 0.45s ease 0.18s",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontWeight: 900,
                fontSize: "30px",
                color: "#fff",
                letterSpacing: "-0.02em",
                marginBottom: "10px",
              }}
            >
              {reveal.item.name}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "15px",
                color: itemColor,
                marginBottom: "8px",
              }}
            >
              {reveal.item.effect}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#ffffff30",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
              }}
            >
              {reveal.tier} — tap anywhere to continue
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lbFloat {
          from { transform: translateY(0px) rotate(-5deg); }
          to   { transform: translateY(-22px) rotate(5deg); }
        }
        @keyframes lbParticle {
          from { transform: translateY(0) scale(1);   opacity: 0.25; }
          to   { transform: translateY(-22px) scale(1.5); opacity: 0.85; }
        }
        @keyframes lbShake {
          0%   { transform: translate(0,0) rotate(0deg); }
          15%  { transform: translate(-7px,-2px) rotate(-4deg); }
          30%  { transform: translate(7px,2px) rotate(4deg); }
          45%  { transform: translate(-5px,1px) rotate(-2deg); }
          60%  { transform: translate(5px,-1px) rotate(2deg); }
          80%  { transform: translate(-2px,0) rotate(-1deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
      `}</style>

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
          <Dialog>
            <DialogTrigger>
              <IconInfoCircle size={18} />
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">
                  HOW LOOTBOX WORKS
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Explanation of Lootbox Hell mechanics
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="text-xs opacity-40 mb-2">THE MECHANIC</div>
                  <p>
                    Click a box 3 times to unlock it, then once more to open.
                    Each tier costs more but has better item odds.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">TIERS</div>
                  <p>• COMMON (10 CRAPS): mostly junk, occasional +50 CRAPS.</p>
                  <p>
                    • RARE (25 CRAPS): loaded dice, rabbit's feet, debt scrolls.
                  </p>
                  <p>
                    • CURSED (50 CRAPS): bad items, but has Jackpot Fragments.
                  </p>
                  <p>
                    • LEGENDARY (100 CRAPS): best chance at House Key and good
                    items.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">ITEMS</div>
                  <p>
                    Items apply effects to all games — good and bad. Discarding
                    an item removes its effect from your account, unless another
                    item in your inventory still provides it.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">
                    JACKPOT FRAGMENTS
                  </div>
                  <p>
                    Collect 3 Jackpot Fragments to win 1000 CRAPS. Fragments are
                    consumed on payout.
                  </p>
                </div>
                <div className="border-t border-border pt-4 text-center opacity-40 text-xs">
                  Inventory holds 12 items. Discard to make room.
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
        <div className="flex-1 p-6 lg:p-10 border-r border-border space-y-10">
          <div>
            <h1 className="text-5xl font-black tracking-tighter">
              LOOTBOX HELL
            </h1>
            <p className="font-mono text-xs opacity-40 mt-2 tracking-widest">
              CLICK 3× TO OPEN
            </p>
            {inventory.length >= MAX_INVENTORY && (
              <p className="font-mono text-xs text-red-400 mt-2">
                INVENTORY FULL — DISCARD AN ITEM FIRST
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {BOXES.map((box) => {
              const isPending = pending?.boxId === box.id;
              const clicks = isPending ? pending.clicks : 0;
              const isShaking = isPending && pending.shaking;
              const canAfford = balance >= box.cost;
              const isFull = inventory.length >= MAX_INVENTORY;
              const isDisabled = !canAfford || isFull;
              const glowStr = `rgba(${box.glowRgb},${box.glowA})`;
              const glowIntensity = isPending
                ? `0 0 ${10 + clicks * 10}px ${glowStr}`
                : "none";

              return (
                <div
                  key={box.id}
                  onClick={() => !isDisabled && handleBoxClick(box)}
                  className={`border-2 ${box.borderClass} p-6 flex flex-col items-center gap-3 select-none ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}
                  style={{
                    transition: "box-shadow 0.3s ease, opacity 0.2s",
                    boxShadow: isDisabled ? "none" : glowIntensity,
                  }}
                >
                  <div
                    style={{
                      fontSize: "52px",
                      lineHeight: 1,
                      animation: isShaking ? "lbShake 0.42s ease" : "none",
                      filter: isPending
                        ? `drop-shadow(0 0 ${6 + clicks * 8}px ${glowStr})`
                        : "none",
                      transition: "filter 0.25s ease",
                    }}
                  >
                    📦
                  </div>

                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "50%",
                          background: i < clicks ? glowStr : "transparent",
                          border: `1.5px solid ${glowStr}`,
                          transition: "background 0.18s ease",
                          boxShadow: i < clicks ? `0 0 6px ${glowStr}` : "none",
                        }}
                      />
                    ))}
                  </div>

                  <div className="text-center">
                    <div
                      className="text-xs font-mono tracking-widest mb-1"
                      style={{ color: box.labelColor }}
                    >
                      {box.tier}
                    </div>
                    <div className="font-black text-xl tabular-nums">
                      {box.cost}
                    </div>
                    <div className="text-xs font-mono opacity-50">CRAPS</div>
                  </div>

                  <div className="text-xs font-mono opacity-30">
                    {isPending
                      ? clicks === 3
                        ? "now open it"
                        : clicks === 2
                          ? "one more…"
                          : "again…"
                      : "click to start"}
                  </div>
                </div>
              );
            })}
          </div>

          {fragments > 0 && (
            <div className="border border-blue-800 p-4 text-center space-y-2">
              <div className="font-mono text-xs text-blue-400 tracking-widest">
                JACKPOT FRAGMENTS: {fragments} / 3
              </div>
              <div className="font-mono text-xs opacity-30">
                Collect 3 to win 1000 CRAPS
              </div>
              <div className="w-full h-1 bg-border">
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
                    className={`text-xs font-mono ${item.type === "good" ? "text-green-400" : item.type === "bad" ? "text-red-400" : "opacity-40"}`}
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

        <div className="w-full lg:w-72 flex flex-col">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="font-black">INVENTORY</div>
            <div className="text-xs font-mono opacity-30">
              {inventory.length} / {MAX_INVENTORY}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {inventory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20 py-12">
                <div className="text-4xl">🕳️</div>
                <div className="text-xs font-mono text-center">
                  No items yet.
                  <br />
                  Click a box 3× to open.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {inventory.map((item, i) => (
                  <div
                    key={i}
                    className={`border px-3 py-2 flex items-center justify-between gap-2 ${item.type === "good" ? "border-green-900/50" : item.type === "bad" ? "border-red-900/50" : "border-border"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-black truncate">
                          {item.name}
                        </div>
                        <div
                          className={`font-mono text-xs truncate ${item.type === "good" ? "text-green-400" : item.type === "bad" ? "text-red-400" : "opacity-30"}`}
                        >
                          {item.effect}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDiscard(i)}
                      className="text-xs font-mono opacity-20 hover:opacity-70 shrink-0 transition-opacity px-1"
                      title="Discard (removes effect)"
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
