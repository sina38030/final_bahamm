"use client";
import React, { useEffect, useState } from "react";
import { levelToFruit, useGameStore } from "../state/store";
import { resetRng } from "../engine/rng";

type Props = { onRestart: () => void };

export function Controls({ onRestart }: Props) {
  const { score, bestScore, muted, toggleMuted, paused, setPaused, seed, setSeed } = useGameStore();
  const [seedInput, setSeedInput] = useState(seed ?? "");

  useEffect(() => setSeedInput(seed ?? ""), [seed]);

  return (
    <div className="w-full max-w-[400px] flex flex-wrap items-center justify-between gap-2 text-white">
      <div className="flex items-center gap-3 min-w-[180px]">
        <div className="text-lg font-semibold">Score: {score}</div>
        <div className="text-sm opacity-80">Best: {bestScore}</div>
      </div>
      <div className="flex items-center gap-3">
        <FruitPreview />
        <input
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          placeholder="Seed"
          className="px-2 py-1 rounded bg-white/10 outline-none text-sm w-[120px]"
        />
        <button
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          onClick={() => { setSeed(seedInput || undefined); resetRng(seedInput || undefined); }}
        >
          Apply Seed
        </button>
        <button
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          onClick={() => toggleMuted()}
          aria-label="Toggle mute"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
          onClick={onRestart}
          aria-label="Restart"
        >
          Restart
        </button>
      </div>
    </div>
  );
}

function FruitPreview() {
  const { spawn } = useGameStore();
  const cur = levelToFruit(spawn.currentLevel);
  const next = levelToFruit(spawn.nextLevel);
  return (
    <div className="flex items-center gap-2" aria-label="fruit preview">
      <div className="flex items-center gap-1">
        <Dot color={cur.color} />
        <span className="text-xs opacity-80">Now</span>
      </div>
      <div className="flex items-center gap-1">
        <Dot color={next.color} />
        <span className="text-xs opacity-80">Next</span>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border border-white/20"
      style={{ backgroundColor: color }}
    />
  );
}


