"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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

type CoinSide = "HEADS" | "TAILS";
type PickSide = "TRUST" | "LIE";

interface DealerMessage {
  text: string;
  detail: string;
  time: string;
  source: "gemini" | "fallback";
}

interface NarrationData {
  source: "gemini" | "fallback";
  primaryText: string;
  secondaryText: string;
  suggestedHonesty?: number;
}

export default function DealerPage() {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(100);
  const [upgrades, setUpgrades] = useState<OwnedUpgrades | null>(null);

  const [bet, setBet] = useState(25);
  const [round, setRound] = useState(1);
  const [plays, setPlays] = useState(0);
  const [wins, setWins] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);

  const [isResolving, setIsResolving] = useState(false);
  const [prediction, setPrediction] = useState<CoinSide>("HEADS");
  const [lastOutcome, setLastOutcome] = useState<CoinSide | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [messages, setMessages] = useState<DealerMessage[]>([]);
  const [honestyChance, setHonestyChance] = useState(0.5);
  const [narrationSource, setNarrationSource] = useState<"gemini" | "fallback">(
    "fallback",
  );
  const [loadingNarration, setLoadingNarration] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const calcHonestyChance = useMemo(
    () => (currentRound: number, currentUpgrades: OwnedUpgrades) => {
      let base = 0.52;
      if (currentUpgrades["house-anger"]) base += 0.05;
      if (currentUpgrades["cursed-run"]) base -= 0.08;
      if (currentUpgrades["house-provoke"]) base -= 0.04;
      if (currentUpgrades["chaos-mode"]) base += Math.random() * 0.28 - 0.14;
      base -= Math.min(currentRound * 0.004, 0.08);
      return Math.min(0.82, Math.max(0.2, base));
    },
    [],
  );

  useEffect(() => {
    const state = loadState();
    setBalance(state.balance);
    setUpgrades(state.upgrades);

    try {
      const savedMessages = localStorage.getItem(CHAT_KEY);
      if (savedMessages)
        setMessages(JSON.parse(savedMessages) as DealerMessage[]);

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
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(0, 6)));
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ round, plays, wins, lossStreak }),
    );
  }, [round, plays, wins, lossStreak, hydrated]);

  useEffect(() => {
    if (!hydrated || !upgrades) return;
    setHonestyChance(calcHonestyChance(round, upgrades));
    void fetchNarration(round, lossStreak);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingNarration]);

  async function fetchNarration(targetRound: number, targetStreak: number) {
    setLoadingNarration(true);
    try {
      const res = await fetch("/api/game-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "dealer",
          round: targetRound,
          balance,
          streak: targetStreak,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as NarrationData;

      setNarrationSource(data.source);

      if (
        typeof data.suggestedHonesty === "number" &&
        upgrades?.["dealer-meter"]
      ) {
        setHonestyChance(
          Math.max(0.2, Math.min(0.82, data.suggestedHonesty / 100)),
        );
      }

      const msg: DealerMessage = {
        text: data.primaryText,
        detail: data.secondaryText,
        time: "just now",
        source: data.source,
      };
      setMessages((prev) => [msg, ...prev].slice(0, 6));
    } catch {
      setNarrationSource("fallback");
      setMessages((prev) =>
        [
          {
            text: "No signal from the booth. The dealer still has a read.",
            detail: "Backup script loaded. Trust carefully.",
            time: "just now",
            source: "fallback" as const,
          },
          ...prev,
        ].slice(0, 6),
      );
    } finally {
      setLoadingNarration(false);
    }
  }

  function settleRound(choice: PickSide) {
    if (!hydrated || isResolving || balance < bet) return;

    const dealerPrediction: CoinSide = Math.random() < 0.5 ? "HEADS" : "TAILS";
    const actualOutcome: CoinSide = Math.random() < 0.5 ? "HEADS" : "TAILS";
    const dealerWasTruthful = dealerPrediction === actualOutcome;

    const honesty = upgrades ? calcHonestyChance(round, upgrades) : 0.5;
    const dealerActuallyTold =
      Math.random() < honesty ? dealerWasTruthful : !dealerWasTruthful;

    const playerWon =
      (choice === "TRUST" && dealerActuallyTold) ||
      (choice === "LIE" && !dealerActuallyTold);

    setIsResolving(true);
    setPrediction(dealerPrediction);
    setLastOutcome(null);
    setLastResult(null);
    setBalance((b) => b - bet);

    setTimeout(() => {
      setLastOutcome(actualOutcome);
      setPlays((p) => p + 1);
      const nextRound = round + 1;
      setRound(nextRound);

      if (playerWon) {
        const payout = upgrades?.["chaos-mode"]
          ? bet * 3
          : upgrades?.["volatility"]
            ? Math.ceil(bet * 1.6)
            : bet * 2;
        setBalance((b) => b + payout);
        setWins((w) => w + 1);
        setLossStreak(0);
        setLastResult(`WIN! +${payout} CRAPS`);
        recordSpin({ game: GAME_NAME, bet, payout });
      } else {
        const nextStreak = lossStreak + 1;
        setLossStreak(nextStreak);
        recordLossStreak(nextStreak);
        setLastResult("LOSS");
        recordSpin({ game: GAME_NAME, bet, payout: 0 });
      }

      if (upgrades) setHonestyChance(calcHonestyChance(nextRound, upgrades));
      setIsResolving(false);
      void fetchNarration(nextRound, playerWon ? 0 : lossStreak + 1);
    }, 900);
  }

  const winRate = plays > 0 ? ((wins / plays) * 100).toFixed(1) : "—";
  const honestyPct = Math.round(honestyChance * 100);
  const meterUnlocked = upgrades?.["dealer-meter"] ?? false;
  const trustWinChance = (honestyChance * 100).toFixed(1);
  const lieWinChance = ((1 - honestyChance) * 100).toFixed(1);
  const honestyColor =
    honestyPct >= 60
      ? "bg-green-500"
      : honestyPct >= 40
        ? "bg-yellow-500"
        : "bg-red-500";
  const honestyLabel =
    honestyPct >= 65
      ? "PROBABLY HONEST"
      : honestyPct >= 45
        ? "UNCERTAIN"
        : "PROBABLY LYING";

  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute inset-0 ${upgrades?.["chaos-mode"] ? "bg-[radial-gradient(ellipse_at_left,rgba(239,68,68,0.07)_0%,transparent_60%)]" : "bg-[radial-gradient(ellipse_at_left,rgba(6,182,212,0.05)_0%,transparent_60%)]"}`}
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
                    Dealer predicts HEADS or TAILS. You trust the prediction or
                    call it a lie.
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
                  <div className="text-xs opacity-40 mb-2">HONESTY METER</div>
                  <p>
                    Buy "Dealer Honesty Meter" in Upgrades to see the signal.
                  </p>
                  <p className="opacity-60">
                    Higher means dealer trends toward truth this round.
                  </p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs opacity-40 mb-2">AI NARRATION</div>
                  <p>Dealer chatter is generated by Gemini each round.</p>
                  <p className="opacity-60">
                    Falls back to built-in scripts if the API is unavailable.
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
              className="ml-auto font-mono text-xs border-yellow-900/50 text-yellow-400"
            >
              SOURCE: {narrationSource.toUpperCase()}
            </Badge>
          </div>

          <div className="flex-1 p-6 space-y-4 min-h-64 overflow-y-auto max-h-[420px]">
            {messages.length === 0 && !loadingNarration && (
              <div className="text-xs font-mono opacity-30">
                Loading dealer line…
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm shrink-0 mt-1">
                  🎩
                </div>
                <div className="flex-1">
                  <div className="border border-border p-3 font-mono text-sm leading-relaxed">
                    "{msg.text}"
                    <div className="opacity-50 text-xs mt-2">{msg.detail}</div>
                  </div>
                  <div className="text-xs font-mono opacity-20 mt-1">
                    {msg.time} · {msg.source}
                  </div>
                </div>
              </div>
            ))}

            {loadingNarration && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm shrink-0">
                  🎩
                </div>
                <div className="border border-border px-4 py-3 flex gap-1 items-center">
                  {[0, 150, 300].map((d) => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          <div className="p-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono opacity-40">HONESTY METER</div>
              <div className="text-xs font-mono opacity-40">
                {meterUnlocked ? `${honestyPct}%` : "LOCKED"}
              </div>
            </div>
            <div className="h-2 border border-border bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${meterUnlocked ? honestyColor : ""}`}
                style={{ width: meterUnlocked ? `${honestyPct}%` : "0%" }}
              />
            </div>
            {meterUnlocked ? (
              <div
                className={`text-xs font-mono mt-2 opacity-70 ${honestyPct >= 60 ? "text-green-400" : honestyPct >= 40 ? "text-yellow-400" : "text-red-400"}`}
              >
                Signal suggests: {honestyLabel}
              </div>
            ) : (
              <div className="text-xs font-mono opacity-20 mt-2">
                Unlock "Dealer Honesty Meter" in Upgrades shop
              </div>
            )}
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
              CURRENT ROUND {round}
            </div>
            <div className="border border-border p-4 text-center space-y-2">
              <div className="text-xs font-mono opacity-30">DEALER SAYS</div>
              <div className="font-black text-3xl">{prediction}</div>
              <div className="text-xs font-mono opacity-40">
                Last flip: {lastOutcome ?? "?"}
              </div>
              {lastResult && (
                <div
                  className={`font-mono text-xs font-black ${lastResult.includes("WIN") ? "text-green-400" : "text-red-400"}`}
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

          <div className="p-6 space-y-3 flex-1">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              BET ON
            </div>
            <Button
              className="w-full py-5 font-bold tracking-wide disabled:opacity-30"
              disabled={balance < bet || isResolving}
              onClick={() => settleRound("TRUST")}
            >
              DEALER TELLS TRUTH
            </Button>
            <Button
              variant="outline"
              className="w-full py-5 font-bold tracking-wide border-cyan-900 text-cyan-400 hover:bg-cyan-950 disabled:opacity-30"
              disabled={balance < bet || isResolving}
              onClick={() => settleRound("LIE")}
            >
              DEALER IS LYING
            </Button>
            <div className="text-xs font-mono opacity-30 pt-2 space-y-1">
              <p>
                Round {round} · Win rate {winRate}% · Streak {lossStreak}
              </p>
              {upgrades?.["odds-reveal"] && (
                <p className="text-blue-400">
                  Trust: {trustWinChance}% · Lie: {lieWinChance}%
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border grid grid-cols-3 divide-x divide-border">
            {[
              { label: "ROUNDS", value: plays },
              { label: "WIN RATE", value: `${winRate}%` },
              { label: "STREAK", value: lossStreak },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 text-center">
                <div className="text-xs font-mono opacity-30">{label}</div>
                <div className="font-black tabular-nums">{value}</div>
              </div>
            ))}
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
