"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  IconArrowLeft,
  IconInfoCircle,
  IconTriangleInvertedFilled,
} from "@tabler/icons-react";
import {
  loadState,
  saveState,
  recordBroke,
  recordLossStreak,
  recordSpin,
  type OwnedUpgrades,
} from "@/lib/gameStore";

const GAME_NAME = "ORACLE OF RUIN";
const HISTORY_KEY = "oracle_history_v1";
const SESSION_KEY = "oracle_session_v1";

type Choice = "SAFE" | "RISK";

interface Omen {
  source: "gemini" | "fallback";
  primaryText: string;
  secondaryText: string;
  favoredChoice: Choice;
}

interface RoundEntry {
  round: number;
  choice: Choice;
  won: boolean;
  amount: number;
}

export default function OraclePage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<OwnedUpgrades | null>(null);

  const [bet, setBet] = useState(20);
  const [round, setRound] = useState(1);
  const [plays, setPlays] = useState(0);
  const [wins, setWins] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);

  const [isResolving, setIsResolving] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [omen, setOmen] = useState<Omen | null>(null);
  const [loadingOmen, setLoadingOmen] = useState(false);
  const [history, setHistory] = useState<RoundEntry[]>([]);

  const calcChance = useMemo(
    () =>
      (
        choice: Choice,
        favoredChoice: Choice,
        currentUpgrades: OwnedUpgrades | null,
      ) => {
        let chance = choice === "SAFE" ? 0.58 : 0.34;
        if (choice === favoredChoice) chance += 0.08;
        if (currentUpgrades?.["house-anger"]) chance += 0.04;
        if (currentUpgrades?.["cursed-run"]) chance -= 0.06;
        if (currentUpgrades?.["house-provoke"]) chance -= 0.04;
        if (currentUpgrades?.["chaos-mode"])
          chance += Math.random() * 0.3 - 0.15;
        return Math.max(0.15, Math.min(0.85, chance));
      },
    [],
  );

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);

    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory) as RoundEntry[]);

      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const s = JSON.parse(savedSession) as {
          round: number;
          plays: number;
          wins: number;
          lossStreak: number;
        };
        setRound(s.round ?? 1);
        setPlays(s.plays ?? 0);
        setWins(s.wins ?? 0);
        setLossStreak(s.lossStreak ?? 0);
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
    if (!hydrated || balance <= 0) return;
    setBet((b) => Math.max(1, Math.min(balance, b)));
  }, [balance, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  }, [history, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ round, plays, wins, lossStreak }),
    );
  }, [round, plays, wins, lossStreak, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void fetchOmen(round, lossStreak);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOmen(targetRound: number, targetStreak: number) {
    setLoadingOmen(true);
    try {
      const res = await fetch("/api/game-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "oracle",
          round: targetRound,
          balance,
          streak: targetStreak,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as Omen;
      setOmen({
        source: data.source,
        primaryText: data.primaryText,
        secondaryText: data.secondaryText,
        favoredChoice: data.favoredChoice === "RISK" ? "RISK" : "SAFE",
      });
    } catch {
      setOmen({
        source: "fallback",
        primaryText: "The signal drops. The chamber still hums.",
        secondaryText: "Fallback omen online. Choose with caution.",
        favoredChoice: "SAFE",
      });
    } finally {
      setLoadingOmen(false);
    }
  }

  function play(choice: Choice) {
    if (!hydrated || isResolving || !omen || balance < bet) return;

    setIsResolving(true);
    setLastResult(null);
    setBalance((b) => b - bet);

    const chance = calcChance(choice, omen.favoredChoice, upgrades);
    const won = Math.random() < chance;

    const baseMult = choice === "SAFE" ? 1.8 : 3.4;
    const mult = upgrades?.["chaos-mode"]
      ? choice === "SAFE"
        ? 2.5
        : 5.0
      : upgrades?.["volatility"]
        ? baseMult * 0.75
        : baseMult;
    const payout = Math.floor(bet * mult);

    setTimeout(() => {
      setPlays((p) => p + 1);
      const nextRound = round + 1;
      setRound(nextRound);

      if (won) {
        setBalance((b) => b + payout);
        setWins((w) => w + 1);
        setLossStreak(0);
        setLastResult(`YOU WON +${payout} CRAPS`);
        recordSpin({ game: GAME_NAME, bet, payout });
      } else {
        const nextStreak = lossStreak + 1;
        setLossStreak(nextStreak);
        recordLossStreak(nextStreak);
        setLastResult(`YOU LOST −${bet} CRAPS`);
        recordSpin({ game: GAME_NAME, bet, payout: 0 });
      }

      setHistory((prev) =>
        [{ round, choice, won, amount: won ? payout : bet }, ...prev].slice(
          0,
          10,
        ),
      );
      setIsResolving(false);
      void fetchOmen(nextRound, won ? 0 : lossStreak + 1);
    }, 850);
  }

  const winRate = plays > 0 ? ((wins / plays) * 100).toFixed(1) : "—";
  const safeChance =
    omen && upgrades?.["odds-reveal"]
      ? `${(calcChance("SAFE", omen.favoredChoice, upgrades) * 100).toFixed(1)}%`
      : null;
  const riskChance =
    omen && upgrades?.["odds-reveal"]
      ? `${(calcChance("RISK", omen.favoredChoice, upgrades) * 100).toFixed(1)}%`
      : null;

  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute inset-0 ${upgrades?.["chaos-mode"] ? "bg-[radial-gradient(ellipse_at_bottom,rgba(239,68,68,0.1)_0%,transparent_65%)]" : "bg-[radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.08)_0%,transparent_65%)]"}`}
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
                  HOW ORACLE WORKS
                </DialogTitle>
                <DialogDescription className="sr-only">
                  How Oracle of Ruin works
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="text-xs opacity-40 mb-2">THE CHOICES</div>
                  <p>
                    SAFE: 58% base win chance, 1.8× payout. RISK: 34% base win
                    chance, 3.4× payout.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">THE OMEN</div>
                  <p>
                    Each round the Oracle reveals an omen that favors either
                    SAFE or RISK.
                  </p>
                  <p className="opacity-60">
                    Picking the favored choice adds +8% to your win chance.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">AI NARRATION</div>
                  <p>Omen text is generated by Gemini each round.</p>
                  <p className="opacity-60">
                    Falls back to built-in scripts if the API is unavailable.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">UPGRADES</div>
                  <p>
                    Odds Reveal shows exact win % per choice. Chaos Mode raises
                    payouts but randomises chances.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge
            variant="outline"
            className="border-amber-900 text-amber-400 font-mono text-xs"
          >
            DANGER: OMINOUS
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">{balance} CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full">
        <div className="flex-1 border-r border-border p-6 lg:p-10 space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter">
              ORACLE OF RUIN
            </h1>
            <p className="font-mono text-xs opacity-40 tracking-widest">
              FOLLOW THE OMEN OR IGNORE IT
            </p>
          </div>

          <div className="border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono opacity-30">ROUND {round}</div>
              <Badge
                variant="outline"
                className="border-border font-mono text-[10px] opacity-70"
              >
                SOURCE: {(omen?.source ?? "—").toUpperCase()}
              </Badge>
            </div>

            {loadingOmen ? (
              <div className="flex gap-1 items-center py-2">
                {[0, 150, 300].map((d) => (
                  <div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="font-mono text-sm leading-relaxed">
                  {omen?.primaryText ?? "Loading omen…"}
                </div>
                <div className="text-xs font-mono opacity-40">
                  {omen?.secondaryText ?? "The chamber is warming up."}
                </div>
              </>
            )}

            <div className="flex items-center gap-2 text-xs font-mono opacity-30">
              <IconTriangleInvertedFilled size={12} />
              Favored path is hidden. Read the signal.
            </div>
          </div>

          <div className="border border-border p-5">
            <div className="text-xs font-mono opacity-30 tracking-wider mb-3">
              BET SIZE
            </div>
            <div className="flex items-center border border-border">
              <button
                onClick={() => setBet((v) => Math.max(1, v - 5))}
                disabled={isResolving}
                className="px-4 py-3 font-mono opacity-50 hover:opacity-100 transition-opacity border-r border-border disabled:opacity-20"
              >
                −
              </button>
              <div className="flex-1 text-center font-black text-2xl py-3 tabular-nums">
                {bet}
              </div>
              <button
                onClick={() => setBet((v) => Math.min(balance, v + 5))}
                disabled={isResolving}
                className="px-4 py-3 font-mono opacity-50 hover:opacity-100 transition-opacity border-l border-border disabled:opacity-20"
              >
                +
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => play("SAFE")}
              disabled={isResolving || balance < bet || !omen}
              className="py-6 font-black tracking-wide"
            >
              SAFE
            </Button>
            <Button
              onClick={() => play("RISK")}
              disabled={isResolving || balance < bet || !omen}
              variant="outline"
              className="py-6 font-black tracking-wide border-amber-900 text-amber-400 hover:bg-amber-950 disabled:opacity-30"
            >
              RISK
            </Button>
          </div>

          <div className="text-xs font-mono opacity-30 space-y-1">
            <p>
              SAFE payout:{" "}
              {upgrades?.["chaos-mode"]
                ? "2.5×"
                : upgrades?.["volatility"]
                  ? "1.35×"
                  : "1.8×"}{" "}
              · RISK payout:{" "}
              {upgrades?.["chaos-mode"]
                ? "5.0×"
                : upgrades?.["volatility"]
                  ? "2.55×"
                  : "3.4×"}
            </p>
            {safeChance && riskChance && (
              <p className="text-blue-400">
                SAFE chance: {safeChance} · RISK chance: {riskChance}
              </p>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="text-xs font-mono opacity-30 tracking-widest">
              SESSION
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { label: "PLAYS", value: plays },
                { label: "WIN RATE", value: `${winRate}%` },
                { label: "STREAK", value: lossStreak },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="border border-border p-2 text-center"
                >
                  <div className="text-[10px] font-mono opacity-30">
                    {label}
                  </div>
                  <div className="font-black text-sm tabular-nums">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-b border-border min-h-24">
            <div className="text-xs font-mono opacity-30 tracking-widest mb-2">
              LAST RESULT
            </div>
            {isResolving ? (
              <div className="text-xs font-mono opacity-30 animate-pulse">
                Consulting the oracle…
              </div>
            ) : (
              <div
                className={`font-mono text-sm font-black ${lastResult?.includes("WON") ? "text-green-400" : lastResult ? "text-red-400" : "opacity-20"}`}
              >
                {lastResult ?? "No rounds played."}
              </div>
            )}
          </div>

          <div className="p-6 flex-1">
            <div className="text-xs font-mono opacity-30 tracking-widest mb-3">
              RECENT ROUNDS
            </div>
            <div className="space-y-2">
              {history.length === 0 && (
                <div className="text-xs font-mono opacity-20">
                  History appears after first play.
                </div>
              )}
              {history.slice(0, 8).map((entry, i) => (
                <div
                  key={i}
                  className="border border-border p-2 text-xs font-mono flex items-center justify-between"
                >
                  <span className="opacity-60">
                    R{entry.round} · {entry.choice}
                  </span>
                  <span
                    className={entry.won ? "text-green-400" : "text-red-400"}
                  >
                    {entry.won ? `+${entry.amount}` : `−${entry.amount}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>

      {balance <= 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="border border-amber-900 bg-background p-10 max-w-md text-center space-y-6">
            <div className="text-4xl font-black text-amber-400">BROKE.</div>
            <div className="font-mono text-sm opacity-60">
              THE ORACLE COLLECTED ITS PRICE.
            </div>
            <div className="font-mono text-xs opacity-40">
              Win rate: {winRate}% across {plays} rounds
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
                  setBet(20);
                  setLossStreak(0);
                  setLastResult(null);
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
    </div>
  );
}
