import { Body, Composite, Engine, Events, IEventCollision, Pair, World } from "matter-js";
import { addFruit, FruitBody } from "./matter";
import { levelToFruit, MAX_LEVEL, scoreForMerge, useGameStore } from "../state/store";
import { playMerge } from "./audio";
import { addScorePop } from "./pops";

type MergeCandidate = { a: FruitBody; b: FruitBody; x: number; y: number };
const mergeQueue: MergeCandidate[] = [];
const recentMergedIds = new Map<number, number>();

export function resetMerger() {
  mergeQueue.length = 0;
  recentMergedIds.clear();
}

export function registerCollisionHandlers(engine: Engine) {
  Events.on(engine as any, "collisionStart", (e: IEventCollision<any>) => {
    for (const pair of e.pairs as Pair[]) maybeQueueMerge(pair);
  });
  Events.on(engine as any, "collisionActive", (e: IEventCollision<any>) => {
    for (const pair of e.pairs as Pair[]) maybeQueueMerge(pair);
  });
}

function maybeQueueMerge(pair: Pair) {
  const a = pair.bodyA as FruitBody;
  const b = pair.bodyB as FruitBody;
  if (!a.__fruit || !b.__fruit) return;
  if (a.__fruit.level !== b.__fruit.level) return;
  const now = performance.now();
  const cooldown = 150;
  if ((a.__fruit.lastMergedAt && now - a.__fruit.lastMergedAt < cooldown) || (b.__fruit.lastMergedAt && now - b.__fruit.lastMergedAt < cooldown)) return;
  if ((recentMergedIds.get(a.__fruit.id) ?? 0) === 1 || (recentMergedIds.get(b.__fruit.id) ?? 0) === 1) return;
  const x = (a.position.x + b.position.x) / 2;
  const y = (a.position.y + b.position.y) / 2;
  mergeQueue.push({ a, b, x, y });
}

export function processMerges(world: World, muted: boolean) {
  if (!mergeQueue.length) return;
  const gs = useGameStore.getState();
  const processed: MergeCandidate[] = [];
  while (mergeQueue.length) processed.push(mergeQueue.shift()!);

  for (const m of processed) {
    if (!m.a.__fruit || !m.b.__fruit) continue;
    if (m.a.isSleeping || m.b.isSleeping) {
      Body.setStatic(m.a, false);
      Body.setStatic(m.b, false);
    }
    // Ensure still valid
    if (!Composite.get(world, m.a.id, "body") || !Composite.get(world, m.b.id, "body")) continue;
    if (m.a.__fruit.level !== m.b.__fruit.level) continue;

    const level = Math.min(m.a.__fruit.level + 1, MAX_LEVEL);
    Composite.remove(world, m.a);
    Composite.remove(world, m.b);
    const merged = addFruit(world, level, m.x, m.y - 2);
    merged.__fruit!.lastMergedAt = performance.now();
    recentMergedIds.set(merged.__fruit!.id, 1);
    setTimeout(() => recentMergedIds.delete(merged.__fruit!.id), 200);
    // Gentle impulse up to avoid immediate re-collide
    Body.setVelocity(merged, { x: 0, y: -2 });
    const amount = scoreForMerge(level);
    gs.addScore(amount);
    addScorePop(merged.position.x, merged.position.y - (levelToFruit(level).radius + 10), amount);
    playMerge(gs.muted);
  }
}


