"use client";

import { useState, useEffect, useRef } from "react";
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
  recordSpin,
  recordBroke,
  recordLossStreak,
  type OwnedUpgrades,
} from "@/lib/gameStore";

const GAME_NAME = "MARTINGALE SIM";
const HISTORY_KEY = "martingale_history_v1";

interface SimResult {
  rounds: number;
  ruinRound: number | null;
  totalProfit: number;
  totalLoss: number;
  peakBalance: number;
  balanceHistory: number[];
  verdict: string;
  ranAt: number;
}

function sampleArray(arr: number[], maxLen: number): number[] {
  if (arr.length <= maxLen) return arr;
  const result: number[] = [];
  const step = (arr.length - 1) / (maxLen - 1);
  for (let i = 0; i < maxLen; i++) result.push(arr[Math.round(i * step)]);
  return result;
}

function runMartingale(opts: {
  startingBalance: number;
  startingBet: number;
  multiplier: number;
  maxBet: number;
  maxRounds: number;
  winChance: number;
  upgrades: OwnedUpgrades;
}): SimResult {
  const {
    startingBalance,
    startingBet,
    multiplier,
    maxBet,
    maxRounds,
    winChance,
    upgrades,
  } = opts;

  let balance = startingBalance;
  let bet = startingBet;
  let round = 0;
  let ruinRound: number | null = null;
  let totalProfit = 0;
  let totalLoss = 0;
  let peakBalance = startingBalance;
  let lossStreakCur = 0;

  const rawHistory: number[] = [startingBalance];

  while (round < maxRounds) {
    round++;

    const cap = maxBet > 0 ? maxBet : Infinity;
    const actualBet = Math.min(bet, balance, cap);
    if (actualBet <= 0) {
      ruinRound = round;
      break;
    }

    let odds = winChance;
    if (upgrades["cursed-run"]) odds -= 0.05;
    if (upgrades["house-anger"]) odds += 0.03;
    if (upgrades["chaos-mode"]) odds = 0.15 + Math.random() * 0.55;
    odds = Math.max(0.05, Math.min(0.95, odds));

    const won = Math.random() < odds;

    if (won) {
      const payout = upgrades["volatility"]
        ? Math.ceil(actualBet * 0.75)
        : actualBet;
      balance += payout;
      totalProfit += payout;
      bet = startingBet;
      lossStreakCur = 0;
    } else {
      const loss = upgrades["volatility"]
        ? Math.ceil(actualBet * 0.75)
        : actualBet;
      balance -= loss;
      totalLoss += loss;
      lossStreakCur++;
      bet = Math.min(
        Math.ceil(bet * multiplier),
        maxBet > 0 ? maxBet : Infinity,
      );
    }

    if (balance > peakBalance) peakBalance = balance;
    rawHistory.push(Math.max(0, balance));

    if (balance <= 0) {
      ruinRound = round;
      balance = 0;
      break;
    }
  }

  const net = totalProfit - totalLoss;
  let verdict = "SURVIVED";
  if (ruinRound !== null) verdict = "RUINED";
  else if (net > 0) verdict = "PROFITABLE";
  else if (net < 0) verdict = "LOSING";

  return {
    rounds: round,
    ruinRound,
    totalProfit,
    totalLoss,
    peakBalance,
    balanceHistory: sampleArray(rawHistory, 120),
    verdict,
    ranAt: Date.now(),
  };
}

