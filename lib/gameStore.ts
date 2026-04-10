export interface GameStats {
  totalGained: number;
  totalLost: number;
  biggestWin: number;
  biggestLoss: number;
  timesBroke: number;
  longestLossStreak: number;
  totalSpins: number;
  gamesPlayed: Record<string, number>;
  winRates: Record<string, { wins: number; plays: number }>;
  timeSpentMs: number;
  sessionStartMs: number | null;
}

export interface OwnedUpgrades {
  "odds-reveal": boolean;
  "dealer-meter": boolean;
  "near-miss": boolean;
  volatility: boolean;
  "house-anger": boolean;
  "chaos-mode": boolean;
  "house-provoke": boolean;
  "cursed-run": boolean;
}

export interface GlobalState {
  balance: number;
  stats: GameStats;
  upgrades: OwnedUpgrades;
}

const DEFAULT_STATE: GlobalState = {
  balance: 100,
  stats: {
    totalGained: 0,
    totalLost: 0,
    biggestWin: 0,
    biggestLoss: 0,
    timesBroke: 0,
    longestLossStreak: 0,
    totalSpins: 0,
    gamesPlayed: {},
    winRates: {},
    timeSpentMs: 0,
    sessionStartMs: null,
  },
  upgrades: {
    "odds-reveal": false,
    "dealer-meter": false,
    "near-miss": false,
    volatility: false,
    "house-anger": false,
    "chaos-mode": false,
    "house-provoke": false,
    "cursed-run": false,
  },
};

const KEY = "casino_state_v1";

export function loadState(): GlobalState {
  if (typeof window === "undefined") return structuredClone(DEFAULT_STATE);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw) as GlobalState;
    // merge to fill in any new keys added after first save
    return {
      ...DEFAULT_STATE,
      ...parsed,
      stats: { ...DEFAULT_STATE.stats, ...parsed.stats },
      upgrades: { ...DEFAULT_STATE.upgrades, ...parsed.upgrades },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state: GlobalState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function getBalance(): number {
  return loadState().balance;
}

export function setBalance(balance: number): void {
  const s = loadState();
  s.balance = balance;
  saveState(s);
}

export function recordSpin(opts: {
  game: string;
  bet: number;
  payout: number; // 0 = loss
}): void {
  const s = loadState();
  const { game, bet, payout } = opts;

  s.stats.totalSpins += 1;
  s.stats.gamesPlayed[game] = (s.stats.gamesPlayed[game] ?? 0) + 1;

  if (!s.stats.winRates[game]) s.stats.winRates[game] = { wins: 0, plays: 0 };
  s.stats.winRates[game].plays += 1;

  if (payout > 0) {
    s.stats.totalGained += payout;
    s.stats.biggestWin = Math.max(s.stats.biggestWin, payout);
    s.stats.winRates[game].wins += 1;
  } else {
    s.stats.totalLost += bet;
    s.stats.biggestLoss = Math.max(s.stats.biggestLoss, bet);
  }

  saveState(s);
}

export function recordBroke(): void {
  const s = loadState();
  s.stats.timesBroke += 1;
  saveState(s);
}

export function recordLossStreak(streak: number): void {
  const s = loadState();
  s.stats.longestLossStreak = Math.max(s.stats.longestLossStreak, streak);
  saveState(s);
}

export function buyUpgrade(id: keyof OwnedUpgrades, cost: number): boolean {
  const s = loadState();
  if (s.balance < cost || s.upgrades[id]) return false;
  s.balance -= cost;
  s.upgrades[id] = true;
  saveState(s);
  return true;
}

export function getUpgrades(): OwnedUpgrades {
  return loadState().upgrades;
}
