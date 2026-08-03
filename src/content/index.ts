import { SKILL_BY_ID, SKILLS } from './skills'
import { allItems, itemById } from './items'
import { allRecipes, recipeById } from './recipes'
import { REGIONS, REGION_BY_ID, findNode } from './regions'
import { GLYPHS, GLYPH_BY_ID } from './glyphs'
import { FOES, FOE_BY_ID, TECHNIQUES, TECHNIQUE_BY_ID } from './foes'

export * from './skills'
export * from './items'
export * from './materials'
export * from './recipes'
export * from './regions'
export * from './glyphs'
export * from './foes'

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

  const seenNodes = new Set<string>()
  for (const region of REGIONS) {
    for (const n of region.nodes) {
      if (seenNodes.has(n.id)) errors.push(`duplicate node id "${n.id}"`)
      seenNodes.add(n.id)
      requireSkill(n.skill, `node ${n.id}`)
      for (const y of n.yields) requireItem(y.item, `node ${n.id} yield`)
      for (const f of n.foes ?? []) {
        if (!FOE_BY_ID[f]) errors.push(`node ${n.id}: unknown foe "${f}"`)
      }
      if (n.yields.length === 0) errors.push(`node ${n.id}: no yields`)
    }
  }

  for (const f of FOES) {
    for (const d of f.drops) requireItem(d.item, `foe ${f.id} drop`)
  }

  for (const t of TECHNIQUES) requireSkill(t.skill, `technique ${t.id}`)

  for (const g of GLYPHS) {
    if (g.kind === 'form' && g.power < 1) errors.push(`glyph ${g.id}: forms set the base power and must be >= 1`)
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
  glyphs: GLYPHS,
  glyphById: GLYPH_BY_ID,
  foes: FOES,
  foeById: FOE_BY_ID,
  techniques: TECHNIQUES,
  techniqueById: TECHNIQUE_BY_ID,
}
