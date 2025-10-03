type Pop = { x: number; y: number; text: string; start: number };
const pops: Pop[] = [];

export function addScorePop(x: number, y: number, amount: number) {
  pops.push({ x, y, text: `+${amount}`, start: performance.now() });
}

export function drawPops(ctx: CanvasRenderingContext2D, now: number) {
  const life = 800; // ms
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    const t = now - p.start;
    if (t > life) {
      pops.splice(i, 1);
      continue;
    }
    const k = t / life;
    const alpha = 1 - k;
    const dy = -k * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textAlign = "center";
    ctx.fillText(p.text, p.x, p.y + dy);
    ctx.restore();
  }
}


