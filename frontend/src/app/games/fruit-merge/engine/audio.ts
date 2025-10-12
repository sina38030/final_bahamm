let audioCtx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function beep(freq: number, durationMs: number, type: OscillatorType = "sine", volume = 0.03) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

export function playDrop(muted: boolean) {
  if (muted) return;
  beep(220, 80, "triangle", 0.04);
}
export function playMerge(muted: boolean) {
  if (muted) return;
  beep(440, 120, "sawtooth", 0.05);
}
export function playGameOver(muted: boolean) {
  if (muted) return;
  beep(120, 250, "square", 0.06);
}