function BalanceGraph({
  history,
  isRunning,
}: {
  history: number[];
  isRunning: boolean;
}) {
  const W = 400;
  const H = 160;

  if (history.length < 2) {
    return (
      <div className="relative h-40 border border-border flex items-center justify-center">
        <span className="text-xs font-mono opacity-20">
          RUN SIMULATION TO SEE GRAPH
        </span>
      </div>
    );
  }

  const maxVal = Math.max(...history, 1);

  const pts = history.map((v, i) => ({
    x: (i / (history.length - 1)) * W,
    y: H - (v / maxVal) * H,
  }));

  const polyline = pts
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M ${pts[0].x.toFixed(1)},${H} ` +
    pts.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L ${pts[pts.length - 1].x.toFixed(1)},${H} Z`;

  const ruinIdx = history.findIndex((v) => v === 0);
  const ruinPt = ruinIdx >= 0 ? pts[ruinIdx] : null;
  const peakIdx = history.indexOf(Math.max(...history));
  const peakPt = pts[peakIdx];

  const lineColor = ruinPt ? "#ef4444" : "hsl(var(--foreground))";
  const fillColor = ruinPt ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)";

  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <line
            key={v}
            x1="0"
            y1={H * v}
            x2={W}
            y2={H * v}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
        ))}
        <path d={areaPath} fill={fillColor} />
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity={isRunning ? 0.4 : 0.7}
        />
        {!ruinPt && peakPt && (
          <circle
            cx={peakPt.x}
            cy={peakPt.y}
            r="3"
            fill="#4ade80"
            opacity="0.8"
          />
        )}
        {ruinPt && (
          <>
            <line
              x1={ruinPt.x}
              y1={0}
              x2={ruinPt.x}
              y2={H}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.6"
            />
            <circle cx={ruinPt.x} cy={ruinPt.y} r="4" fill="#ef4444" />
          </>
        )}
      </svg>
      {ruinPt && (
        <div className="absolute bottom-2 right-0 text-xs font-mono text-red-400 opacity-60">
          ← RUIN POINT
        </div>
      )}
    </div>
  );
}

