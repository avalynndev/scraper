"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

const DEALER_MESSAGES = [
  { text: "This one's hot. I'd bet big.", time: "just now" },
  { text: "Trust me. I've seen this pattern before.", time: "—" },
];

export default function DealerPage() {
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
          <Badge
            variant="outline"
            className="border-cyan-900 text-cyan-400 font-mono text-xs"
          >
            DANGER: VARIABLE
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">100 CRAPS</span>
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
              HONESTY: UNKNOWN
            </Badge>
          </div>

          <div className="flex-1 p-6 space-y-4 min-h-64">
            {DEALER_MESSAGES.map((msg, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm shrink-0 mt-1">
                  🎩
                </div>
                <div className="flex-1">
                  <div className="border border-border p-3 font-mono text-sm leading-relaxed">
                    "{msg.text}"
                  </div>
                  <div className="text-xs font-mono opacity-20 mt-1">
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm shrink-0">
                🎩
              </div>
              <div className="border border-border px-4 py-3 flex gap-1 items-center">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono opacity-40">HONESTY METER</div>
              <div className="text-xs font-mono opacity-40">LOCKED</div>
            </div>
            <div className="h-2 border border-border bg-muted">
              <div className="h-full w-0 bg-cyan-500 transition-all" />
            </div>
            <div className="text-xs font-mono opacity-20 mt-2">
              Unlock in Upgrades shop
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
            <div className="border border-border p-4 text-center">
              <div className="text-xs font-mono opacity-30 mb-1">OUTCOME</div>
              <div className="font-black text-4xl opacity-20">?</div>
            </div>
          </div>

          <div className="p-6 border-b border-border space-y-3">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              YOUR BET
            </div>
            <div className="flex items-center border border-border">
              <button className="px-4 py-3 font-mono opacity-50 hover:opacity-100 transition-opacity border-r border-border">
                −
              </button>
              <div className="flex-1 text-center font-black text-2xl py-3 tabular-nums">
                25
              </div>
              <button className="px-4 py-3 font-mono opacity-50 hover:opacity-100 transition-opacity border-l border-border">
                +
              </button>
            </div>
          </div>

          <div className="p-6 space-y-3 flex-1">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              BET ON
            </div>
            <Button className="w-full py-5 font-bold tracking-wide">
              THE OUTCOME
            </Button>
            <Button
              variant="outline"
              className="w-full py-5 font-bold tracking-wide border-cyan-900 text-cyan-400 hover:bg-cyan-950"
            >
              THE DEALER IS LYING
            </Button>
            <p className="text-xs font-mono opacity-20 leading-relaxed pt-2">
              Sometimes the dealer tells the truth. Sometimes they don't. You
              can bet on either.
            </p>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
