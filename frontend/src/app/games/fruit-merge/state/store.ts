import { create } from "zustand";
import { resetRng, rngRandom } from "../engine/rng";

export type FruitDef = {
  level: number; // 1..11
  name: string;
  radius: number;
  baseMass: number;
  color: string;
  sprite?: string; // optional high-quality sprite path under /public
};

export const FRUITS: FruitDef[] = [
  { level: 1, name: "Cherry", radius: 12, baseMass: 0.2, color: "#ff4d6d", sprite: "/fruit-merge/cherry.png" },
  { level: 2, name: "Strawberry", radius: 16, baseMass: 0.35, color: "#ff6b6b", sprite: "/fruit-merge/strawberry.png" },
  { level: 3, name: "Grape", radius: 22, baseMass: 0.5, color: "#845ef7", sprite: "/fruit-merge/grape.png" },
  { level: 4, name: "Lime", radius: 28, baseMass: 1.0, color: "#51cf66", sprite: "/fruit-merge/lime.png" },
  { level: 5, name: "Orange", radius: 36, baseMass: 1.5, color: "#ffa94d", sprite: "/fruit-merge/orange.png" },
  { level: 6, name: "Apple", radius: 46, baseMass: 2.0, color: "#ff8787", sprite: "/fruit-merge/apple.png" },
  { level: 7, name: "Pear", radius: 58, baseMass: 3.5, color: "#94d82d", sprite: "/fruit-merge/pear.png" },
  { level: 8, name: "Peach", radius: 72, baseMass: 5.0, color: "#ff9f9a", sprite: "/fruit-merge/peach.png" },
  { level: 9, name: "Pineapple", radius: 88, baseMass: 7.5, color: "#ffd43b", sprite: "/fruit-merge/pineapple.png" },
  { level: 10, name: "Melon", radius: 100, baseMass: 9.5, color: "#69db7c", sprite: "/fruit-merge/melon.png" },
  { level: 11, name: "Watermelon", radius: 110, baseMass: 12.0, color: "#2f9e44", sprite: "/fruit-merge/watermelon-slice.png" },
];

export const MAX_LEVEL = 11;

export function levelToFruit(level: number): FruitDef {
  return FRUITS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];
}

export type SpawnQueue = {
  currentLevel: number;
  nextLevel: number;
};

export type GameState = {
  score: number;
  bestScore: number;
  muted: boolean;
  paused: boolean;
  gameOver: boolean;
  seed?: string;
  spawn: SpawnQueue;
  comboState: { windowStart: number; merges: number } | null;
  setMuted: (v: boolean) => void;
  toggleMuted: () => void;
  setPaused: (v: boolean) => void;
  setSeed: (s?: string) => void;
  setGameOver: (v: boolean) => void;
  addScore: (base: number) => void;
  nextFruit: () => void;
  resetGame: () => void;
  tick: () => void; // noop to wake subscribers
};

const BEST_KEY = "fruit-merge-best";
const SETTINGS_KEY = "fruit-merge-settings";

function loadBest(): number {
  try {
    const v = localStorage.getItem(BEST_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

function saveBest(v: number) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {}
}

function loadSettings(): { muted: boolean; seed?: string } {
  try {
    const v = localStorage.getItem(SETTINGS_KEY);
    return v ? JSON.parse(v) : { muted: false };
  } catch {
    return { muted: false };
  }
}

function saveSettings(s: { muted: boolean; seed?: string }) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

function initialSpawn(): SpawnQueue {
  return { currentLevel: 1, nextLevel: 2 };
}

export const useGameStore = create<GameState>((set, get) => ({
  score: 0,
  bestScore: typeof window !== "undefined" ? loadBest() : 0,
  muted: typeof window !== "undefined" ? loadSettings().muted : false,
  paused: false,
  gameOver: false,
  seed: typeof window !== "undefined" ? loadSettings().seed : undefined,
  spawn: initialSpawn(),
  comboState: null,
  setMuted: (v) => {
    set({ muted: v });
    const s = loadSettings();
    saveSettings({ ...s, muted: v });
  },
  toggleMuted: () => {
    const muted = !get().muted;
    set({ muted });
    const s = loadSettings();
    saveSettings({ ...s, muted });
  },
  setPaused: (v) => set({ paused: v }),
  setSeed: (seed) => {
    set({ seed });
    const s = loadSettings();
    saveSettings({ ...s, seed });
  },
  setGameOver: (v) => set({ gameOver: v, paused: v || get().paused }),
  addScore: (base) => {
    const now = performance.now();
    const cs = get().comboState;
    let merges = 1;
    let windowStart = now;
    if (cs && now - cs.windowStart <= 500) {
      merges = cs.merges + 1;
      windowStart = cs.windowStart;
    }
    const bonusPct = Math.min(0.5, Math.max(0, (merges - 1) * 0.1));
    const gained = Math.round(base * (1 + bonusPct));
    const newScore = get().score + gained;
    const bestScore = Math.max(newScore, get().bestScore);
    set({ score: newScore, bestScore, comboState: { windowStart, merges } });
    saveBest(bestScore);
  },
  nextFruit: () => {
    const { spawn } = get();
    // New next level: weighted low-level distribution 1..5
    const bag = [1,1,1,2,2,3,3,4,5];
    const idx = Math.floor(rngRandom() * bag.length);
    const next = bag[Math.max(0, Math.min(bag.length - 1, idx))];
    set({ spawn: { currentLevel: spawn.nextLevel, nextLevel: next } });
  },
  resetGame: () => set({
    score: 0,
    paused: false,
    gameOver: false,
    spawn: initialSpawn(),
    comboState: null,
  }),
  tick: () => set((s) => ({ ...s })),
}));

export function scoreForMerge(level: number): number {
  // Merge score defined as 2^level * 10
  return Math.pow(2, level) * 10;
}


