/**
 * Every tuning constant and curve in one file.
 *
 * Ballot IX-A commits us to grounded numbers: damage in the hundreds to low
 * millions across the whole game, with progression expressed through tiers,
 * unlocks and breadth rather than exponents. Nothing here should ever produce a
 * figure that needs scientific notation.
 */

export const MAX_LEVEL = 99

/** Parent combat skills receive this on top of what the child earns — created,
 *  never divided. Splitting would make every weapon swap feel like a tax. */
export const PARENT_XP_SHARE = 0.3

/** A child may not exceed its parent by more than this. The quiet engine of
 *  breadth: pushing a favourite weapon higher runs through its siblings. */
export const CHILD_LEVEL_LEAD = 10

/** Background retinue work runs at this fraction of the focused rate and rolls
 *  only common yields. Tuned so an attentive hour is worth ~1.8x an idle one. */
export const RETINUE_RATE = 0.35

/** Ballot II-A. Raisable to 36h through the realm layer. */
export const OFFLINE_CAP_SECONDS = 12 * 3600

/** Fixed simulation step. The engine is only ever advanced in whole steps, which
 *  is what makes a replay of the same seed produce the same save. */
export const TICK_SECONDS = 0.2

/** Offline catch-up runs in coarser steps — same code path, bigger stride. */
export const CATCHUP_STEP_SECONDS = 5

// ------------------------------------------------------------------ progression

/** Cumulative XP required to reach `level`. Power law, exponent 2.2. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let l = 1; l < level; l++) total += Math.round(80 * Math.pow(l, 2.2))
  return total
}

const XP_TABLE: number[] = (() => {
  const t: number[] = [0]
  let total = 0
  for (let l = 1; l <= MAX_LEVEL; l++) {
    t.push(total)
    total += Math.round(80 * Math.pow(l, 2.2))
  }
  return t
})()

export function levelForXp(xp: number): number {
  let lvl = 1
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if (xp >= (XP_TABLE[l] ?? Infinity)) lvl = l
    else break
  }
  return lvl
}

/** Cumulative XP at the start of `level`, from the precomputed table. */
export function xpAtLevel(level: number): number {
  return XP_TABLE[Math.min(Math.max(level, 1), MAX_LEVEL)] ?? 0
}

export function xpProgress(xp: number): { level: number; into: number; needed: number; pct: number } {
  const level = levelForXp(xp)
  if (level >= MAX_LEVEL) return { level, into: 0, needed: 0, pct: 1 }
  const base = xpAtLevel(level)
  const next = xpAtLevel(level + 1)
  const into = xp - base
  const needed = next - base
  return { level, into, needed, pct: needed > 0 ? into / needed : 1 }
}

// ---------------------------------------------------------------------- speed

/** Actions get faster with skill, capped at a 60% reduction so late levels
 *  still improve something without collapsing the loop to zero. */
export function actionTime(baseSeconds: number, level: number, toolSpeed = 1): number {
  const reduction = Math.min(0.6, level * 0.005)
  return Math.max(0.25, baseSeconds * (1 - reduction) * toolSpeed)
}

// ------------------------------------------------------------------- materials

/** Power climbs 1.75x per tier while cost climbs 2.30x — each rung is a real
 *  jump that takes visibly longer to reach (ballot VII-B). */
export function materialPower(tier: number): number {
  return 10 * Math.pow(1.75, tier - 1)
}

export function materialCost(tier: number): number {
  return Math.pow(2.3, tier - 1)
}

// -------------------------------------------------------------------- quality

import type { QualityDef, QualityId } from './types'

export const QUALITIES: Record<QualityId, QualityDef> = {
  crude: { id: 'crude', name: 'Crude', mult: 0.8, affixSlots: 0 },
  common: { id: 'common', name: 'Common', mult: 1.0, affixSlots: 0 },
  fine: { id: 'fine', name: 'Fine', mult: 1.15, affixSlots: 0 },
  superior: { id: 'superior', name: 'Superior', mult: 1.3, affixSlots: 0 },
  masterwork: { id: 'masterwork', name: 'Masterwork', mult: 1.5, affixSlots: 0 },
  legendary: { id: 'legendary', name: 'Legendary', mult: 1.75, affixSlots: 1 },
}

export const QUALITY_ORDER: QualityId[] = ['crude', 'common', 'fine', 'superior', 'masterwork', 'legendary']

/**
 * Quality is rolled from how far the smith's level exceeds the recipe's
 * requirement. This is what keeps early tiers alive: a Masterwork Steel blade
 * (T4 x 1.5 = 80) out-cuts a Crude Mithral one (T7 x 0.8 = 230... at T4 vs T7
 * the tier still wins, but within two tiers quality decides), so there is a
 * reason to keep mining a metal you have technically outgrown.
 */
export function rollQuality(skillLevel: number, recipeLevel: number, roll: number): QualityId {
  const margin = Math.max(0, skillLevel - recipeLevel)
  // Chance mass shifts up the ladder as margin grows.
  const legendary = Math.min(0.05, margin * 0.0012)
  const masterwork = Math.min(0.18, margin * 0.005)
  const superior = Math.min(0.3, margin * 0.011)
  const fine = Math.min(0.35, 0.1 + margin * 0.014)
  const crude = Math.max(0, 0.25 - margin * 0.02)

  let r = roll
  if (r < legendary) return 'legendary'
  r -= legendary
  if (r < masterwork) return 'masterwork'
  r -= masterwork
  if (r < superior) return 'superior'
  r -= superior
  if (r < fine) return 'fine'
  r -= fine
  if (r < crude) return 'crude'
  return 'common'
}

// --------------------------------------------------------------------- combat

/** Armour gives diminishing returns rather than a hard wall, so no build is
 *  ever locked out of a fight it is merely under-geared for. */
export function damageAfterArmour(raw: number, armour: number): number {
  const mitigation = armour / (armour + 60)
  return Math.max(1, raw * (1 - mitigation))
}

/** Character vitals scale off levels so an unequipped character is still viable. */
export function maxHealth(vitalityLevel: number, bonus: number): number {
  return Math.round(60 + vitalityLevel * 8 + bonus)
}

export function maxStamina(level: number, bonus: number): number {
  return Math.round(50 + level * 3 + bonus)
}

export function maxMana(sorceryLevel: number, bonus: number): number {
  return Math.round(40 + sorceryLevel * 5 + bonus)
}

// ------------------------------------------------------------------ succession

/** Ballot III-A. Characters age one year per this many simulated seconds. */
export const SECONDS_PER_YEAR = 1800

export const STARTING_AGE = 17

/** Succession becomes available here, and grows pressing beyond it. */
export const RETIREMENT_AGE = 60

/** Fraction of each skill's XP an heir inherits, before bloodline bonuses. */
export const INHERITANCE_RATE = 0.25
