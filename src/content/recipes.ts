import type { RecipeDef } from '@/engine/types'
import { MATERIAL_TIERS } from './materials'
import { forgedItems } from './items'

/**
 * Recipes are derived from the same ladder the items are. Smelting comes first,
 * then forging; alloys (the tier-5 branch and every metal that demands another
 * bar as flux) fall out of `smeltWith` without needing a separate system.
 */

/** Smithing level required to work a given tier. */
function tierLevel(tier: number): number {
  return Math.min(95, Math.round(1 + (tier - 1) * 8.2))
}

export function smeltingRecipes(): RecipeDef[] {
  return MATERIAL_TIERS.map((m) => {
    const inputs = m.ore ? [{ item: m.ore.id, qty: 1 }] : []
    for (const extra of m.smeltWith ?? []) inputs.push({ item: extra.item, qty: extra.qty })
    return {
      id: `smelt_${m.id}`,
      name: `Smelt ${m.name} Bar`,
      skill: 'smithing',
      levelReq: tierLevel(m.tier),
      inputs,
      output: { item: m.id, qty: 1 },
      xp: Math.round(12 * Math.pow(1.55, m.tier - 1)),
      baseTime: 3 + m.tier * 0.35,
      alloy: (m.smeltWith?.length ?? 0) > 0,
    }
  })
}

export function forgingRecipes(): RecipeDef[] {
  const out: RecipeDef[] = []
  const items = forgedItems()

  for (const it of items) {
    const mat = MATERIAL_TIERS.find((m) => it.id.startsWith(m.id.replace(/Bar$/, '') + '_'))
    if (!mat) continue

    const isWeapon = it.category === 'weapon'
    const bars = isWeapon ? (it.speed && it.speed > 1.3 ? 5 : 3) : 3
    const inputs: { item: string; qty: number }[] = [{ item: mat.id, qty: bars }]

    // Hafted and two-handed weapons want timber; light gear wants leather.
    if (isWeapon && it.weaponSkill && ['haft', 'greathaft', 'polearm', 'bow', 'crossbow', 'thrown'].includes(it.weaponSkill)) {
      inputs.push({ item: mat.tier >= 8 ? 'ironbarkLog' : mat.tier >= 5 ? 'ashLog' : mat.tier >= 3 ? 'oakLog' : 'birchLog', qty: 2 })
    }
    if (it.category === 'armour') inputs.push({ item: 'leather', qty: 1 })

    out.push({
      id: `forge_${it.id}`,
      name: `Forge ${it.name}`,
      skill: 'smithing',
      levelReq: tierLevel(mat.tier) + (isWeapon ? 2 : 0),
      inputs,
      output: { item: it.id, qty: 1 },
      xp: Math.round(30 * Math.pow(1.55, mat.tier - 1)),
      baseTime: 5 + mat.tier * 0.6,
    })
  }

  return out
}

