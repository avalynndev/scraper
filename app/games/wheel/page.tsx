"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  loadState,
  saveState,
  recordSpin,
  recordBroke,
  recordLossStreak,
  type OwnedUpgrades,
} from "@/lib/gameStore";

const GAME_NAME = "WHEEL OF REGRET";

const BASE_SEGMENTS = [
  { label: "+200", color: "#22c55e", type: "win", value: 200 },
  { label: "−150", color: "#ef4444", type: "lose", value: -150 },
  { label: "SPIN AGAIN", color: "#eab308", type: "chaos", value: 0 },
  { label: "+500", color: "#22c55e", type: "win", value: 500 },
  { label: "CURSE", color: "#7c3aed", type: "curse", value: -50 },
  { label: "−300", color: "#ef4444", type: "lose", value: -300 },
  { label: "+100", color: "#22c55e", type: "win", value: 100 },
  { label: "WORSE ODDS", color: "#f97316", type: "chaos", value: -25 },
];

export default function WheelPage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<OwnedUpgrades | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [history, setHistory] = useState<
    Array<{ label: string; value: number; type: string }>
  >([]);
  const [freeSpinPending, setFreeSpinPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [cursed, setCursed] = useState(false);

  const wheelRef = useRef<SVGSVGElement>(null);

  const baseCost = 25;
  const spinCost = freeSpinPending
    ? 0
    : Math.min(baseCost * Math.pow(2, spinCount), 3200);
  const nextCost = Math.min(baseCost * Math.pow(2, spinCount + 1), 3200);

  const segAngle = 360 / BASE_SEGMENTS.length;

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);
    try {
      const saved = localStorage.getItem("wheel_history_v1");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "wheel_history_v1",
      JSON.stringify(history.slice(0, 10)),
    );
  }, [history, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const state = loadState();
    state.balance = balance;
    saveState(state);
    if (balance <= 0) recordBroke();
  }, [balance, hydrated]);

  const getSegments = () => {
    if (!upgrades?.["chaos-mode"]) return BASE_SEGMENTS;
    return BASE_SEGMENTS.map((s) => ({
      ...s,
      value: s.value * 3,
      label:
        s.type === "win"
          ? `+${Math.abs(s.value * 3)}`
          : s.type === "lose"
            ? `−${Math.abs(s.value * 3)}`
            : s.label,
    }));
  };

  const handleSpin = () => {
    if (spinning || !hydrated) return;
    if (!freeSpinPending && balance < spinCost) return;

    if (!freeSpinPending) {
      setBalance((b) => b - spinCost);
    }
    setFreeSpinPending(false);
    setSpinning(true);
    setResult(null);

    const segments = getSegments();
    let targetIndex: number;
    if (cursed || upgrades?.["cursed-run"]) {
      const loseIndices = segments
        .map((s, i) => (s.type === "lose" || s.type === "curse" ? i : -1))
        .filter((i) => i !== -1);
      if (loseIndices.length > 0 && Math.random() < 0.6) {
        targetIndex =
          loseIndices[Math.floor(Math.random() * loseIndices.length)];
      } else {
        targetIndex = Math.floor(Math.random() * segments.length);
      }
    } else {
      targetIndex = Math.floor(Math.random() * segments.length);
    }

    const targetMidAngle = targetIndex * segAngle + segAngle / 2;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const newRotation = rotation + extraSpins * 360 + (360 - targetMidAngle);

    setRotation(newRotation);

    setTimeout(() => {
      const seg = segments[targetIndex];
      const newSpinCount = spinCount + 1;
      const newTotal = totalSpins + 1;
      setSpinCount(newSpinCount);
      setTotalSpins(newTotal);

      if (seg.type === "chaos" && seg.label === "SPIN AGAIN") {
        setFreeSpinPending(true);
        setResult("FREE SPIN!");
        setHistory((h) => [seg, ...h].slice(0, 10));
        setSpinning(false);
        return;
      }

      let actualValue = seg.value;
      if (upgrades?.["volatility"]) {
        actualValue = Math.ceil(actualValue * 0.7);
      }

      if (seg.type === "curse") {
        setCursed(true);
        setResult("CURSED! Odds worsened.");
        setHistory((h) => [seg, ...h].slice(0, 10));
        recordSpin({ game: GAME_NAME, bet: spinCost, payout: 0 });
        setLossStreak((s) => {
          const next = s + 1;
          recordLossStreak(next);
          return next;
        });
        setSpinning(false);
        return;
      }

      if (actualValue > 0) {
        setBalance((b) => b + actualValue);
        setTotalWins((w) => w + 1);
        setLossStreak(0);
        setResult(`+${actualValue} CRAPS`);
        recordSpin({ game: GAME_NAME, bet: spinCost, payout: actualValue });
      } else {
        const loss = Math.abs(actualValue);
        setBalance((b) => Math.max(0, b + actualValue));
        setResult(`−${loss} CRAPS`);
        recordSpin({ game: GAME_NAME, bet: spinCost, payout: 0 });
        setLossStreak((s) => {
          const next = s + 1;
          recordLossStreak(next);
          return next;
        });
      }

      setHistory((h) => [{ ...seg, value: actualValue }, ...h].slice(0, 10));
      setSpinning(false);
    }, 4000);
  };

  const winRate =
    totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(1) : "—";

  if (!hydrated) return null;

  const segments = getSegments();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute inset-0 ${
            cursed
              ? "bg-[radial-gradient(ellipse_at_bottom,rgba(124,58,237,0.1)_0%,transparent_60%)]"
              : "bg-[radial-gradient(ellipse_at_bottom,rgba(234,179,8,0.05)_0%,transparent_60%)]"
          }`}
        />
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
          {cursed && (
            <Badge
              variant="outline"
              className="border-purple-900 text-purple-400 font-mono text-xs animate-pulse"
            >
              CURSED
            </Badge>
          )}
          {upgrades?.["chaos-mode"] && (
            <Badge
              variant="outline"
              className="border-red-900 text-red-400 font-mono text-xs"
            >
              CHAOS: ON
            </Badge>
          )}
          <Badge
            variant="outline"
            className="border-yellow-900 text-yellow-400 font-mono text-xs"
          >
            DANGER: MEDIUM
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">{balance} CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter">
            WHEEL OF REGRET
          </h1>
          <p className="font-mono text-xs opacity-40 tracking-widest">
            NOBODY STOPS EARLY
          </p>
          {upgrades?.["odds-reveal"] && (
            <p className="font-mono text-xs text-blue-400 tracking-widest">
              Win segments: {segments.filter((s) => s.type === "win").length} /{" "}
              {segments.length} (
              {(
                (segments.filter((s) => s.type === "win").length /
                  segments.length) *
                100
              ).toFixed(0)}
              %)
            </p>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0"
            style={{
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "20px solid hsl(var(--foreground))",
            }}
          />

          <svg
            ref={wheelRef}
            width="300"
            height="300"
            viewBox="0 0 300 300"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                : "none",
            }}
          >
            {segments.map((seg, i) => {
              const startAngle = (i * segAngle - 90) * (Math.PI / 180);
              const endAngle = ((i + 1) * segAngle - 90) * (Math.PI / 180);
              const x1 = 150 + 140 * Math.cos(startAngle);
              const y1 = 150 + 140 * Math.sin(startAngle);
              const x2 = 150 + 140 * Math.cos(endAngle);
              const y2 = 150 + 140 * Math.sin(endAngle);
              const midAngle = ((i + 0.5) * segAngle - 90) * (Math.PI / 180);
              const tx = 150 + 100 * Math.cos(midAngle);
              const ty = 150 + 100 * Math.sin(midAngle);
              const textRotation = (i + 0.5) * segAngle;

              return (
                <g key={i}>
                  <path
                    d={`M 150 150 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`}
                    fill={seg.color}
                    opacity={0.85}
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="900"
                    fontFamily="monospace"
                    transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}
            <circle
              cx="150"
              cy="150"
              r="20"
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="w-full max-w-xs space-y-4">
          {result && (
            <div
              className={`text-center font-black font-mono text-lg ${
                result.startsWith("+") || result === "FREE SPIN!"
                  ? "text-green-400"
                  : result.includes("CURSE")
                    ? "text-purple-400"
                    : "text-red-400"
              }`}
            >
              {result}
            </div>
          )}

          <div className="flex items-center justify-between border border-border p-4">
            <div>
              <div className="text-xs font-mono opacity-40">SPIN COST</div>
              <div className="font-black text-2xl tabular-nums">
                {freeSpinPending ? (
                  <span className="text-green-400">FREE</span>
                ) : (
                  <>
                    {spinCost}{" "}
                    <span className="text-base font-mono opacity-50">
                      CRAPS
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono opacity-40">NEXT SPIN</div>
              <div className="font-black text-2xl tabular-nums text-red-400">
                {nextCost}{" "}
                <span className="text-base font-mono opacity-50">CRAPS</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full font-black tracking-widest text-lg py-6 disabled:opacity-30"
            disabled={
              spinning || (!freeSpinPending && balance < spinCost) || !hydrated
            }
            onClick={handleSpin}
          >
            {spinning
              ? "SPINNING..."
              : freeSpinPending
                ? "FREE SPIN"
                : `SPIN — ${spinCost} CRAPS`}
          </Button>

          <div className="grid grid-cols-3 border border-border divide-x divide-border">
            {[
              { label: "SPINS", value: totalSpins },
              { label: "WIN RATE", value: `${winRate}%` },
              { label: "STREAK ↓", value: lossStreak },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 text-center">
                <div className="text-xs font-mono opacity-30">{label}</div>
                <div className="font-black tabular-nums">{value}</div>
              </div>
            ))}
          </div>

          <p className="text-xs font-mono opacity-20 text-center">
            Rewards and punishments grow every spin. Spin costs double.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="text-xs font-mono opacity-30 mb-3 tracking-wider">
            SPIN HISTORY
          </div>
          <div className="flex gap-2 flex-wrap">
            {history.length === 0
              ? ["—", "—", "—", "—", "—"].map((_, i) => (
                  <div
                    key={i}
                    className="border border-border px-3 py-1 text-xs font-mono opacity-20"
                  >
                    —
                  </div>
                ))
              : history.map((h, i) => (
                  <div
                    key={i}
                    className={`border px-3 py-1 text-xs font-mono ${
                      h.type === "win"
                        ? "border-green-900 text-green-400"
                        : h.type === "curse"
                          ? "border-purple-900 text-purple-400"
                          : h.type === "chaos"
                            ? "border-yellow-900 text-yellow-400"
                            : "border-red-900 text-red-400"
                    }`}
                  >
                    {h.label}
                  </div>
                ))}
          </div>
        </div>

        {balance <= 0 && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="border border-yellow-900 bg-background p-10 max-w-md text-center space-y-6">
              <div className="text-4xl font-black text-yellow-400">BROKE.</div>
              <div className="font-mono text-sm opacity-60">
                THE WHEEL TOOK EVERYTHING.
              </div>
              <div className="font-mono text-xs opacity-40">
                Win rate: {winRate}% across {totalSpins} spins
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setBalance(100);
                    setSpinCount(0);
                    setTotalSpins(0);
                    setTotalWins(0);
                    setLossStreak(0);
                    setHistory([]);
                    setResult(null);
                    setCursed(false);
                  }}
                >
                  RETRY (+100)
                </Button>
                <Button className="flex-1">
                  <Link href="/">RETURN TO FLOOR</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-6 text-center">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
