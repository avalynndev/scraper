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
import { IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";
import {
  loadState,
  saveState,
  recordBroke,
  recordLossStreak,
  recordSpin,
  type OwnedUpgrades,
} from "@/lib/gameStore";

const GAME_NAME = "DEALER IS A LIAR";
const CHAT_KEY = "dealer_chat_v1";
const SESSION_KEY = "dealer_session_v1";

type PickSide = "TRUST" | "LIE";
type CoinSide = "HEADS" | "TAILS";

interface DealerMessage {
  text: string;
  detail: string;
  time: string;
  source: "gemini" | "fallback";
}

export default function DealerPage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<OwnedUpgrades | null>(null);
  const [bet, setBet] = useState(25);
  const [round, setRound] = useState(1);
  const [wins, setWins] = useState(0);
  const [plays, setPlays] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [honestyChance, setHonestyChance] = useState(0.5);
  const [prediction, setPrediction] = useState<CoinSide>("HEADS");
  const [lastOutcome, setLastOutcome] = useState<CoinSide | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [messages, setMessages] = useState<DealerMessage[]>([]);
  const [narrationSource, setNarrationSource] = useState<"gemini" | "fallback">(
    "fallback",
  );

  const calcHonestyChance = useMemo(
    () => (currentRound: number) => {
      let base = 0.52;
      if (upgrades?.["house-anger"]) base += 0.05;
      if (upgrades?.["cursed-run"]) base -= 0.08;
      if (upgrades?.["house-provoke"]) base -= 0.04;
      if (upgrades?.["chaos-mode"]) {
        base += Math.random() * 0.28 - 0.14;
      }
      base -= Math.min(currentRound * 0.004, 0.08);
      return Math.min(0.82, Math.max(0.2, base));
    },
    [upgrades],
  );

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);

    try {
      const savedMessages = localStorage.getItem(CHAT_KEY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages) as DealerMessage[]);
      }
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as {
          round: number;
          wins: number;
          plays: number;
          lossStreak: number;
        };
        setRound(parsed.round ?? 1);
        setWins(parsed.wins ?? 0);
        setPlays(parsed.plays ?? 0);
        setLossStreak(parsed.lossStreak ?? 0);
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
    if (!hydrated) return;
    if (balance <= 0) return;
    setBet((current) => Math.max(1, Math.min(balance, current)));
  }, [balance, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(0, 6)));
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ round, wins, plays, lossStreak }),
    );
  }, [round, wins, plays, lossStreak, hydrated]);

  useEffect(() => {
    if (!hydrated || !upgrades) return;
    setHonestyChance(calcHonestyChance(round));
  }, [hydrated, upgrades, round, calcHonestyChance]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshDealerMessage(round, lossStreak);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshDealerMessage(
    targetRound: number,
    targetStreak: number,
  ) {
    try {
      const response = await fetch("/api/game-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "dealer",
          round: targetRound,
          balance,
          streak: targetStreak,
        }),
      });

      if (!response.ok) throw new Error("narration failed");
      const data = (await response.json()) as {
        source: "gemini" | "fallback";
        primaryText: string;
        secondaryText: string;
        suggestedHonesty?: number;
      };

      const nextMessage: DealerMessage = {
        text: data.primaryText,
        detail: data.secondaryText,
        time: "just now",
        source: data.source,
      };

      setNarrationSource(data.source);
      setMessages((prev) => [nextMessage, ...prev].slice(0, 6));
      if (
        typeof data.suggestedHonesty === "number" &&
        upgrades?.["dealer-meter"]
      ) {
        setHonestyChance(
          Math.max(0.2, Math.min(0.82, data.suggestedHonesty / 100)),
        );
      }
    } catch {
      setNarrationSource("fallback");
      const fallbackMessage: DealerMessage = {
        text: "No signal from the booth. The dealer still has an opinion.",
        detail: "Backup script loaded. Trust carefully.",
        time: "just now",
        source: "fallback",
      };
      setMessages((prev) => [fallbackMessage, ...prev].slice(0, 6));
    }
  }

  function settleRound(choice: PickSide) {
    if (!hydrated || isResolving || balance < bet) return;
    const nextPrediction: CoinSide = Math.random() < 0.5 ? "HEADS" : "TAILS";
    const outcome: CoinSide = Math.random() < 0.5 ? "HEADS" : "TAILS";
    const dealerToldTruth = nextPrediction === outcome;
    const playerWon =
      (choice === "TRUST" && dealerToldTruth) ||
      (choice === "LIE" && !dealerToldTruth);

    setIsResolving(true);
    setPrediction(nextPrediction);
    setLastOutcome(null);
    setLastResult(null);
    setBalance((b) => b - bet);

    setTimeout(() => {
      setLastOutcome(outcome);
      setPlays((p) => p + 1);
      const nextRound = round + 1;
      setRound(nextRound);

      if (playerWon) {
        const payout = bet * 2;
        setBalance((b) => b + payout);
        setWins((w) => w + 1);
        setLossStreak(0);
        setLastResult(`WIN! +${payout} CRAPS`);
        recordSpin({ game: GAME_NAME, bet, payout });
      } else {
        const nextLossStreak = lossStreak + 1;
        setLossStreak(nextLossStreak);
        recordLossStreak(nextLossStreak);
        setLastResult("LOSS");
        recordSpin({ game: GAME_NAME, bet, payout: 0 });
      }

      setHonestyChance(calcHonestyChance(nextRound));
      setIsResolving(false);
      void refreshDealerMessage(nextRound, playerWon ? 0 : lossStreak + 1);
    }, 900);
  }

  const winRate = plays > 0 ? ((wins / plays) * 100).toFixed(1) : "—";
  const trustWinChance = (honestyChance * 100).toFixed(1);
  const lieWinChance = ((1 - honestyChance) * 100).toFixed(1);

  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(6,182,212,0.05)_0%,transparent_60%)]" />
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
          <Dialog>
            <DialogTrigger>
              <IconInfoCircle size={18} />
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">
                  HOW DEALER WORKS
                </DialogTitle>
                <DialogDescription className="sr-only">
                  How Dealer is a Liar calculates outcomes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="text-xs opacity-40 mb-2">THE LOOP</div>
                  <p>
                    Dealer predicts HEADS or TAILS. You either trust or call
                    lie.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">PAYOUT</div>
                  <p>Win returns 2× your bet. Lose burns the full stake.</p>
                  <p className="opacity-60">
                    Trust wins if dealer is truthful. Lie wins if dealer bluffs.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">AI NARRATION</div>
                  <p>Dealer chatter is fetched from Gemini when available.</p>
                  <p className="opacity-60">
                    If Gemini fails, backup scripts take over automatically.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge
            variant="outline"
            className="border-cyan-900 text-cyan-400 font-mono text-xs"
          >
            DANGER: VARIABLE
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">{balance} CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row gap-0 max-w-5xl mx-auto w-full">
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="p-6 border-b border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-600/40 flex items-center justify-center text-2xl bg-cyan-950/20">
              🎩
            </div>
            <div>
              <div className="font-black text-lg">DEALER</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono opacity-40">online</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="ml-auto border-yellow-900/50 text-yellow-400 font-mono text-xs"
            >
              SOURCE: {narrationSource.toUpperCase()}
            </Badge>
          </div>

          <div className="flex-1 p-6 space-y-4 min-h-64">
            {messages.length === 0 && (
              <div className="text-xs font-mono opacity-30">
                Loading dealer line…
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={`${msg.text}-${i}`} className="flex gap-3">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm shrink-0 mt-1">
                  🎩
                </div>
                <div className="flex-1">
                  <div className="border border-border p-3 font-mono text-sm leading-relaxed">
                    "{msg.text}"
                    <div className="opacity-50 text-xs mt-2">{msg.detail}</div>
                  </div>
                  <div className="text-xs font-mono opacity-20 mt-1">
                    {msg.time} • {msg.source}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono opacity-40">HONESTY METER</div>
              <div className="text-xs font-mono opacity-40">
                {upgrades?.["dealer-meter"]
                  ? `${Math.round(honestyChance * 100)}%`
                  : "LOCKED"}
              </div>
            </div>
            <div className="h-2 border border-border bg-muted">
              <div
                className="h-full bg-cyan-500 transition-all"
                style={{
                  width: upgrades?.["dealer-meter"]
                    ? `${Math.round(honestyChance * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <div className="text-xs font-mono opacity-20 mt-2">
              {upgrades?.["dealer-meter"]
                ? "Higher means dealer tends to tell the truth."
                : "Unlock in Upgrades shop"}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-3xl font-black tracking-tight">
              DEALER IS A LIAR
            </h1>
            <p className="font-mono text-xs opacity-40 mt-1">
              TRUST NOBODY. ESPECIALLY THE DEALER.
            </p>
          </div>

          <div className="p-6 border-b border-border space-y-3">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              CURRENT ROUND
            </div>
            <div className="border border-border p-4 text-center space-y-2">
              <div className="text-xs font-mono opacity-30">DEALER SAYS</div>
              <div className="font-black text-3xl">{prediction}</div>
              <div className="text-xs font-mono opacity-40">
                Last outcome: {lastOutcome ?? "?"}
              </div>
              {lastResult && (
                <div
                  className={`font-mono text-xs font-black ${
                    lastResult.includes("WIN")
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {lastResult}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-b border-border space-y-3">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              YOUR BET
            </div>
            <div className="flex items-center border border-border">
              <button
                onClick={() => setBet((v) => Math.max(1, v - 5))}
                className="px-4 py-3 font-mono opacity-50 hover:opacity-100 transition-opacity border-r border-border"
              >
                −
              </button>
              <div className="flex-1 text-center font-black text-2xl py-3 tabular-nums">
                {bet}
              </div>
              <button
                onClick={() => setBet((v) => Math.min(balance, v + 5))}
                className="px-4 py-3 font-mono opacity-50 hover:opacity-100 transition-opacity border-l border-border"
              >
                +
              </button>
            </div>
          </div>

          <div className="p-6 space-y-3 flex-1">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              BET ON
            </div>
            <Button
              className="w-full py-5 font-bold tracking-wide"
              disabled={balance < bet || isResolving}
              onClick={() => settleRound("TRUST")}
            >
              DEALER TELLS TRUTH
            </Button>
            <Button
              variant="outline"
              className="w-full py-5 font-bold tracking-wide border-cyan-900 text-cyan-400 hover:bg-cyan-950"
              disabled={balance < bet || isResolving}
              onClick={() => settleRound("LIE")}
            >
              DEALER IS LYING
            </Button>
            <div className="text-xs font-mono opacity-30 pt-2 space-y-1">
              <p>
                Round {round} • Win rate {winRate}% • Loss streak {lossStreak}
              </p>
              {upgrades?.["odds-reveal"] && (
                <p className="text-blue-400">
                  Trust: {trustWinChance}% • Lie: {lieWinChance}%
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>

      {balance <= 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="border border-cyan-900 bg-background p-10 max-w-md text-center space-y-6">
            <div className="text-4xl font-black text-cyan-400">BROKE.</div>
            <div className="font-mono text-sm opacity-60">
              THE DEALER TOOK EVERYTHING.
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
                  setBet(25);
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
