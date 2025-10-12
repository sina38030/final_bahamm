import { Composite, World } from "matter-js";
import { addFruit } from "./matter";
import { FRUITS, levelToFruit, useGameStore } from "../state/store";
import { playDrop } from "./audio";

export class GhostController {
  private width: number;
  private height: number;
  private x: number = 200;
  private lastDropAt = 0;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  updateX(x: number) {
    // Clamp by current fruit radius to keep within walls
    const def = levelToFruit(useGameStore.getState().spawn.currentLevel);
    const margin = def.radius;
    this.x = Math.max(margin, Math.min(this.width - margin, x));
  }
  getX() {
    return this.x;
  }
  canDrop() {
    return performance.now() - this.lastDropAt > 200;
  }
  markDropped() {
    this.lastDropAt = performance.now();
  }
  draw(ctx: CanvasRenderingContext2D) {
    const { spawn } = useGameStore.getState();
    const def = levelToFruit(spawn.currentLevel);
    ctx.save();
    ctx.globalAlpha = 0.6;
    const r = def.radius;
    const y = 40 + r;
    // Try sprite if available
    const imgPath = (def as any).sprite as string | undefined;
    if (imgPath) {
      const img = getGhostSprite(imgPath);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, this.x - r, y - r, r * 2, r * 2);
        ctx.restore();
        return;
      }
    }
    // Fallback ghost circle
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(this.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Simple sprite cache for ghost rendering
const ghostSpriteCache: Record<string, HTMLImageElement | undefined> = {};
function getGhostSprite(path: string): HTMLImageElement | undefined {
  if (ghostSpriteCache[path]) return ghostSpriteCache[path];
  const img = new Image();
  img.src = path;
  ghostSpriteCache[path] = img;
  return img;
}

export function dropCurrentFruit(world: World, ghost: GhostController, muted: boolean) {
  const store = useGameStore.getState();
  if (!ghost.canDrop()) return;
  const level = store.spawn.currentLevel;
  const def = levelToFruit(level);
  addFruit(world, level, ghost.getX(), 40 + def.radius);
  ghost.markDropped();
  store.nextFruit();
  playDrop(muted);
}

export function resetSpawner(world: World) {
  // Remove all fruit bodies
  const bodies = Composite.allBodies(world);
  for (const b of bodies) {
    if ((b as any).__fruit) {
      Composite.remove(world, b);
    }
  }
}