/** Hand-authored recipes that do not follow the metal ladder. */
export const CRAFT_RECIPES: RecipeDef[] = [
  { id: 'cure_leather', name: 'Cure Leather', skill: 'leatherworking', levelReq: 1, inputs: [{ item: 'hide', qty: 2 }], output: { item: 'leather', qty: 1 }, xp: 10, baseTime: 3 },
  { id: 'cook_bread', name: 'Bake Bread Ration', skill: 'cooking', levelReq: 1, inputs: [{ item: 'marshHerb', qty: 1 }, { item: 'riverFish', qty: 1 }], output: { item: 'breadRation', qty: 2 }, xp: 9, baseTime: 2.5 },
  { id: 'cook_stew', name: 'Simmer Hearth Stew', skill: 'cooking', levelReq: 18, inputs: [{ item: 'riverFish', qty: 2 }, { item: 'kingsfoil', qty: 1 }], output: { item: 'stew', qty: 1 }, xp: 40, baseTime: 5 },
  { id: 'brew_minor', name: 'Brew Minor Draught', skill: 'alchemy', levelReq: 5, inputs: [{ item: 'marshHerb', qty: 3 }], output: { item: 'minorDraught', qty: 1 }, xp: 22, baseTime: 4 },

  { id: 'cut_blankTablet', name: 'Cut Blank Tablet', skill: 'inscription', levelReq: 1, inputs: [{ item: 'ironBar', qty: 1 }, { item: 'potsherd', qty: 4 }], output: { item: 'blankTablet', qty: 1 }, xp: 25, baseTime: 4 },
  { id: 'make_slateTablet', name: 'Inscribe Slate Tablet', skill: 'inscription', levelReq: 8, inputs: [{ item: 'blankTablet', qty: 1 }, { item: 'marshHerb', qty: 2 }], output: { item: 'slateTablet', qty: 1 }, xp: 60, baseTime: 6 },
  { id: 'make_argentineTablet', name: 'Inscribe Argentine Tablet', skill: 'inscription', levelReq: 45, inputs: [{ item: 'blankTablet', qty: 2 }, { item: 'argentineBar', qty: 3 }, { item: 'gloamCap', qty: 1 }], output: { item: 'argentineTablet', qty: 1 }, xp: 620, baseTime: 12 },
  { id: 'open_sealedTablet', name: 'Open Sealed Tablet', skill: 'inscription', levelReq: 25, inputs: [{ item: 'sealedTablet', qty: 1 }], output: { item: 'blankTablet', qty: 1 }, xp: 300, baseTime: 10 },

  { id: 'carve_copperPick', name: 'Forge Copper Pick', skill: 'smithing', levelReq: 1, inputs: [{ item: 'copperBar', qty: 3 }, { item: 'birchLog', qty: 1 }], output: { item: 'copperPick', qty: 1 }, xp: 28, baseTime: 4 },
  { id: 'carve_copperAxe', name: 'Forge Copper Felling Axe', skill: 'smithing', levelReq: 1, inputs: [{ item: 'copperBar', qty: 3 }, { item: 'birchLog', qty: 1 }], output: { item: 'copperAxe', qty: 1 }, xp: 28, baseTime: 4 },
  { id: 'carve_steelPick', name: 'Forge Steel Pick', skill: 'smithing', levelReq: 26, inputs: [{ item: 'steelBar', qty: 4 }, { item: 'oakLog', qty: 2 }], output: { item: 'steelPick', qty: 1 }, xp: 150, baseTime: 7 },
  { id: 'carve_steelAxe', name: 'Forge Steel Felling Axe', skill: 'smithing', levelReq: 26, inputs: [{ item: 'steelBar', qty: 4 }, { item: 'oakLog', qty: 2 }], output: { item: 'steelAxe', qty: 1 }, xp: 150, baseTime: 7 },
  { id: 'carve_trowel', name: "Forge Surveyor's Trowel", skill: 'smithing', levelReq: 10, inputs: [{ item: 'bronzeBar', qty: 2 }, { item: 'birchLog', qty: 1 }], output: { item: 'trowel', qty: 1 }, xp: 55, baseTime: 5 },

  { id: 'make_oakenCharm', name: 'Carve Oaken Charm', skill: 'woodworking', levelReq: 6, inputs: [{ item: 'oakLog', qty: 3 }, { item: 'marshHerb', qty: 1 }], output: { item: 'oakenCharm', qty: 1 }, xp: 45, baseTime: 5 },
  { id: 'make_signetRing', name: 'Cast Signet Ring', skill: 'smithing', levelReq: 30, inputs: [{ item: 'steelBar', qty: 2 }, { item: 'silverOre', qty: 1 }], output: { item: 'signetRing', qty: 1 }, xp: 200, baseTime: 8 },
]

let cache: RecipeDef[] | null = null

export function allRecipes(): RecipeDef[] {
  if (!cache) cache = [...smeltingRecipes(), ...forgingRecipes(), ...CRAFT_RECIPES]
  return cache
}

let byId: Record<string, RecipeDef> | null = null

export function recipeById(id: string): RecipeDef | undefined {
  if (!byId) byId = Object.fromEntries(allRecipes().map((r) => [r.id, r]))
  return byId[id]
}
