import type { GameState, RegionDef, RegionId } from './types'
import { REGIONS, REGION_BY_ID } from '@/content/regions'
import {
  POWER_BY_ID, CLAIM_STANDING, glyphPrice, glyphsOffered, standingTier, type PowerDef,
} from '@/content/powers'
import { GLYPH_BY_ID } from '@/content/glyphs'

/**
 * Standing with the foreign powers.
 *
 * The four things reaching a hold is worth, in one place:
 *
 *   goods     — their trade-only metal, on their market's yield table
 *   tutors    — glyphs only they teach, bought with Insight
 *   a base    — a reached hold extends how far a survey can push
 *   a claim   — at full standing they will treat for the hold itself
 *
 * Standing is earned by working their ground, not by a reputation bar that
 * fills on its own. Trading at their market counts for most; labouring in their
 * works counts for something.
 */

/** Standing gained per completed action in a foreign hold. */
export function standingPerAction(activity: string): number {
  if (activity === 'trade') return 0.22
  if (activity === 'excavate') return 0.06
  return 0.1
}

export function powerOf(region: RegionDef): PowerDef | undefined {
  return region.power ? POWER_BY_ID[region.power] : undefined
}

export function standingOf(state: GameState, regionId: RegionId): number {
  return state.regions[regionId]?.standing ?? 0
}

export interface HoldSummary {
  region: RegionDef
  power: PowerDef
  standing: number
  tier: { at: number; name: string; teaches: number }
  /** Glyphs they will currently teach, and whether each is already known. */
  offers: { glyph: string; name: string; price: number; known: boolean }[]
  /** Glyphs held back until standing rises. */
  withheld: number
  claimable: boolean
  held: boolean
}

/** Every foreign hold the player has found, with what it currently offers. */
export function knownHolds(state: GameState): HoldSummary[] {
  const out: HoldSummary[] = []
  for (const region of REGIONS) {
    if (region.kind !== 'foreign') continue
    const rs = state.regions[region.id]
    if (!rs?.discovered) continue
    const power = powerOf(region)
    if (!power) continue

    const standing = rs.standing
    const offered = glyphsOffered(power, standing)
    const known = new Set(state.knownGlyphs)

    out.push({
      region,
      power,
      standing,
      tier: standingTier(standing),
      offers: offered.map((g, i) => ({
        glyph: g,
        name: GLYPH_BY_ID[g]?.name ?? g,
        price: glyphPrice(i),
        known: known.has(g),
      })),
      withheld: power.glyphs.length - offered.length,
      claimable: standing >= CLAIM_STANDING && !rs.held,
      held: rs.held,
    })
  }
  return out.sort((a, b) => b.standing - a.standing)
}

export type TutorResult =
  | { ok: true; glyph: string; name: string; spent: number }
  | { ok: false; reason: string }

/**
 * Buy a glyph from a hold's tutors.
 *
 * This is the second route into the rune grammar and the only sink Insight has
 * — digging gives you the words the ground happened to keep, tutors give you the
 * words a people chose to. Price rises steeply with how deep into their
 * tradition you are reaching.
 */
export function learnFromTutor(state: GameState, regionId: RegionId, glyphId: string): TutorResult {
  const region = REGION_BY_ID[regionId]
  if (!region || region.kind !== 'foreign') return { ok: false, reason: 'Nobody there teaches.' }
  const rs = state.regions[regionId]
  if (!rs?.discovered) return { ok: false, reason: 'You have not found that hold.' }
  const power = powerOf(region)
  if (!power) return { ok: false, reason: 'Nobody there teaches.' }

  const offered = glyphsOffered(power, rs.standing)
  const index = offered.indexOf(glyphId)
  if (index === -1) {
    const inTradition = power.glyphs.includes(glyphId)
    return {
      ok: false,
      reason: inTradition
        ? `${power.name} will not teach that yet. Raise your standing.`
        : `${power.name} does not know that word.`,
    }
  }

  if (state.knownGlyphs.includes(glyphId)) return { ok: false, reason: 'You already have that word.' }

  const price = glyphPrice(index)
  if (state.insight < price) return { ok: false, reason: `That costs ${price} insight; you have ${Math.floor(state.insight)}.` }

  state.insight -= price
  state.knownGlyphs.push(glyphId)
  const name = GLYPH_BY_ID[glyphId]?.name ?? glyphId
  state.log.push({ t: state.elapsed, text: `${power.name} teaches you ${name}.` })
  return { ok: true, glyph: glyphId, name, spent: price }
}

export type ClaimResult = { ok: true; name: string } | { ok: false; reason: string }

/** At full standing a hold will treat, and the realm gains a region. */
export function claimHold(state: GameState, regionId: RegionId): ClaimResult {
  const region = REGION_BY_ID[regionId]
  if (!region) return { ok: false, reason: 'No such place.' }
  const rs = state.regions[regionId]
  if (!rs?.discovered) return { ok: false, reason: 'You have not found it.' }
  if (rs.held) return { ok: false, reason: 'Already yours.' }
  if (region.kind === 'foreign' && rs.standing < CLAIM_STANDING) {
    return { ok: false, reason: `They will treat at standing ${CLAIM_STANDING}; you are at ${Math.floor(rs.standing)}.` }
  }
  if (region.kind === 'wild') return { ok: false, reason: 'There is nobody there to treat with.' }

  rs.held = true
  rs.loyalty = Math.max(rs.loyalty, 50)
  rs.prosperity = Math.max(rs.prosperity, 10)
  state.log.push({ t: state.elapsed, text: `${region.name} comes into the holding.` })
  return { ok: true, name: region.name }
}

/**
 * How far a survey can push.
 *
 * A reached hold is a base: you set out from there rather than from home, so
 * each one earned shortens every walk after it. Without this the outer rings
 * would be gated purely on Cartography level, and reaching a people would mean
 * nothing to the map.
 */
export function surveyReachBonus(state: GameState): number {
  let bonus = 0
  for (const region of REGIONS) {
    if (region.kind !== 'foreign') continue
    const rs = state.regions[region.id]
    if (!rs?.discovered) continue
    // Merely finding a hold helps; being welcome there helps more.
    bonus += 3 + Math.floor(rs.standing / 25) * 2
  }
  return bonus
}
