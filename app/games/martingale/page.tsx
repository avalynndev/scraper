"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

const MOCK_GRAPH_POINTS = [100, 150, 75, 150, 300, 150, 75, 37, 74, 148, 74, 0];

export default function MartingalePage() {
  const maxVal = Math.max(...MOCK_GRAPH_POINTS);
  const width = 400;
  const height = 160;
  const points = MOCK_GRAPH_POINTS.map((v, i) => ({
    x: (i / (MOCK_GRAPH_POINTS.length - 1)) * width,
    y: height - (v / maxVal) * height,
  }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const ruinIndex = MOCK_GRAPH_POINTS.findIndex((v) => v === 0);
  const ruinPoint = ruinIndex >= 0 ? points[ruinIndex] : null;

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
        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className="border-zinc-600 text-zinc-400 font-mono text-xs"
          >
            DANGER: CERTAIN
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">100 CRAPS</span>
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
            <div className="text-xs font-mono text-red-400 opacity-60">
              DEMO DATA
            </div>
          </div>

          <div className="relative">
            <svg
              width="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              className="h-40"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <line
                  key={v}
                  x1="0"
                  y1={height * v}
                  x2={width}
                  y2={height * v}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
              ))}

              <polyline
                points={polyline}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth="1.5"
                strokeLinejoin="round"
                opacity="0.6"
              />

              {ruinPoint && (
                <>
                  <line
                    x1={ruinPoint.x}
                    y1={0}
                    x2={ruinPoint.x}
                    y2={height}
                    stroke="#ef4444"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.6"
                  />
                  <circle
                    cx={ruinPoint.x}
                    cy={ruinPoint.y}
                    r="4"
                    fill="#ef4444"
                  />
                </>
              )}
            </svg>

            {ruinPoint && (
              <div className="absolute bottom-2 right-0 text-xs font-mono text-red-400 opacity-60">
                ← RUIN POINT
              </div>
            )}
          </div>

          <div className="text-xs font-mono opacity-20">
            You were statistically doomed here.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border p-6 space-y-5">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              STRATEGY SETTINGS
            </div>

            {[
              { label: "STARTING BET", value: "10", unit: "CRAPS" },
              { label: "MULTIPLIER", value: "2×", unit: "" },
              { label: "MAX BET CAP", value: "∞", unit: "" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="space-y-2">
                <div className="text-xs font-mono opacity-40">{label}</div>
                <div className="flex items-center border border-border">
                  <button className="px-3 py-2 font-mono opacity-40 hover:opacity-100 transition-opacity border-r border-border text-sm">
                    −
                  </button>
                  <div className="flex-1 text-center font-black text-lg py-2">
                    {value}{" "}
                    {unit && (
                      <span className="text-sm font-mono opacity-50">
                        {unit}
                      </span>
                    )}
                  </div>
                  <button className="px-3 py-2 font-mono opacity-40 hover:opacity-100 transition-opacity border-l border-border text-sm">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="text-xs font-mono opacity-40 tracking-wider">
              END SCREEN
            </div>

            {[
              { label: "TOTAL PROFIT", value: "—" },
              { label: "TOTAL LOSS", value: "—" },
              { label: "ROUNDS PLAYED", value: "—" },
              { label: "RUIN ROUND", value: "—" },
              { label: "VERDICT", value: "NOT RUN" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="text-xs font-mono opacity-40">{label}</div>
                <div className="font-black text-sm tabular-nums opacity-30">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Button className="flex-1 font-black tracking-widest text-lg py-6">
            RUN SIMULATION
          </Button>
          <Button variant="outline" className="px-8 font-mono opacity-50">
            RESET
          </Button>
        </div>

        <p className="text-xs font-mono opacity-20 text-center">
          The Martingale strategy guarantees short-term wins and long-term ruin.
        </p>
      </main>

      <footer className="p-6 text-center border-t border-border">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
