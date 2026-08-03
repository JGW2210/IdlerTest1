import type { GameState, ItemId, RegionId } from './types'
import type { Rng } from './rng'
import { pickWeighted } from './rng'
import { GLYPH_BY_ID, GLYPHS } from '@/content/glyphs'
import { LORE, LORE_BY_ID, type LoreDef } from '@/content/lore'
import { REGIONS, hexDistance } from '@/content/regions'
import { levelOf } from './skills'
import { countItem, removeItem } from './inventory'

/**
 * Decipherment — the payload that makes Archaeology the skill that unlocks other
 * skills rather than a slower kind of mining.
 *
 * A dig yields a sealed tablet. Inscription opens it. What comes out is one of
 * three things, and each feeds a different system:
 *
 *   glyph     → the rune grammar gains a word
 *   lore      → the setting explains itself
 *   fragment  → a region elsewhere on the chart is inked in
 *
 * Which of the three, and how good, depends on the tablet's age — and tablet age
 * depends on how deep the strata you were willing to work. That chain is the
 * whole reason the depth layers exist.
 */

export type TabletAge = 'sealed' | 'elder' | 'first'

export interface TabletDef {
  item: ItemId
  age: TabletAge
  name: string
  /** Inscription level needed to attempt it. */
  levelReq: number
  /** Seconds to work through, before skill speed-ups. */
  baseTime: number
  xp: number
  /** Highest glyph level requirement this age can carry. */
  glyphCeiling: number
  /** Relative chances of each outcome. Normalised at roll time. */
  weights: { glyph: number; lore: number; fragment: number; insight: number }
}

export const TABLETS: TabletDef[] = [
  {
    item: 'sealedTablet', age: 'sealed', name: 'Sealed Tablet',
    levelReq: 1, baseTime: 9, xp: 140, glyphCeiling: 22,
    weights: { glyph: 30, lore: 30, fragment: 22, insight: 18 },
  },
  {
    item: 'elderTablet', age: 'elder', name: 'Elder Tablet',
    levelReq: 30, baseTime: 16, xp: 900, glyphCeiling: 46,
    weights: { glyph: 38, lore: 26, fragment: 22, insight: 14 },
  },
  {
    item: 'firstAgeTablet', age: 'first', name: 'First Age Tablet',
    levelReq: 60, baseTime: 26, xp: 5200, glyphCeiling: 99,
    weights: { glyph: 46, lore: 22, fragment: 18, insight: 14 },
  },
]

export const TABLET_BY_ITEM: Record<string, TabletDef> = Object.fromEntries(TABLETS.map((t) => [t.item, t]))

export type DecipherOutcome =
  | { kind: 'glyph'; glyph: string; name: string }
  | { kind: 'lore'; lore: string; title: string }
  | { kind: 'fragment'; region: RegionId; name: string }
  | { kind: 'insight'; amount: number }
  | { kind: 'nothing'; reason: string }

/** Which tablets the character can currently work on and actually holds. */
export function availableTablets(state: GameState): { def: TabletDef; held: number; unlocked: boolean }[] {
  const insc = levelOf(state, 'inscription')
  return TABLETS.map((def) => ({
    def,
    held: countItem(state, def.item),
    unlocked: insc >= def.levelReq,
  }))
}

/**
 * Glyphs this tablet age could still teach: unknown, and within the age's
 * ceiling. Rarer glyphs sit behind higher ceilings, so the Gloam and Empower
 * ends of the grammar are gated behind being willing to dig to the First Age.
 */
export function candidateGlyphs(state: GameState, def: TabletDef): string[] {
  const known = new Set(state.knownGlyphs)
  return GLYPHS.filter((g) => !known.has(g.id) && g.levelReq <= def.glyphCeiling).map((g) => g.id)
}

export function candidateLore(state: GameState, def: TabletDef): LoreDef[] {
  const read = new Set(state.lore.map((l) => l.id))
  return LORE.filter((l) => l.age === def.age && !read.has(l.id))
}

/**
 * Regions a map fragment could reveal. Fragments jump the frontier: they name a
 * place you have not surveyed to, which is what stops the outer rings being a
 * pure Cartography grind and gives digging a spatial payoff.
 */
