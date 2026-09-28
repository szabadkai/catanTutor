export interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
  shuffle<T>(items: readonly T[]): T[];
}
export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return hash >>> 0;
}
/** Mulberry32. The cursor is serializable; no ambient entropy enters the engine. */
export class SeededRandom implements RandomSource {
  state: number;
  constructor(seed: string | number) {
    this.state = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max)
      throw new Error('Invalid random range');
    return min + Math.floor(this.next() * (max - min + 1));
  }
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
