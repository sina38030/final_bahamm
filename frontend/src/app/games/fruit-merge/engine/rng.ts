export function createSeededRng(seedString?: string) {
  // xmur3 hash + sfc32 PRNG
  const seed = seedString ?? "" + Math.random();
  function xmur3(str: string) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function sfc32(a: number, b: number, c: number, d: number) {
    return function () {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  const seedFn = xmur3(seed);
  const rand = sfc32(seedFn(), seedFn(), seedFn(), seedFn());
  return rand;
}

let rng: (() => number) | null = null;

export function resetRng(seed?: string) {
  rng = createSeededRng(seed);
}

export function rngRandom(): number {
  if (!rng) rng = createSeededRng();
  return rng();
}