export function candidateRegions(state: GameState, def: TabletDef): RegionId[] {
  const reach = def.age === 'first' ? 5 : def.age === 'elder' ? 4 : 3
  return REGIONS.filter((r) => {
    const rs = state.regions[r.id]
    if (!rs || rs.discovered) return false
    return hexDistance(r.coord, { q: 0, r: 0 }) <= reach
  }).map((r) => r.id)
}

/**
 * Open one tablet. Consumes it, and returns what was found.
 *
 * Outcome weights are re-normalised against what is actually still available, so
 * a player who has read every Second Age inscription stops rolling lore they
 * cannot receive instead of quietly wasting tablets.
 */
export function decipher(state: GameState, item: ItemId, rng: Rng): DecipherOutcome {
  const def = TABLET_BY_ITEM[item]
  if (!def) return { kind: 'nothing', reason: 'That is not a tablet.' }
  if (levelOf(state, 'inscription') < def.levelReq) {
    return { kind: 'nothing', reason: `${def.name}s need Inscription ${def.levelReq}.` }
  }
  if (!removeItem(state, item, 1)) {
    return { kind: 'nothing', reason: `No ${def.name} to open.` }
  }

  const glyphs = candidateGlyphs(state, def)
  const lore = candidateLore(state, def)
  const regions = candidateRegions(state, def)

  const options: { item: DecipherOutcome['kind']; weight: number }[] = [
    { item: 'glyph', weight: glyphs.length ? def.weights.glyph : 0 },
    { item: 'lore', weight: lore.length ? def.weights.lore : 0 },
    { item: 'fragment', weight: regions.length ? def.weights.fragment : 0 },
    // Insight always remains, so a tablet is never simply wasted.
    { item: 'insight', weight: def.weights.insight },
  ]

  const kind = pickWeighted(rng, options) ?? 'insight'

  if (kind === 'glyph' && glyphs.length) {
    // Prefer glyphs the character is closest to being able to use, so what comes
    // out of the ground is usable rather than aspirational.
    const insc = levelOf(state, 'inscription')
    const weighted = glyphs.map((id) => {
      const g = GLYPH_BY_ID[id]!
      const reach = Math.max(1, 60 - Math.abs(insc - g.levelReq))
      return { item: id, weight: reach }
    })
    const glyph = pickWeighted(rng, weighted) ?? glyphs[0]!
    state.knownGlyphs.push(glyph)
    return { kind: 'glyph', glyph, name: GLYPH_BY_ID[glyph]?.name ?? glyph }
  }

  if (kind === 'lore' && lore.length) {
    const entry = lore[Math.floor(rng() * lore.length)]!
    state.lore.push({ id: entry.id, title: entry.title, text: entry.text, foundAt: state.elapsed })
    return { kind: 'lore', lore: entry.id, title: entry.title }
  }

  if (kind === 'fragment' && regions.length) {
    // Nearer regions first: a fragment should feel like the next step outward,
    // not a random teleport to the far frontier.
    const weighted = regions.map((id) => {
      const region = REGIONS.find((r) => r.id === id)!
      const d = hexDistance(region.coord, { q: 0, r: 0 })
      return { item: id, weight: Math.max(1, 8 - d) }
    })
    const chosen = pickWeighted(rng, weighted) ?? regions[0]!
    const rs = state.regions[chosen]
    if (rs) {
      rs.discovered = true
      rs.surveyed = Math.max(rs.surveyed, 0.35)
    }
    if (!state.mapFragments.includes(chosen)) state.mapFragments.push(chosen)
    const name = REGIONS.find((r) => r.id === chosen)?.name ?? chosen
    return { kind: 'fragment', region: chosen, name }
  }

  const amount = Math.round(4 * Math.pow(3.2, TABLETS.indexOf(def)))
  state.insight += amount
  return { kind: 'insight', amount }
}

export function describeOutcome(o: DecipherOutcome): string {
  switch (o.kind) {
    case 'glyph': return `The tablet gives up a glyph: ${o.name}.`
    case 'lore': return `You read it through: “${o.title}”.`
    case 'fragment': return `A map fragment. It names ${o.name}, and now so does your chart.`
    case 'insight': return `Nothing new, but the reading sharpens you. +${o.amount} insight.`
    case 'nothing': return o.reason
  }
}

export { LORE_BY_ID }
