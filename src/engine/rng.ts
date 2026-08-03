/**
 * Seeded, splittable PRNG.
 *
 * Every random outcome in the game draws from a named stream derived from the
 * save seed, so a given save replays identically. That is what makes offline
 * catch-up (II-A) auditable and, later, makes server-side verification possible
 * without shipping the whole tick history.
 */

export type Rng = () => number

/** mulberry32 — small, fast, good enough distribution for game use. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a. Turns a stream name into a seed offset. */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * A named stream. `counter` advances with every draw and is persisted, so a
 * reloaded save does not rewind its luck.
 */
export function stream(saveSeed: number, name: string, counter: number): Rng {
  return mulberry32((saveSeed ^ hashString(name)) + counter * 0x9e3779b1)
}

export function randInt(rng: Rng, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1))
}

export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(rng() * items.length)]
}

/**
 * Weighted pick. Weights need not sum to 1.
 */
export function pickWeighted<T>(rng: Rng, items: readonly { item: T; weight: number }[]): T | undefined {
  let total = 0
  for (const e of items) total += Math.max(0, e.weight)
  if (total <= 0) return undefined
  let roll = rng() * total
  for (const e of items) {
    roll -= Math.max(0, e.weight)
    if (roll <= 0) return e.item
  }
  return items[items.length - 1]?.item
}

/**
 * Resolve a fractional expectation into a whole number without bias.
 *
 * This is the heart of ballot II-A. A drop with a 1-in-900 chance rolled 4,000
 * times offline becomes an expectation of 4.44; we grant 4 and carry 0.44 into
 * the accumulator so nothing is silently rounded away. Over a long absence the
 * player receives exactly what the same time spent watching would have averaged,
 * with variance smoothed out rather than luck deleted.
 */
export function settleExpectation(expected: number, carry: number, rng: Rng): { granted: number; carry: number } {
  const total = expected + carry
  const whole = Math.floor(total)
  const frac = total - whole
  const bonus = rng() < frac ? 1 : 0
  return { granted: whole + bonus, carry: frac - bonus }
}
