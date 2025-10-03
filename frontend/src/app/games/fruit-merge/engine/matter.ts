import Matter, { Bodies, Body, Composite, Engine, Events, Runner, World } from "matter-js";
import { FRUITS, levelToFruit, MAX_LEVEL, scoreForMerge, useGameStore, FruitDef } from "../state/store";

export type FruitBody = Body & { __fruit?: { level: number; id: number; lastMergedAt?: number } };

let globalId = 1;

export function createEngineWithWorld() {
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1.0;
  const world = engine.world;
  // Optimized for better performance with acceptable stability
  engine.positionIterations = 4; // Reduced from 8
  engine.velocityIterations = 4; // Reduced from 6
  engine.constraintIterations = 1; // Reduced from 2
  // Enable sleeping to reduce CPU usage for static bodies
  engine.enableSleeping = true;
  return { engine, world };
}

export function stepEngine(engine: Engine, dt: number) {
  Engine.update(engine, dt * 1000);
}

export function makeWalls(world: World, width: number, height: number) {
  const thickness = 40;
  const half = thickness / 2;
  const left = Bodies.rectangle(-half, height / 2, thickness, height, { isStatic: true });
  const right = Bodies.rectangle(width + half, height / 2, thickness, height, { isStatic: true });
  const floor = Bodies.rectangle(width / 2, height + half, width, thickness, { isStatic: true });
  Composite.add(world, [left, right, floor]);
}

export function createFruitBody(level: number, x: number, y: number): FruitBody {
  const def = levelToFruit(level);
  const radius = def.radius;
  const mass = def.baseMass * (radius * radius) * 0.0005;
  const restitution = Math.max(0.1, 0.6 - level * 0.04);
  const frictionAir = Math.min(0.08 + level * 0.01, 0.2);
  const body = Bodies.circle(x, y, radius, {
    restitution,
    friction: 0.1,
    frictionStatic: 0.2,
    frictionAir,
    density: Math.max(0.001, mass / (Math.PI * radius * radius)),
    slop: 0.01,
  }) as FruitBody;
  body.__fruit = { level, id: globalId++ };
  return body;
}

export function addFruit(world: World, level: number, x: number, y: number): FruitBody {
  const body = createFruitBody(level, x, y);
  Composite.add(world, body);
  return body;
}

// Rendering bridge: register a function on window used by the React component
// Sprite cache
const spriteCache: Record<string, HTMLImageElement | undefined> = {};

function getSprite(def: FruitDef): HTMLImageElement | undefined {
  if (!def.sprite) return undefined;
  if (spriteCache[def.sprite]) return spriteCache[def.sprite];
  const img = new Image();
  img.src = def.sprite;
  spriteCache[def.sprite] = img;
  return img;
}

function seededRandom(seed: number) {
  // xorshift32
  let x = seed || 123456789;
  return () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    // convert to [0,1)
    return ((x >>> 0) % 1000000) / 1000000;
  };
}

