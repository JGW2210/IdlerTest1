import type { GameState, RegionDef, RegionId } from './types'
import type { Rng } from './rng'
import { pickWeighted } from './rng'
import { REGIONS, hexDistance } from '@/content/regions'
import { levelOf } from './skills'
import { surveyReachBonus } from './diplomacy'

/**
 * Surveying (Cartography).
 *
 * The map is a chart your character is drawing, so it only grows where someone
 * has walked. A survey does two things: it finishes the outline of somewhere you
 * already know, and once a region is fully surveyed it inks in a new one beyond it.
 *
 * `surveyed` is not just bookkeeping — the chart renderer reads it directly, so
 * a half-surveyed region is literally drawn in a vaguer hand. Progress is
 * visible on the map itself rather than in a number somewhere.
 */

/** Regions adjacent to something you already know, that you could reach next. */
export function frontier(state: GameState): RegionDef[] {
  const known = REGIONS.filter((r) => state.regions[r.id]?.discovered)
  const out: RegionDef[] = []
  for (const candidate of REGIONS) {
    const rs = state.regions[candidate.id]
    if (!rs || rs.discovered) continue
    if (known.some((k) => hexDistance(k.coord, candidate.coord) === 1)) out.push(candidate)
  }
  return out
}

/** The next region a survey could reveal, given Cartography level. */
export function surveyTargets(state: GameState): { region: RegionDef; reachable: boolean }[] {
  // A reached foreign hold is a base you set out from, so every hold earned
  // shortens the walk to everywhere past it.
  const reach = levelOf(state, 'cartography') + surveyReachBonus(state)
  return frontier(state)
    .map((region) => ({ region, reachable: reach >= (region.scoutLevelReq ?? 0) }))
    .sort((a, b) => (a.region.scoutLevelReq ?? 0) - (b.region.scoutLevelReq ?? 0))
}

/** Effective survey reach: Cartography plus what the holds add. */
export function surveyReach(state: GameState): number {
  return levelOf(state, 'cartography') + surveyReachBonus(state)
}

/** Discovered regions that are not yet fully drawn. */
export function unfinishedRegions(state: GameState): RegionDef[] {
  return REGIONS.filter((r) => {
    const rs = state.regions[r.id]
    return rs?.discovered && rs.surveyed < 1
  })
}

export interface SurveyResult {
  kind: 'detail' | 'discovery' | 'blocked'
  region?: RegionId
  name?: string
  reason?: string
}

/**
 * One completed survey action. Fills in known ground first, then pushes outward
 * — so the chart is finished behind you before it grows ahead of you, and the
 * player is never looking at a map of half-drawn holes.
 */
export function survey(state: GameState, rng: Rng): SurveyResult {
  const unfinished = unfinishedRegions(state)
  if (unfinished.length) {
    // Nearer ground fills in faster; the far frontier stays sketchy longer.
    const weighted = unfinished.map((r) => ({
      item: r,
      weight: Math.max(1, 10 - hexDistance(r.coord, { q: 0, r: 0 })),
    }))
    const target = pickWeighted(rng, weighted) ?? unfinished[0]!
    const rs = state.regions[target.id]!
    const carto = levelOf(state, 'cartography')
    // A better cartographer finishes a sheet in fewer passes.
    rs.surveyed = Math.min(1, rs.surveyed + 0.16 + carto * 0.003)
    return { kind: 'detail', region: target.id, name: target.name }
  }

  const targets = surveyTargets(state).filter((t) => t.reachable)
  if (!targets.length) {
    const next = surveyTargets(state)[0]
    return {
      kind: 'blocked',
      reason: next
        ? `The way on needs a reach of ${next.region.scoutLevelReq}; yours is ${surveyReach(state)}.`
        : 'Nothing left within reach to survey.',
    }
  }

  const chosen = targets[0]!.region
  const rs = state.regions[chosen.id]!
  rs.discovered = true
  rs.surveyed = 0.2
  return { kind: 'discovery', region: chosen.id, name: chosen.name }
}

/** Seconds per survey action. Slow work — this is meant to be a commitment. */
export function surveyTime(state: GameState): number {
  const carto = levelOf(state, 'cartography')
  return Math.max(4, 14 - carto * 0.07)
}

export function surveyXp(state: GameState): number {
  const carto = levelOf(state, 'cartography')
  return Math.round(30 * Math.pow(1.045, carto))
}
