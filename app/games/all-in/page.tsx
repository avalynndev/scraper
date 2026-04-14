"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";

const GAME_NAME = "ALL-IN BUTTON";

export default function AllInPage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<OwnedUpgrades | null>(null);

  const [bet, setBet] = useState(100);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [resultAmount, setResultAmount] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [totalPlays, setTotalPlays] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const lastClickTime = useRef(Date.now());

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);

    const g = state.stats.winRates[GAME_NAME];
    if (g) {
      setTotalPlays(g.plays);
      setTotalWins(g.wins);
    }
    setLossStreak(0);
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
    if (bet > balance && balance > 0) setBet(balance);
  }, [balance]);


  const handleBetChange = (amount: number) => {
    setBet((b) => Math.max(1, Math.min(balance, b + amount)));
  };

  const handlePercentage = (percent: number) => {
    setBet(Math.max(1, Math.floor(balance * percent)));
  };

  const handleAllIn = () => {
    if (bet > balance || bet <= 0 || isAnimating || !hydrated) return;

    setIsAnimating(true);
    setResult(null);

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;
    lastClickTime.current = now;

    let baseOdds = 0.5;

    if (upgrades?.["house-anger"]) baseOdds += 0.05;

    if (upgrades?.["cursed-run"]) baseOdds -= 0.08;

    if (upgrades?.["chaos-mode"]) baseOdds = 0.2 + Math.random() * 0.65;

    if (timeSinceLastClick < 500) baseOdds -= 0.05;

    if (lossStreak > 0) baseOdds -= lossStreak * 0.02;

    if (upgrades?.["house-provoke"]) baseOdds -= 0.03;

    const finalOdds = Math.max(0.25, Math.min(0.75, baseOdds));

    const showOdds = upgrades?.["odds-reveal"] ?? false;

    const won = Math.random() < finalOdds;

    setTimeout(() => {
      if (won) {
        let payout = bet;
        if (upgrades?.["chaos-mode"])
          payout = bet * (Math.random() < 0.4 ? 3 : 2);
        if (upgrades?.["volatility"]) payout = Math.ceil(bet * 0.7);

        setBalance((b) => b + payout);
        setResult("win");
        setResultAmount(payout);
        setTotalWins((w) => w + 1);
        setWinStreak((s) => s + 1);
        setLossStreak(0);
        recordSpin({ game: GAME_NAME, bet, payout });
      } else {
        let loss = bet;
        if (upgrades?.["volatility"]) loss = Math.ceil(bet * 0.7);

        setBalance((b) => Math.max(0, b - loss));
        setResult("lose");
        setResultAmount(loss);
        setWinStreak(0);
        setLossStreak((s) => {
          const next = s + 1;
          recordLossStreak(next);
          return next;
        });
        recordSpin({ game: GAME_NAME, bet, payout: 0 });
      }

      setTotalPlays((p) => p + 1);
      setIsAnimating(false);
    }, 800);
  };

  const winRate =
    totalPlays > 0 ? ((totalWins / totalPlays) * 100).toFixed(1) : "—";
  const isChaos = upgrades?.["chaos-mode"];
  const isCursed = upgrades?.["cursed-run"];

  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute inset-0 animate-pulse ${
            isChaos
              ? "bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.18)_0%,transparent_70%)]"
              : "bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)]"
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
              className="border-purple-900 text-purple-400 font-mono text-xs"
            >
              CURSED
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
          <Badge
            variant="outline"
            className="border-red-900 text-red-400 font-mono text-xs"
          >
            DANGER: EXTREME
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">{balance} CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center gap-12 px-4 py-8">
        <div className="text-center space-y-3">
          <h1
            className={`text-6xl font-black tracking-tighter ${isChaos ? "text-red-400" : ""}`}
          >
            ALL-IN BUTTON
          </h1>
          <p className="font-mono text-sm opacity-40 tracking-widest">
            {isChaos
              ? "CHAOS: ODDS ARE UNKNOWABLE"
              : "50% DOUBLE. 50% NOTHING."}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
          <div className="w-full">
            <div className="text-xs font-mono opacity-40 mb-2 tracking-wider">
              YOUR BET
            </div>
            <div className="flex items-center border border-border">
              <button
                onClick={() => handleBetChange(-10)}
                disabled={isAnimating}
                className="px-4 py-3 font-mono text-lg opacity-50 hover:opacity-100 transition-opacity border-r border-border disabled:opacity-20"
              >
                −
              </button>

              <div className="flex-1">
                <Input
                  type="number"
                  value={bet}
                  min={1}
                  max={balance}
                  onChange={(e) => {
                    let value = Number(e.target.value);

                    if (value < 1) value = 1;
                    if (value > balance) value = balance;

                    setBet(value);
                  }}
                  className="w-full h-full text-center border-0 rounded-none py-[1.08rem] shadow-none focus-visible:ring-0 font-black text-3xl tabular-nums"
                />
              </div>

              <button
                onClick={() => handleBetChange(10)}
                disabled={isAnimating}
                className="px-4 py-3 font-mono text-lg opacity-50 hover:opacity-100 transition-opacity border-l border-border disabled:opacity-20"
              >
                +
              </button>
            </div>
            <div className="flex justify-between mt-2">
              {[
                { label: "25%", value: 0.25 },
                { label: "50%", value: 0.5 },
                { label: "75%", value: 0.75 },
                { label: "MAX", value: 1 },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => handlePercentage(value)}
                  disabled={isAnimating}
                  className="text-xs font-mono opacity-30 hover:opacity-100 transition-opacity disabled:opacity-10"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAllIn}
            disabled={balance <= 0 || bet > balance || isAnimating}
            className={`w-64 h-64 mt-8 rounded-full border-4 relative group cursor-pointer transition-all duration-200 hover:scale-95 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
              isAnimating ? "animate-spin" : ""
            } ${isChaos ? "border-red-500" : "border-red-600"}`}
          >
            <div className="absolute inset-0 rounded-full border border-red-600/30 scale-110 group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute inset-0 rounded-full border border-red-600/15 scale-125 group-hover:scale-150 transition-transform duration-700" />
            <div
              className={`absolute inset-2 rounded-full transition-colors ${
                isChaos
                  ? "bg-red-600/25 group-hover:bg-red-600/40"
                  : "bg-red-600/10 group-hover:bg-red-600/20"
              }`}
            />
            <span
              className={`relative font-black text-2xl tracking-widest ${isChaos ? "text-red-300" : "text-red-400"}`}
            >
              {isAnimating ? "..." : "ALL IN"}
            </span>
          </button>

          <p className="text-xs font-mono opacity-25 text-center max-w-48 leading-relaxed">
            Odds shift based on how fast you click and how many times you've
            already lost.
          </p>
        </div>

        <div className="text-center font-mono text-xs tracking-widest space-y-2">
          {result === null && <span className="opacity-20">NO RESULT YET</span>}
          {result === "win" && (
            <div className="text-green-400 font-black text-lg">
              YOU WON +{resultAmount} CRAPS
            </div>
          )}
          {result === "lose" && (
            <div className="text-red-400 font-black text-lg">
              YOU LOST −{resultAmount} CRAPS
            </div>
          )}
          {lossStreak > 2 && (
            <div className="text-red-400/50 text-xs">
              LOSS STREAK: {lossStreak}
            </div>
          )}
          {winStreak > 2 && (
            <div className="text-green-400/50 text-xs">
              WIN STREAK: {winStreak}
            </div>
          )}
        </div>

        <div className="w-full max-w-xs border border-border grid grid-cols-3 divide-x divide-border">
          {[
            { label: "PLAYS", value: totalPlays },
            { label: "WIN RATE", value: `${winRate}%` },
            { label: "BALANCE", value: balance },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 text-center">
              <div className="text-xs font-mono opacity-30">{label}</div>
              <div className="font-black tabular-nums text-sm">{value}</div>
            </div>
          ))}
        </div>

        {balance <= 0 && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="border border-red-900 bg-background p-10 max-w-md text-center space-y-6">
              <div className="text-4xl font-black text-red-400">
                YOU ARE BROKE.
              </div>
              <div className="font-mono text-sm opacity-60">
                THE HOUSE NOTICED.
              </div>
              <div className="font-mono text-xs opacity-40">
                Win rate: {winRate}% across {totalPlays} plays
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    const state = loadState();
                    state.balance = 100;
                    saveState(state);
                    setBalance(100);
                    setBet(100);
                    setResult(null);
                    setLossStreak(0);
                    setWinStreak(0);
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