function drawFruitVector(ctx: CanvasRenderingContext2D, def: FruitDef, seed?: number) {
  const r = def.radius;
  const name = def.name.toLowerCase();
  const rand = seededRandom((seed ?? 0) + Math.floor(r * 100));

  // Base glossy sphere
  const baseGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r);
  baseGrad.addColorStop(0, "#ffffff22");
  baseGrad.addColorStop(0.15, def.color);
  baseGrad.addColorStop(1, "#00000022");
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.fillStyle = "#ffffff33";
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();

  if (name.includes("watermelon")) {
    // Watermelon slice cross-section within circle
    // Green rind
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.strokeStyle = "#2f9e44";
    ctx.beginPath();
    ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    // White rind inner ring
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.strokeStyle = "#f1f3f5";
    ctx.beginPath();
    ctx.arc(0, 0, r - ctx.lineWidth * 2.2, 0, Math.PI * 2);
    ctx.stroke();
    // Red flesh
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    // Seeds
    const seedCount = Math.max(8, Math.floor(r * 0.4));
    ctx.fillStyle = "#0f0f0f";
    for (let i = 0; i < seedCount; i++) {
      const a = rand() * Math.PI * 2;
      const rr = r * (0.15 + rand() * 0.6);
      const sx = Math.cos(a) * rr;
      const sy = Math.sin(a) * rr;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.045, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  if (name.includes("orange")) {
    // Pores texture
    const pores = Math.max(30, Math.floor(r * 1.2));
    ctx.fillStyle = "#ffffff15";
    for (let i = 0; i < pores; i++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * (r * 0.9);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      ctx.beginPath();
      ctx.arc(x, y, rand() * (r * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (name.includes("apple")) {
    // Stem
    ctx.strokeStyle = "#5b3a29";
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.9);
    ctx.quadraticCurveTo(0, -r * 1.05, r * 0.15, -r * 0.8);
    ctx.stroke();
    // Leaf
    ctx.fillStyle = "#74c69d";
    ctx.beginPath();
    ctx.ellipse(r * 0.25, -r * 0.85, r * 0.25, r * 0.15, -0.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (name.includes("strawberry")) {
    // Seeds
    const seeds = Math.max(18, Math.floor(r * 0.9));
    for (let i = 0; i < seeds; i++) {
      const a = rand() * Math.PI * 2;
      const rr = r * (0.15 + rand() * 0.7);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      ctx.fillStyle = "#ffe66d";
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.04, r * 0.02, a, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (name.includes("grape") || name.includes("peach") || name.includes("pear") || name.includes("lime") || name.includes("melon")) {
    // Subtle noise dots for texture
    const dots = Math.max(20, Math.floor(r * 0.8));
    ctx.fillStyle = "#ffffff14";
    for (let i = 0; i < dots; i++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * (r * 0.9);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
}

function drawFruit(ctx: CanvasRenderingContext2D, def: FruitDef, seed?: number) {
  const img = getSprite(def);
  if (img && img.complete && img.naturalWidth > 0) {
    const r = def.radius;
    // soft shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = Math.max(6, r * 0.25);
    ctx.shadowOffsetY = Math.max(2, r * 0.08);
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
    ctx.restore();
    return;
  }
  // high-quality vector fallback
  drawFruitVector(ctx, def, seed);
}

if (typeof window !== "undefined") {
  (window as any).__FRUIT_RENDER = (ctx: CanvasRenderingContext2D) => {
    const world = (Matter as any).engine?.world as World | undefined;
    if (!world) return;
    const bodies = Composite.allBodies(world) as FruitBody[];
    for (const b of bodies) {
      if (!b.__fruit) continue;
      const def = levelToFruit(b.__fruit.level);
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      drawFruit(ctx, def, b.__fruit.id);
      ctx.restore();
    }
  };

  // Warm image cache early
  try {
    for (const def of FRUITS) {
      if (def.sprite) getSprite(def);
    }
  } catch {}
}

// Loss detection bridge
let lossStableSince: number | null = null;
export function checkLoss(world: World): boolean {
  const bodies = Composite.allBodies(world) as FruitBody[];
  let over = false;
  for (const b of bodies) {
    if (!b.__fruit) continue;
    if (b.position.y - levelToFruit(b.__fruit.level).radius < 80) {
      if (b.speed < 0.15 && b.angularSpeed < 0.15) {
        over = true;
        break;
      }
    }
  }
  return over;
}

if (typeof window !== "undefined") {
  (window as any).__FRUIT_LOSS_CHECK = (now: number) => {
    const world = (Matter as any).engine?.world as World | undefined;
    if (!world) return false;
    const over = checkLoss(world);
    if (over) {
      if (lossStableSince === null) lossStableSince = now;
      return now - lossStableSince > 1000;
    } else {
      lossStableSince = null;
      return false;
    }
  };
}

// Expose engine reference for rendering bridge
if (typeof window !== "undefined") {
  (Matter as any).engine = { world: undefined } as any;
}

export function bindWorldForRender(world: World) {
  if (typeof window !== "undefined") {
    (Matter as any).engine.world = world;
  }
}


