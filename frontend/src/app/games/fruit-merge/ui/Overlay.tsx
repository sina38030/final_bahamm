"use client";
import React, { useState } from "react";
import { useGameStore } from "../state/store";

type Props = { onRestart: () => void };

export function Overlay({ onRestart }: Props) {
  const { gameOver, score, bestScore } = useGameStore();
  const [copied, setCopied] = useState(false);
  if (!gameOver) return null;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg bg-neutral-900 text-white p-4 border border-white/10">
        <div className="text-xl font-semibold mb-2">Game Over</div>
        <div className="mb-2">Score: {score}</div>
        <div className="mb-4 opacity-80">Best: {bestScore}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={onRestart}>Play Again</button>
          <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={share}>{copied ? "Copied!" : "Share"}</button>
        </div>
      </div>
    </div>
  );
}