export default function MartingalePage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<OwnedUpgrades | null>(null);

  const [startingBet, setStartingBet] = useState(10);
  const [multiplier, setMultiplier] = useState(2);
  const [maxBet, setMaxBet] = useState(0);
  const [maxRounds, setMaxRounds] = useState(100);
  const [winChance, setWinChance] = useState(48);

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [graphHistory, setGraphHistory] = useState<number[]>([]);
  const [simCount, setSimCount] = useState(0);

  const runningRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed: SimResult = JSON.parse(saved);
        setResult(parsed);
        setGraphHistory(parsed.balanceHistory);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state = loadState();
    state.balance = balance;
    saveState(state);
    if (balance <= 0) recordBroke();
  }, [balance, hydrated]);

  useEffect(() => {
    if (startingBet > balance && balance > 0) setStartingBet(balance);
  }, [balance]);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const handleRun = () => {
    if (isRunning || !hydrated || !upgrades) return;
    setIsRunning(true);
    setResult(null);
    setGraphHistory([]);

    let step = 0;
    const totalSteps = 32;

    runningRef.current = setInterval(() => {
      step++;

      const partialLen = Math.ceil((step / totalSteps) * 60);
      const partial = Array.from({ length: partialLen }, (_, i) => {
        const t = i / Math.max(partialLen - 1, 1);
        const trend = 1 + (Math.random() - 0.54) * 0.4 * t;
        return Math.max(0, balance * trend);
      });
      setGraphHistory(sampleArray(partial, 40));

      if (step >= totalSteps) {
        clearInterval(runningRef.current!);

        const sim = runMartingale({
          startingBalance: balance,
          startingBet,
          multiplier,
          maxBet,
          maxRounds,
          winChance: winChance / 100,
          upgrades,
        });

        setResult(sim);
        setGraphHistory(sim.balanceHistory);
        setSimCount((c) => c + 1);

        const entryCost = Math.min(startingBet, balance);
        const net = sim.totalProfit - sim.totalLoss;
        const scaledNet =
          sim.ruinRound !== null
            ? -entryCost
            : Math.round(net * (entryCost / balance));

        const newBalance = Math.max(0, balance + scaledNet);
        setBalance(newBalance);

        if (scaledNet > 0) {
          recordSpin({ game: GAME_NAME, bet: entryCost, payout: scaledNet });
        } else {
          recordSpin({ game: GAME_NAME, bet: entryCost, payout: 0 });
          recordLossStreak(sim.rounds);
        }

        localStorage.setItem(HISTORY_KEY, JSON.stringify(sim));
        setIsRunning(false);
      }
    }, 120);
  };

  const handleReset = () => {
    if (runningRef.current) clearInterval(runningRef.current);
    setIsRunning(false);
    setResult(null);
    setGraphHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  useEffect(
    () => () => {
      if (runningRef.current) clearInterval(runningRef.current);
    },
    [],
  );

  const net = result ? result.totalProfit - result.totalLoss : null;
  const netColor =
    net === null ? "" : net >= 0 ? "text-green-400" : "text-red-400";
  const verdictColor =
    result?.verdict === "RUINED"
      ? "text-red-400"
      : result?.verdict === "PROFITABLE"
        ? "text-green-400"
        : "";

  const settings = [
    {
      label: "STARTING BET",
      display: `${startingBet}`,
      unit: "CRAPS",
      onDec: () => setStartingBet((v) => clamp(v - 5, 1, balance)),
      onInc: () => setStartingBet((v) => clamp(v + 5, 1, Math.max(balance, 1))),
    },
    {
      label: "MULTIPLIER",
      display: `${multiplier}×`,
      unit: "",
      onDec: () =>
        setMultiplier((v) => clamp(parseFloat((v - 0.5).toFixed(1)), 1.5, 10)),
      onInc: () =>
        setMultiplier((v) => clamp(parseFloat((v + 0.5).toFixed(1)), 1.5, 10)),
    },
    {
      label: "MAX BET CAP",
      display: maxBet === 0 ? "∞" : `${maxBet}`,
      unit: "",
      onDec: () => setMaxBet((v) => Math.max(0, v - 50)),
      onInc: () => setMaxBet((v) => v + 50),
    },
    {
      label: "MAX ROUNDS",
      display: `${maxRounds}`,
      unit: "",
      onDec: () => setMaxRounds((v) => clamp(v - 25, 25, 2000)),
      onInc: () => setMaxRounds((v) => clamp(v + 25, 25, 2000)),
    },
    {
      label: "WIN CHANCE",
      display: `${winChance}%`,
      unit: "",
      onDec: () => setWinChance((v) => clamp(v - 1, 10, 90)),
      onInc: () => setWinChance((v) => clamp(v + 1, 10, 90)),
    },
  ];

  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(100,116,139,0.05)_0%,transparent_60%)]" />
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
          {upgrades?.["chaos-mode"] && (
            <Badge
              variant="outline"
              className="border-red-900 text-red-400 font-mono text-xs animate-pulse"
            >
              CHAOS: ON
            </Badge>
          )}
          {upgrades?.["cursed-run"] && (
            <Badge
              variant="outline"
              className="border-purple-900 text-purple-400 font-mono text-xs"
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
                  HOW MARTINGALE WORKS
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Explanation of the Martingale simulation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="text-xs opacity-40 mb-2">THE STRATEGY</div>
                  <p>
                    The Martingale strategy doubles your bet after every loss,
                    then resets to the starting bet after a win. In theory, one
                    win always recovers all previous losses.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">WHY IT FAILS</div>
                  <p>
                    A long loss streak forces your bet to grow exponentially.
                    You will eventually either run out of money or hit the table
                    limit before recovering. It is not a question of if — only
                    when.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">THE SETTINGS</div>
                  <p>
                    Starting Bet is your initial stake. Multiplier controls how
                    fast the bet grows on losses (2× is classic). Max Bet Cap
                    simulates table limits. Max Rounds caps the simulation
                    length. Win Chance is the probability of winning each round.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">REAL MONEY</div>
                  <p>
                    Running a sim costs your starting bet. The sim result scales
                    back to a proportional real gain or loss on your balance.
                    Ruin in the sim always costs the full entry.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">UPGRADES</div>
                  <p>
                    Chaos Mode randomises win chance per round. Cursed Run
                    subtracts 5%. Reduced Volatility caps each bet's impact at
                    75%.
                  </p>
                </div>
                <div className="border-t border-border pt-4 text-center opacity-40 text-xs">
                  Statistically guaranteed failure.
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge
            variant="outline"
            className="border-zinc-600 text-zinc-400 font-mono text-xs"
          >
            DANGER: CERTAIN
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">{balance} CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-10 gap-10">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter">
            MARTINGALE SIM
          </h1>
          <p className="font-mono text-xs opacity-40 tracking-widest">
            STATISTICALLY GUARANTEED FAILURE
          </p>
        </div>

        <div className="border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              BALANCE OVER TIME
            </div>
            <div
              className={`text-xs font-mono opacity-60 ${isRunning ? "animate-pulse" : ""}`}
            >
              {isRunning
                ? "SIMULATING…"
                : result
                  ? `SIM #${simCount} · ${result.rounds} ROUNDS`
                  : "NO DATA"}
            </div>
          </div>

          <BalanceGraph history={graphHistory} isRunning={isRunning} />

          <div className="text-xs font-mono opacity-20">
            {result?.ruinRound
              ? `Statistically doomed at round ${result.ruinRound}.`
              : result
                ? `Survived ${result.rounds} rounds. Peak: ${result.peakBalance} CRAPS.`
                : "The Martingale always ends the same way."}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border p-6 space-y-5">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              STRATEGY SETTINGS
            </div>
            {settings.map(({ label, display, unit, onDec, onInc }) => (
              <div key={label} className="space-y-2">
                <div className="text-xs font-mono opacity-40">{label}</div>
                <div className="flex items-center border border-border">
                  <button
                    onClick={onDec}
                    disabled={isRunning}
                    className="px-3 py-2 font-mono opacity-40 hover:opacity-100 transition-opacity border-r border-border text-sm disabled:opacity-10"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center font-black text-lg py-2">
                    {display}
                    {unit && (
                      <span className="text-sm font-mono opacity-50 ml-1">
                        {unit}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={onInc}
                    disabled={isRunning}
                    className="px-3 py-2 font-mono opacity-40 hover:opacity-100 transition-opacity border-l border-border text-sm disabled:opacity-10"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              RESULTS
            </div>
            {[
              {
                label: "NET PROFIT/LOSS",
                value:
                  net !== null ? `${net >= 0 ? "+" : ""}${net} CRAPS` : "—",
                color: netColor,
              },
              {
                label: "TOTAL GAINED",
                value: result ? `+${result.totalProfit}` : "—",
                color: result ? "text-green-400" : "",
              },
              {
                label: "TOTAL LOST",
                value: result ? `−${result.totalLoss}` : "—",
                color: result ? "text-red-400" : "",
              },
              {
                label: "ROUNDS PLAYED",
                value: result ? String(result.rounds) : "—",
                color: "",
              },
              {
                label: "RUIN ROUND",
                value: result
                  ? result.ruinRound
                    ? String(result.ruinRound)
                    : "NONE"
                  : "—",
                color: result?.ruinRound ? "text-red-400" : "",
              },
              {
                label: "PEAK BALANCE",
                value: result ? `${result.peakBalance} CRAPS` : "—",
                color: result ? "text-green-400" : "",
              },
              {
                label: "VERDICT",
                value: result?.verdict ?? "NOT RUN",
                color: verdictColor,
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="text-xs font-mono opacity-40">{label}</div>
                <div
                  className={`font-black text-sm tabular-nums ${color || "opacity-30"}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            className="flex-1 font-black tracking-widest text-lg py-6 disabled:opacity-30"
            onClick={handleRun}
            disabled={isRunning || balance <= 0}
          >
            {isRunning ? "SIMULATING…" : "RUN SIMULATION"}
          </Button>
          <Button
            variant="outline"
            className="px-8 font-mono opacity-50 disabled:opacity-20"
            onClick={handleReset}
            disabled={isRunning}
          >
            RESET
          </Button>
        </div>

        <p className="text-xs font-mono opacity-20 text-center">
          The Martingale strategy guarantees short-term wins and long-term ruin.
          Running a sim costs your starting bet.
        </p>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
