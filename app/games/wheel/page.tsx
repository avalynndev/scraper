"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

const SEGMENTS = [
  { label: "+200", color: "#22c55e", type: "win" },
  { label: "−150", color: "#ef4444", type: "lose" },
  { label: "SPIN AGAIN", color: "#eab308", type: "chaos" },
  { label: "+500", color: "#22c55e", type: "win" },
  { label: "CURSE", color: "#7c3aed", type: "curse" },
  { label: "−300", color: "#ef4444", type: "lose" },
  { label: "+100", color: "#22c55e", type: "win" },
  { label: "WORSE ODDS", color: "#f97316", type: "chaos" },
];

export default function WheelPage() {
  const segAngle = 360 / SEGMENTS.length;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(234,179,8,0.05)_0%,transparent_60%)]" />
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
            className="border-yellow-900 text-yellow-400 font-mono text-xs"
          >
            DANGER: MEDIUM
          </Badge>
          <div className="text-sm font-mono opacity-50">
            BALANCE: <span className="opacity-100">100 CRAPS</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter">
            WHEEL OF REGRET
          </h1>
          <p className="font-mono text-xs opacity-40 tracking-widest">
            NOBODY STOPS EARLY
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-10 border-r-10 border-t-20 border-l-transparent border-r-transparent border-t-foreground" />
          </div>

          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            className="drop-shadow-2xl"
          >
            {SEGMENTS.map((seg, i) => {
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
          <div className="flex items-center justify-between border border-border p-4">
            <div>
              <div className="text-xs font-mono opacity-40">SPIN COST</div>
              <div className="font-black text-2xl tabular-nums">
                25 <span className="text-base font-mono opacity-50">CRAPS</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono opacity-40">NEXT SPIN</div>
              <div className="font-black text-2xl tabular-nums text-red-400">
                50 <span className="text-base font-mono opacity-50">CRAPS</span>
              </div>
            </div>
          </div>

          <Button className="w-full font-black tracking-widest text-lg py-6">
            SPIN — 25 CRAPS
          </Button>

          <p className="text-xs font-mono opacity-20 text-center">
            Rewards and punishments grow every spin. Spin costs double.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="text-xs font-mono opacity-30 mb-3 tracking-wider">
            SPIN HISTORY
          </div>
          <div className="flex gap-2 flex-wrap">
            {["—", "—", "—", "—", "—"].map((_, i) => (
              <div
                key={i}
                className="border border-border px-3 py-1 text-xs font-mono opacity-20"
              >
                —
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="p-6 text-center">
        <p className="text-xs font-mono opacity-20">THE HOUSE ALWAYS WINS</p>
      </footer>
    </div>
  );
}
