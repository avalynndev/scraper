"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";
import {
  loadState,
  saveState,
  recordSpin,
  recordBroke,
  recordLossStreak,
  type OwnedUpgrades,
} from "@/lib/gameStore";

const SYMBOLS = ["🍒", "💎", "7️⃣", "⭐", "🔔", "🃏", "💰", "🎰"];

const PAYOUTS: Record<string, number> = {
  "🍒🍒🍒": 50,
  "💎💎💎": 100,
  "7️⃣7️⃣7️⃣": 500,
  "⭐⭐⭐": 200,
  "🔔🔔🔔": 75,
  "🃏🃏🃏": 150,
  "💰💰💰": 300,
  "🎰🎰🎰": 1000,
};

const GAME_NAME = "RIGGED SLOT";

export default function RiggedSlotPage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalanceState] = useState(100);
  const [upgrades, setUpgrades] = useState<OwnedUpgrades | null>(null);
  const [bet, setBet] = useState(10);
  const [jackpot, setJackpot] = useState(10000);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[][]>([
    [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
    [SYMBOLS[1], SYMBOLS[2], SYMBOLS[3]],
    [SYMBOLS[2], SYMBOLS[3], SYMBOLS[4]],
  ]);
  const [spins, setSpins] = useState(0);
  const [wins, setWins] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [sessionSpins, setSessionSpins] = useState(0);
  const [oddsInfo, setOddsInfo] = useState<string | null>(null);

  const spinIntervals = useRef<NodeJS.Timeout[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const state = loadState();
    setBalanceState(state.balance);
    setUpgrades(state.upgrades);
    setHydrated(true);
  }, []);

  // Persist balance whenever it changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    const state = loadState();
    state.balance = balance;
    saveState(state);
    if (balance === 0) recordBroke();
  }, [balance, hydrated]);

  const getRandomSymbol = () =>
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

  const calculateOdds = (currentSpins: number): number => {
    const isChaos = upgrades?.["chaos-mode"];
    const isCursed = upgrades?.["cursed-run"];
    const isProvoked = upgrades?.["house-provoke"];

    let base = 0.15;
    if (isChaos) base = 0.15 * 3; // huge variance — can go very high
    if (isCursed) base -= 0.05; // slightly worse forever
    if (isProvoked) base -= 0.03; // house is angry

    const penaltyMult = isChaos ? 0.0025 : 0.005;
    const spinPenalty = Math.min(
      currentSpins * penaltyMult,
      isChaos ? 0.05 : 0.1,
    );
    return Math.max(0.02, base - spinPenalty);
  };

  const nearMissChance = (): number => {
    if (upgrades?.["near-miss"]) return 0.1; // reduced
    return 0.3;
  };

  const shouldNearMiss = () =>
    Math.random() < nearMissChance() && sessionSpins > 3;

  const generateNearMiss = () => {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    return [
      [symbol, getRandomSymbol(), getRandomSymbol()],
      [symbol, getRandomSymbol(), getRandomSymbol()],
      [
        SYMBOLS[(SYMBOLS.indexOf(symbol) + 1) % SYMBOLS.length],
        getRandomSymbol(),
        getRandomSymbol(),
      ],
    ];
  };

  const generateWinningReels = () => {
    const winningSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    return [
      [winningSymbol, getRandomSymbol(), getRandomSymbol()],
      [winningSymbol, getRandomSymbol(), getRandomSymbol()],
      [winningSymbol, getRandomSymbol(), getRandomSymbol()],
    ];
  };

  const generateLosingReels = () => {
    const volatility = upgrades?.["volatility"];
    // With volatility upgrade, ensure top symbols differ a lot (no accidental near-misses)
    if (volatility) {
      const s1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      let s2 = s1;
      while (s2 === s1)
        s2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      let s3 = s1;
      while (s3 === s1 || s3 === s2)
        s3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      return [
        [s1, getRandomSymbol(), getRandomSymbol()],
        [s2, getRandomSymbol(), getRandomSymbol()],
        [s3, getRandomSymbol(), getRandomSymbol()],
      ];
    }
    return [
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
    ];
  };

  const handleSpin = () => {
    if (balance < bet || isSpinning || !hydrated) return;

    const odds = calculateOdds(sessionSpins + 1);

    // Show odds if upgrade purchased
    if (upgrades?.["odds-reveal"]) {
      setOddsInfo(`Win chance this spin: ${(odds * 100).toFixed(1)}%`);
    }

    setIsSpinning(true);
    setResult(null);
    setBalanceState((b) => b - bet);
    setSpins((s) => s + 1);
    setSessionSpins((s) => s + 1);

    spinIntervals.current.forEach((i) => clearInterval(i));
    spinIntervals.current = [];

    const willWin = Math.random() < odds;
    let finalReels: string[][];

    if (willWin) {
      finalReels = generateWinningReels();
    } else if (shouldNearMiss()) {
      finalReels = generateNearMiss();
    } else {
      finalReels = generateLosingReels();
    }

    const spinDurations = [1500, 2000, 2500];

    spinDurations.forEach((duration, reelIndex) => {
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 50;
        if (elapsed >= duration) {
          clearInterval(interval);
          setReels((prev) => {
            const nr = [...prev];
            nr[reelIndex] = finalReels[reelIndex];
            return nr;
          });
        } else {
          setReels((prev) => {
            const nr = [...prev];
            nr[reelIndex] = [
              getRandomSymbol(),
              getRandomSymbol(),
              getRandomSymbol(),
            ];
            return nr;
          });
        }
      }, 50);
      spinIntervals.current.push(interval);
    });

    setTimeout(() => {
      const payLine = finalReels.map((reel) => reel[1]).join("");
      const basePayout = PAYOUTS[payLine];

      let payout = 0;
      if (basePayout) {
        const chaos = upgrades?.["chaos-mode"];
        const volatility = upgrades?.["volatility"];
        let multiplier = basePayout;
        if (chaos) multiplier = basePayout * 3;
        if (volatility) multiplier = Math.ceil(basePayout * 0.7); // smaller swings
        payout = Math.floor((multiplier * bet) / 10);
      }

      if (payout > 0) {
        setBalanceState((prev) => prev + payout);
        setWins((w) => w + 1);
        setCurrentStreak((s) => s + 1);
        setLossStreak(0);
        setResult(`WIN! +${payout} CRAPS`);
        recordSpin({ game: GAME_NAME, bet, payout });
      } else {
        const newLossStreak = lossStreak + 1;
        setLossStreak(newLossStreak);
        setCurrentStreak(0);
        recordLossStreak(newLossStreak);
        recordSpin({ game: GAME_NAME, bet, payout: 0 });

        const topSymbols = finalReels.map((reel) => reel[1]);
        if (
          topSymbols[0] === topSymbols[1] &&
          topSymbols[1] !== topSymbols[2]
        ) {
          setResult("SO CLOSE!");
        } else {
          setResult("LOSS");
        }
      }

      if (sessionSpins % 10 === 0 && sessionSpins > 0) {
        setJackpot((prev) => prev + Math.floor(Math.random() * 500) + 100);
      }

      setIsSpinning(false);
    }, 2600);
  };

  useEffect(() => {
    return () => {
      spinIntervals.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  const winRate = spins > 0 ? ((wins / spins) * 100).toFixed(1) : "—";
  const isChaos = upgrades?.["chaos-mode"];
  const isCursed = upgrades?.["cursed-run"];

  if (!hydrated) return null; // avoid SSR mismatch

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute inset-0 ${
            isChaos
              ? "bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.1)_0%,transparent_60%)]"
              : "bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.06)_0%,transparent_60%)]"
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
          {/* Active upgrade badges */}
          {isChaos && (
            <Badge
              variant="outline"
              className="border-red-900 text-red-400 font-mono text-xs animate-pulse"
            >
              CHAOS: ON
            </Badge>
          )}
          {isCursed && (
            <Badge
              variant="outline"
              className="border-red-900 text-red-400 font-mono text-xs"
            >
              CURSED
            </Badge>
          )}
          {upgrades?.["near-miss"] && (
            <Badge
              variant="outline"
              className="border-green-900 text-green-400 font-mono text-xs"
            >
              NEAR-MISS ↓
            </Badge>
          )}
          {upgrades?.["odds-reveal"] && (
            <Badge
              variant="outline"
              className="border-blue-900 text-blue-400 font-mono text-xs"
            >
              ODDS: VISIBLE
            </Badge>
          )}

          <Dialog>
            <DialogTrigger>
              <IconInfoCircle size={18} />
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">
                  HOW IT'S RIGGED
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Explanation of the rigged slot mechanics
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="text-xs opacity-40 mb-2">THE MECHANICS</div>
                  <div className="space-y-2 leading-relaxed">
                    <p>
                      Three reels spin and stop at different times. Match 3
                      symbols on the middle pay line to win.
                    </p>
                    <p className="opacity-60">Sounds fair. It's not.</p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-xs opacity-40 mb-2">THE RIG</div>
                  <div className="space-y-2 leading-relaxed">
                    <p>
                      • Base win rate:{" "}
                      <span className="text-green-400">15%</span>
                    </p>
                    <p>
                      • Every spin reduces your odds by{" "}
                      <span className="text-red-400">0.5%</span>
                    </p>
                    <p>
                      • After 20 spins:{" "}
                      <span className="text-red-400">5% win rate</span>
                    </p>
                    <p>
                      • Near-misses appear{" "}
                      <span className="text-yellow-400">30% of the time</span>{" "}
                      to keep you playing
                    </p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-xs opacity-40 mb-2">THE JACKPOT LIE</div>
                  <div className="space-y-2 leading-relaxed">
                    <p>The jackpot grows every 10 spins.</p>
                    <p className="opacity-60">
                      Your odds shrink faster than it grows.
                    </p>
                    <p className="text-red-400">
                      It literally moves away from you.
                    </p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-xs opacity-40 mb-2">
                    PAYOUTS (BET × MULTIPLIER ÷ 10)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>🍒🍒🍒 → 50</div>
                    <div>🔔🔔🔔 → 75</div>
                    <div>💎💎💎 → 100</div>
                    <div>🃏🃏🃏 → 150</div>
                    <div>⭐⭐⭐ → 200</div>
                    <div>💰💰💰 → 300</div>
                    <div>7️⃣7️⃣7️⃣ → 500</div>
                    <div className="text-yellow-400">🎰🎰🎰 → 1000</div>
                  </div>
                </div>
                <div className="border-t border-border pt-4 text-center opacity-40 text-xs">
                  You should stop now.
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Badge
            variant="outline"
            className="border-purple-900 text-purple-400 font-mono text-xs"
          >
            DANGER: HIGH
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">{balance} CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 py-8">
        <div className="text-center space-y-2">
          <h1
            className={`text-5xl font-black tracking-tighter ${isChaos ? "text-red-400" : ""}`}
          >
            {isChaos ? "CHAOS SLOT" : "RIGGED SLOT"}
          </h1>
          <p className="font-mono text-xs opacity-40 tracking-widest">
            {isCursed
              ? "YOU ACTIVATED A CURSED RUN"
              : "THE JACKPOT MOVES AWAY FROM YOU"}
          </p>
          {upgrades?.["odds-reveal"] && oddsInfo && (
            <p className="font-mono text-xs text-blue-400 tracking-widest">
              {oddsInfo}
            </p>
          )}
        </div>

        <div className="w-full max-w-sm border border-border">
          <div className="border-b border-border p-4 flex items-center justify-between">
            <div className="text-xs font-mono opacity-40">JACKPOT</div>
            <div
              className={`font-black text-2xl tabular-nums ${isChaos ? "text-red-400" : "text-yellow-400"}`}
            >
              {jackpot.toLocaleString()}
            </div>
            <div className="text-xs font-mono opacity-40">CRAPS</div>
          </div>

          <div className="p-6">
            <div className="flex gap-3 justify-center mb-6 relative">
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

              {reels.map((reel, ri) => (
                <div
                  key={ri}
                  className="flex flex-col items-center border border-border overflow-hidden w-24 relative"
                >
                  {reel.map((sym, si) => (
                    <div
                      key={`${ri}-${si}`}
                      className={`w-full h-20 flex items-center justify-center text-3xl border-b border-border last:border-0 ${
                        si === 1 ? "bg-muted/30 z-10" : "opacity-40"
                      }`}
                    >
                      {sym}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 justify-center mb-6">
              <div className="h-px flex-1 bg-red-600/50" />
              <div className="text-xs font-mono text-red-400 opacity-60">
                PAY LINE
              </div>
              <div className="h-px flex-1 bg-red-600/50" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center border border-border">
                <div className="text-xs font-mono opacity-40 px-3 border-r border-border py-2">
                  BET
                </div>
                <button
                  onClick={() => setBet(Math.max(1, bet - 5))}
                  className="px-3 py-2 font-mono hover:opacity-100 opacity-50 border-r border-border"
                >
                  −
                </button>
                <div className="flex-1 text-center font-black text-xl py-2 tabular-nums">
                  {bet}
                </div>
                <button
                  onClick={() => setBet(Math.min(balance, bet + 5))}
                  className="px-3 py-2 font-mono hover:opacity-100 opacity-50 border-l border-border"
                >
                  +
                </button>
                <div className="text-xs font-mono opacity-40 px-3 border-l border-border py-2">
                  CRAPS
                </div>
              </div>
              <Button
                onClick={handleSpin}
                disabled={balance < bet || isSpinning || !hydrated}
                className={`w-full font-black tracking-widest text-lg py-6 disabled:opacity-30 ${
                  isChaos ? "bg-red-600 hover:bg-red-700" : ""
                }`}
              >
                {isSpinning ? "SPINNING..." : "SPIN"}
              </Button>
            </div>

            {result && (
              <div
                className={`text-center font-mono text-sm font-black mt-4 ${
                  result.includes("WIN")
                    ? "text-green-400"
                    : result.includes("CLOSE")
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {result}
              </div>
            )}
          </div>

          <div className="border-t border-border grid grid-cols-3 divide-x divide-border">
            {[
              { label: "SPINS", value: spins },
              { label: "WIN RATE", value: `${winRate}%` },
              { label: "STREAK", value: currentStreak },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 text-center">
                <div className="text-xs font-mono opacity-30">{label}</div>
                <div className="font-black tabular-nums">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs font-mono opacity-20 text-center">
          Odds worsen the longer you stay.
        </p>

        {sessionSpins > 20 && (
          <p
            key={sessionSpins}
            className="text-xs font-mono opacity-40 text-red-400 text-center animate-pulse"
          >
            Win rate declining: −{Math.min(sessionSpins * 0.5, 10).toFixed(1)}%
          </p>
        )}

        {balance === 0 && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="border border-purple-900 bg-background p-10 max-w-md text-center space-y-6">
              <div className="text-4xl font-black text-purple-400">
                YOU ARE BROKE.
              </div>
              <div className="font-mono text-sm opacity-60">
                THE SLOTS DRAINED YOU.
              </div>
              <div className="font-mono text-xs opacity-40">
                Final win rate: {winRate}%
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setBalanceState(100);
                    setSpins(0);
                    setWins(0);
                    setSessionSpins(0);
                    setLossStreak(0);
                    setCurrentStreak(0);
                    setResult(null);
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
