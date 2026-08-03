import { SKILL_BY_ID, SKILLS } from './skills'
import { allItems, itemById } from './items'
import { allRecipes, recipeById } from './recipes'
import { REGIONS, REGION_BY_ID, findNode, regionOfSite, hexDistance, ringOf } from './regions'
import { GLYPHS, GLYPH_BY_ID, STARTING_GLYPHS } from './glyphs'
import { FOES, FOE_BY_ID, TECHNIQUES, TECHNIQUE_BY_ID } from './foes'
import { LORE } from './lore'
import { TABLETS } from '@/engine/archaeology'
import { POWERS, POWER_BY_ID, STANDING_TIERS, TUTOR_ONLY_GLYPHS } from './powers'

export * from './skills'
export * from './items'
export * from './materials'
export * from './recipes'
export * from './regions'
export * from './glyphs'
export * from './foes'
export * from './lore'
export * from './siteKit'
export * from './powers'

/**
 * Referential integrity check across the content packs.
 *
 * The whole point of content-as-data is that a designer adds a tier or a region
 * without touching engine code. The cost of that is a class of typo the compiler
 * cannot see, so the packs get validated instead — in tests always, and in the
 * dev build at boot.
 */
export function validateContent(): string[] {
  const errors: string[] = []
  const items = new Set(allItems().map((i) => i.id))
  const skills = new Set(SKILLS.map((s) => s.id))

  const requireItem = (id: string, where: string) => {
    if (!items.has(id)) errors.push(`${where}: unknown item "${id}"`)
  }
  const requireSkill = (id: string, where: string) => {
    if (!skills.has(id)) errors.push(`${where}: unknown skill "${id}"`)
  }

  for (const s of SKILLS) {
    if (s.parent && !skills.has(s.parent)) errors.push(`skill ${s.id}: unknown parent "${s.parent}"`)
    if (s.kind === 'combat-child' && !s.parent) errors.push(`skill ${s.id}: combat child with no parent`)
  }

  const seenItems = new Set<string>()
  for (const i of allItems()) {
    if (seenItems.has(i.id)) errors.push(`duplicate item id "${i.id}"`)
    seenItems.add(i.id)
    if (i.weaponSkill) requireSkill(i.weaponSkill, `item ${i.id}`)
  }

  const seenRecipes = new Set<string>()
  for (const r of allRecipes()) {
    if (seenRecipes.has(r.id)) errors.push(`duplicate recipe id "${r.id}"`)
    seenRecipes.add(r.id)
    requireSkill(r.skill, `recipe ${r.id}`)
    for (const inp of r.inputs) requireItem(inp.item, `recipe ${r.id} input`)
    requireItem(r.output.item, `recipe ${r.id} output`)
    if (r.inputs.length === 0) errors.push(`recipe ${r.id}: no inputs`)
  }

  const seenRegions = new Set<string>()
  const seenCoords = new Set<string>()
  const seenSites = new Set<string>()
  const seenLayers = new Set<string>()

  for (const region of REGIONS) {
    if (seenRegions.has(region.id)) errors.push(`duplicate region id "${region.id}"`)
    seenRegions.add(region.id)

    // Two regions on one hex would make the chart unrenderable and one of them
    // unreachable, so this is worth catching at build time.
    const coordKey = `${region.coord.q},${region.coord.r}`
    if (seenCoords.has(coordKey)) errors.push(`region ${region.id}: coordinate ${coordKey} already occupied`)
    seenCoords.add(coordKey)

    if (region.sites.length === 0) errors.push(`region ${region.id}: no sites`)

    for (const s of region.sites) {
      if (seenSites.has(s.id)) errors.push(`duplicate site id "${s.id}"`)
      seenSites.add(s.id)
      requireSkill(s.skill, `site ${s.id}`)
      if (s.layers.length === 0) errors.push(`site ${s.id}: no layers`)
      if (s.pos.x < 0 || s.pos.x > 1 || s.pos.y < 0 || s.pos.y > 1) {
        errors.push(`site ${s.id}: pos out of the 0..1 locale square`)
      }

      let lastReq = -1
      for (const l of s.layers) {
        if (seenLayers.has(l.id)) errors.push(`duplicate layer id "${l.id}"`)
        seenLayers.add(l.id)
        for (const y of l.yields) requireItem(y.item, `layer ${l.id} yield`)
        for (const f of l.foes ?? []) {
          if (!FOE_BY_ID[f]) errors.push(`layer ${l.id}: unknown foe "${f}"`)
        }
        if (l.yields.length === 0) errors.push(`layer ${l.id}: no yields`)
        // Depth must go down, or the UI's "descend" reads as a lie.
        if (l.levelReq <= lastReq) errors.push(`layer ${l.id}: level requirement does not increase with depth`)
        lastReq = l.levelReq
      }
    }
  }

  for (const f of FOES) {
    for (const d of f.drops) requireItem(d.item, `foe ${f.id} drop`)
  }

  for (const t of TECHNIQUES) requireSkill(t.skill, `technique ${t.id}`)

  for (const g of GLYPHS) {
    if (g.kind === 'form' && g.power < 1) errors.push(`glyph ${g.id}: forms set the base power and must be >= 1`)
  }

  // Every glyph must be reachable somehow — dug up within some tablet's ceiling,
  // taught by a power, or known from the start. A word reachable by neither
  // route is a dead entry in the grammar.
  const ceiling = Math.max(...TABLETS.map((t) => t.glyphCeiling))
  const taught = new Set(POWERS.flatMap((p) => p.glyphs))
  for (const g of GLYPHS) {
    const diggable = g.levelReq <= ceiling && !TUTOR_ONLY_GLYPHS.has(g.id)
    if (!diggable && !taught.has(g.id) && !STARTING_GLYPHS.includes(g.id)) {
      errors.push(`glyph ${g.id}: cannot be dug up, taught, or started with`)
    }
  }

  // Same for lore: an age with no entries means tablets of that age roll an
  // outcome that cannot pay out.
  for (const t of TABLETS) {
    if (!LORE.some((l) => l.age === t.age)) errors.push(`tablet ${t.item}: no lore of age "${t.age}"`)
    if (!allItems().some((i) => i.id === t.item)) errors.push(`tablet ${t.item}: no such item`)
  }

  // ------------------------------------------------------------- the powers
  const glyphIds = new Set(GLYPHS.map((g) => g.id))
  const holdsPerPower = new Map<string, number>()
  for (const region of REGIONS) {
    if (region.kind !== 'foreign') continue
    if (!region.power || !POWER_BY_ID[region.power]) {
      errors.push(`region ${region.id}: foreign hold with no valid power`)
      continue
    }
    holdsPerPower.set(region.power, (holdsPerPower.get(region.power) ?? 0) + 1)
  }

  for (const p of POWERS) {
    requireItem(p.material.id, `power ${p.id} material`)
    for (const g of p.goods) requireItem(g, `power ${p.id} goods`)
    for (const g of p.glyphs) {
      if (!glyphIds.has(g)) errors.push(`power ${p.id}: unknown glyph "${g}"`)
    }
    // A power with no hold on the map teaches nobody and trades with nobody.
    if (!holdsPerPower.get(p.id)) errors.push(`power ${p.id}: no hold anywhere on the map`)
    // Standing tops out at 100, which teaches at most STANDING_TIERS' last tier.
    const maxTeach = STANDING_TIERS[STANDING_TIERS.length - 1]!.teaches
    if (p.glyphs.length > maxTeach) {
      errors.push(`power ${p.id}: teaches ${p.glyphs.length} glyphs but standing only ever opens ${maxTeach}`)
    }
  }

  // Rings 3-5 must each carry both settled ground and wilds; that interspersal
  // is what makes the far map feel like distance rather than a gradient.
  for (const ring of [3, 4, 5]) {
    const inRing = REGIONS.filter((r) => ringOf(r) === ring)
    const settled = inRing.filter((r) => r.kind !== 'wild').length
    const wild = inRing.filter((r) => r.kind === 'wild').length
    if (settled === 0) errors.push(`ring ${ring}: no settled ground`)
    if (wild === 0) errors.push(`ring ${ring}: no wilds`)
  }

  return errors
}

export const CONTENT = {
  skills: SKILLS,
  skillById: SKILL_BY_ID,
  items: allItems,
  itemById,
  recipes: allRecipes,
  recipeById,
  regions: REGIONS,
  regionById: REGION_BY_ID,
  findNode,
  regionOfSite,
  hexDistance,
  ringOf,
  glyphs: GLYPHS,
  glyphById: GLYPH_BY_ID,
  foes: FOES,
  foeById: FOE_BY_ID,
  techniques: TECHNIQUES,
  techniqueById: TECHNIQUE_BY_ID,
}
