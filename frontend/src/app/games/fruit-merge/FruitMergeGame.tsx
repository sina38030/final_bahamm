"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controls } from "./ui/Controls";
import { Overlay } from "./ui/Overlay";
import { useGameStore } from "./state/store";
import { createEngineWithWorld, makeWalls, stepEngine, bindWorldForRender } from "./engine/matter";
import { processMerges, registerCollisionHandlers, resetMerger } from "./engine/merger";
import { playGameOver } from "./engine/audio";
import { GhostController, dropCurrentFruit, resetSpawner } from "./engine/spawn";
import { getCanvasScale } from "./utils/scaling";
import { drawPops } from "./engine/pops";
import { resetRng } from "./engine/rng";

/**
 * README (FruitMergeGame)
 *
 * Controls
 * - Desktop: Move mouse to aim. Click or press Space to drop fruit.
 * - Mobile: Drag finger to aim. Tap anywhere to drop.
 * - Top bar: Pause/Resume, Restart, Mute, Seed input (optional deterministic runs).
 *
 * Tweaks
 * - Sizes/physics: See `state/store.ts` FRUITS and `engine/matter.ts` tuning.
 * - Merge rules: See `engine/merger.ts`.
 * - Spawn logic: See `engine/spawn.ts`.
 */

const PLAYFIELD_WIDTH = 400;
const PLAYFIELD_HEIGHT = 600;

export default function FruitMergeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const ghostRef = useRef<GhostController | null>(null);

  const {
    paused,
    muted,
    score,
    bestScore,
    gameOver,
    setGameOver,
    tick,
    resetGame,
    seed,
  } = useGameStore();

  const [engine, setEngine] = useState<any>(null);
  const [world, setWorld] = useState<any>(null);

  // Initialize Matter.js engine asynchronously
  useEffect(() => {
    const initEngine = async () => {
      const { engine: eng, world: wld } = await createEngineWithWorld();
      setEngine(eng);
      setWorld(wld);
    };
    initEngine();
  }, []);

  // Setup walls and collision handlers once
  useEffect(() => {
    if (!engine || !world) return;
    
    const setupGame = async () => {
      await makeWalls(world, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
      await registerCollisionHandlers(engine);
      bindWorldForRender(world);
    };
    setupGame();
    
    return () => {
      resetMerger();
    };
  }, [engine, world]);

  // Canvas resize / DPR scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const { width, height, scale } = getCanvasScale(
        container.clientWidth,
        container.clientHeight,
        PLAYFIELD_WIDTH,
        PLAYFIELD_HEIGHT
      );
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      }
    };
    resize();
    
    // Check if ResizeObserver is available (missing on some Android WebViews)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(resize);
      ro.observe(container);
      return () => ro.disconnect();
    }
    
    // Fallback: use window resize event
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Seeded RNG init
  useEffect(() => {
    resetRng(seed);
  }, [seed]);

  // Input handlers (mouse/touch)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    ghostRef.current = new GhostController(PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

    let isPointerDown = false;
    const getLocalX = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * PLAYFIELD_WIDTH;
      return x;
    };

    const onMove = (e: PointerEvent) => {
      if (!ghostRef.current) return;
      ghostRef.current.updateX(getLocalX(e));
    };
    const onDown = (e: PointerEvent) => {
      isPointerDown = true;
      onMove(e);
    };
    const onUp = () => {
      isPointerDown = false;
      if (!paused && ghostRef.current && world) {
        dropCurrentFruit(world, ghostRef.current, muted);
      }
    };
    container.addEventListener("pointermove", onMove, { passive: true });
    container.addEventListener("pointerdown", onDown, { passive: true });
    container.addEventListener("pointerup", onUp, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !paused && ghostRef.current && world) {
        e.preventDefault();
        dropCurrentFruit(world, ghostRef.current, muted);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("pointermove", onMove as any);
      container.removeEventListener("pointerdown", onDown as any);
      container.removeEventListener("pointerup", onUp as any);
      window.removeEventListener("keydown", onKey);
    };
  }, [world, paused, muted]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine || !world) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTs = performance.now();
    let acc = 0;
    const fixedDt = 1000 / 60;

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (paused) return;

      const dt = ts - lastTs;
      lastTs = ts;
      acc += dt;
      while (acc >= fixedDt) {
        stepEngine(engine, fixedDt / 1000);
        processMerges(world, muted);
        acc -= fixedDt;
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Background
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
      // Loss line
      ctx.strokeStyle = "#ffffff44";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.lineTo(PLAYFIELD_WIDTH, 80);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw walls (subtle)
      ctx.strokeStyle = "#ffffff22";
      ctx.strokeRect(0.5, 0.5, PLAYFIELD_WIDTH - 1, PLAYFIELD_HEIGHT - 1);

      // Draw fruits (vector placeholders for performance)
      (window as any).__FRUIT_RENDER?.(ctx);

      // Draw ghost
      if (ghostRef.current) {
        ghostRef.current.draw(ctx);
      }
      drawPops(ctx, ts);

      // Loss detection
      const loss = (window as any).__FRUIT_LOSS_CHECK?.(ts);
      if (loss && !gameOver) {
        setGameOver(true);
        playGameOver(muted);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [engine, world, paused, muted, gameOver, setGameOver]);

  // Restart handler
  const handleRestart = () => {
    if (world) {
      resetSpawner(world);
    }
    resetGame();
  };

  return (
    <div className="w-full max-w-[500px] flex flex-col items-center gap-3">
      <Controls onRestart={handleRestart} />
      <div
        ref={containerRef}
        className="relative w-full aspect-[2/3] max-w-[400px] bg-neutral-900 rounded-lg border border-white/10 shadow-lg overflow-hidden"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
      <Overlay onRestart={handleRestart} />
    </div>
  );
}


