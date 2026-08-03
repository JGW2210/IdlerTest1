import type { NodeActivity, SiteDef, SiteIcon, SiteLayer, SkillId } from '@/engine/types'

/**
 * Builders for region content.
 *
 * Thirty-seven authored regions with layered sites is a lot of literal object
 * soup, so the shapes that repeat — a mine with galleries, a wood with stands, a
 * dig with strata — get a builder. The region file then reads as geography
 * rather than as data entry, and every site lands on the same curve.
 */

export interface YieldSpec {
  item: string
  qty?: [number, number]
  weight: number
}

let autoLayer = 0

export function layer(
  name: string,
  levelReq: number,
  yields: YieldSpec[],
  opts: { time?: number; xp?: number; foes?: string[]; strata?: number; blurb?: string; id?: string } = {},
): SiteLayer {
  autoLayer += 1
  return {
    id: opts.id ?? `L${autoLayer}`,
    name,
    levelReq,
    // Deeper work is slower and worth more. Both scale off the level gate so a
    // layer's cost and payout stay in step without being restated every time.
    baseTime: opts.time ?? +(3 + levelReq * 0.055).toFixed(2),
    xp: opts.xp ?? Math.round(6 * Math.pow(1.062, levelReq)),
    yields: yields.map((y) => ({ item: y.item, qty: y.qty ?? [1, 2], weight: y.weight })),
    ...(opts.foes ? { foes: opts.foes } : {}),
    ...(opts.strata !== undefined ? { strata: opts.strata } : {}),
    ...(opts.blurb ? { blurb: opts.blurb } : {}),
  }
}

export function site(
  id: string,
  name: string,
  spec: {
    activity: NodeActivity
    skill: SkillId
    icon: SiteIcon
    pos: [number, number]
    blurb?: string
  },
  layers: SiteLayer[],
): SiteDef {
  return {
    id,
    name,
    activity: spec.activity,
    skill: spec.skill,
    icon: spec.icon,
    pos: { x: spec.pos[0], y: spec.pos[1] },
    ...(spec.blurb ? { blurb: spec.blurb } : {}),
    // Layer ids are namespaced by their site so two mines may both have an
    // "Upper Gallery" without colliding in the save.
    layers: layers.map((l, i) => ({ ...l, id: `${id}_${i + 1}` })),
  }
}

// ------------------------------------------------------------- common shapes

export function mine(id: string, name: string, pos: [number, number], galleries: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'gather', skill: 'mining', icon: 'mine', pos, ...(blurb ? { blurb } : {}) }, galleries)
}

export function wood(id: string, name: string, pos: [number, number], stands: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'gather', skill: 'forestry', icon: 'tree', pos, ...(blurb ? { blurb } : {}) }, stands)
}

export function forage(id: string, name: string, pos: [number, number], patches: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'gather', skill: 'foraging', icon: 'field', pos, ...(blurb ? { blurb } : {}) }, patches)
}

export function water(id: string, name: string, pos: [number, number], swims: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'gather', skill: 'fishing', icon: 'water', pos, ...(blurb ? { blurb } : {}) }, swims)
}

export function dig(id: string, name: string, pos: [number, number], strata: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'excavate', skill: 'archaeology', icon: 'ruin', pos, ...(blurb ? { blurb } : {}) }, strata)
}

export function lair(id: string, name: string, pos: [number, number], floors: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'hunt', skill: 'oneHanded', icon: 'camp', pos, ...(blurb ? { blurb } : {}) }, floors)
}

export function delve(id: string, name: string, pos: [number, number], floors: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'delve', skill: 'oneHanded', icon: 'cave', pos, ...(blurb ? { blurb } : {}) }, floors)
}

export function market(id: string, name: string, pos: [number, number], stalls: SiteLayer[], blurb?: string) {
  return site(id, name, { activity: 'trade', skill: 'commerce', icon: 'market', pos, ...(blurb ? { blurb } : {}) }, stalls)
}

/**
 * Strata for a dig. Each step down is an age older, and older strata carry the
 * rarer tablets — which is the whole reason Archaeology is worth a skill slot.
 */
export function strata(
  entries: { name: string; levelReq: number; age: number; yields: YieldSpec[]; blurb?: string }[],
): SiteLayer[] {
  return entries.map((e) =>
    layer(e.name, e.levelReq, e.yields, { strata: e.age, ...(e.blurb ? { blurb: e.blurb } : {}) }),
  )
}
