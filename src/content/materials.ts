import type { ItemDef } from '@/engine/types'
import { materialPower, materialCost } from '@/engine/curves'

/**
 * The material ladder (ballot VII-B).
 *
 * `tier` controls *access*. Within tier 5 sit three co-equal alloys with
 * distinct profiles rather than a rung each — the brief's "special steel
 * variants", promoted from flavour into a real system. Quality supplies the
 * third axis and is rolled at the forge, not authored here.
 *
 * Tiers 13+ are the relic stratum: not craftable at any Smithing level, sourced
 * only from dungeon depths, excavations and world events.
 */

export interface MaterialTier {
  tier: number
  /** Bar / refined form. */
  id: string
  name: string
  /** Ore or raw form, where one exists. */
  ore?: { id: string; name: string; miningLevel: number }
  /** Extra inputs the smelt needs beyond its own ore. */
  smeltWith?: { item: string; qty: number }[]
  /** What this material is unusually good at. Drives the stat profile. */
  profile: 'balanced' | 'heavy' | 'keen' | 'arcane' | 'warded' | 'swift'
  blurb: string
}

export const MATERIAL_TIERS: MaterialTier[] = [
  {
    tier: 1, id: 'copperBar', name: 'Copper', profile: 'balanced',
    ore: { id: 'copperOre', name: 'Copper Ore', miningLevel: 1 },
    blurb: 'Soft, forgiving, and the only thing a village smith will let an apprentice ruin.',
  },
  {
    tier: 2, id: 'bronzeBar', name: 'Bronze', profile: 'balanced',
    ore: { id: 'tinOre', name: 'Tin Ore', miningLevel: 5 },
    smeltWith: [{ item: 'copperOre', qty: 2 }],
    blurb: 'Copper and tin. The first alloy, and the first lesson that mixing beats mining.',
  },
  {
    tier: 3, id: 'ironBar', name: 'Iron', profile: 'balanced',
    ore: { id: 'ironOre', name: 'Iron Ore', miningLevel: 12 },
    blurb: 'Harder than bronze and far more sullen in the fire.',
  },
  {
    tier: 4, id: 'steelBar', name: 'Steel', profile: 'balanced',
    smeltWith: [{ item: 'ironOre', qty: 2 }, { item: 'coal', qty: 2 }],
    blurb: 'Iron taught to hold an edge. Everything after this is a variation on the argument.',
  },
  {
    tier: 5, id: 'blacksteelBar', name: 'Blacksteel', profile: 'heavy',
    smeltWith: [{ item: 'steelBar', qty: 2 }, { item: 'shadowash', qty: 1 }],
    blurb: 'Quenched in shadowash. Heavy, dark, and contemptuous of other people’s armour.',
  },
  {
    tier: 5, id: 'sunsteelBar', name: 'Sunsteel', profile: 'keen',
    smeltWith: [{ item: 'steelBar', qty: 2 }, { item: 'emberstone', qty: 1 }],
    blurb: 'Folded around emberstone. Keeps an edge that bites well past reason.',
  },
  {
    tier: 5, id: 'frostironBar', name: 'Frostiron', profile: 'swift',
    smeltWith: [{ item: 'steelBar', qty: 2 }, { item: 'rimeSalt', qty: 1 }],
    blurb: 'Cold-worked and unnaturally light. A blade that arrives before you decide to swing it.',
  },
  {
    tier: 6, id: 'argentineBar', name: 'Argentine', profile: 'arcane',
    ore: { id: 'silverOre', name: 'Silver Ore', miningLevel: 40 },
    smeltWith: [{ item: 'steelBar', qty: 1 }],
    blurb: 'Silver-bound steel. The first metal that will hold an inscription without spitting it out.',
  },
  {
    tier: 7, id: 'mithralBar', name: 'Mithral', profile: 'swift',
    ore: { id: 'mithralOre', name: 'Mithral Ore', miningLevel: 50 },
    blurb: 'Light as cloth, hard as grievance. Found only where the deep seams turn pale.',
  },
  {
    tier: 8, id: 'adamantBar', name: 'Adamant', profile: 'heavy',
    ore: { id: 'adamantOre', name: 'Adamant Ore', miningLevel: 60 },
    smeltWith: [{ item: 'coal', qty: 4 }],
    blurb: 'It does not bend. Persuading it to take a shape at all is the craft.',
  },
  {
    tier: 9, id: 'orichalcumBar', name: 'Orichalcum', profile: 'arcane',
    ore: { id: 'orichalcumOre', name: 'Orichalcum Ore', miningLevel: 70 },
    smeltWith: [{ item: 'argentineBar', qty: 1 }],
    blurb: 'The mountain-copper of the drowned cities. Hums faintly when a spell passes near.',
  },
  {
    tier: 10, id: 'voidironBar', name: 'Voidiron', profile: 'warded',
    ore: { id: 'voidironOre', name: 'Voidiron Ore', miningLevel: 78 },
    smeltWith: [{ item: 'orichalcumBar', qty: 1 }],
    blurb: 'Will not melt in an ordinary fire. Requires a forge that has been spoken to.',
  },
  {
    tier: 11, id: 'meteoricBar', name: 'Meteoric', profile: 'keen',
    ore: { id: 'meteoricIron', name: 'Meteoric Iron', miningLevel: 85 },
    blurb: 'Fallen, not mined. Arrives on the map as an event and is gone by the next season.',
  },
  {
    tier: 12, id: 'aurelithBar', name: 'Aurelith', profile: 'arcane',
    ore: { id: 'aurelithOre', name: 'Aurelith Ore', miningLevel: 92 },
    smeltWith: [{ item: 'voidironBar', qty: 1 }, { item: 'meteoricBar', qty: 1 }],
    blurb: 'The craft ceiling. Everything past this must be found rather than made.',
  },
]

/** Relic stratum — tier 13+, never craftable (ballot VII-B). */
export const RELICS: { id: string; name: string; tier: number; blurb: string }[] = [
  { id: 'dragonbone', name: 'Dragonbone', tier: 13, blurb: 'Still warm. Holds an edge no forge could grind.' },
  { id: 'heartwood', name: 'Heartwood of the First Oak', tier: 13, blurb: 'Older than the kingdom that named it.' },
  { id: 'sanguineCrystal', name: 'Sanguine Crystal', tier: 14, blurb: 'Pays for its power in something other than mana.' },
  { id: 'faeglass', name: 'Fae-glass', tier: 14, blurb: 'Weighs nothing and cuts the idea of a thing as readily as the thing.' },
  { id: 'angelsteel', name: 'Angelsteel', tier: 15, blurb: 'Refuses to harm the innocent, which is occasionally inconvenient.' },
  { id: 'chronite', name: 'Chronite', tier: 15, blurb: 'The swing lands slightly before it is thrown.' },
]

/** Non-metal raw materials the ladder depends on. */
export const RAW_MATERIALS: ItemDef[] = [
  { id: 'coal', name: 'Coal', category: 'material', tier: 2, value: 4, stack: true, blurb: 'The difference between iron and steel.' },
  { id: 'shadowash', name: 'Shadowash', category: 'material', tier: 5, value: 90, stack: true, blurb: 'Scraped from the walls of Barrowdeep where the torches will not catch.' },
  { id: 'emberstone', name: 'Emberstone', category: 'material', tier: 5, value: 90, stack: true, blurb: 'Warm to the touch a century after it left the fire.' },
  { id: 'rimeSalt', name: 'Rime Salt', category: 'material', tier: 5, value: 90, stack: true, blurb: 'Forms only on stone that has never seen the sun.' },

  { id: 'birchLog', name: 'Birch Log', category: 'material', tier: 1, value: 3, stack: true },
  { id: 'oakLog', name: 'Oak Log', category: 'material', tier: 3, value: 12, stack: true },
  { id: 'ashLog', name: 'Ash Log', category: 'material', tier: 5, value: 45, stack: true, blurb: 'The only timber a decent polearm haft is cut from.' },
  { id: 'ironbarkLog', name: 'Ironbark Log', category: 'material', tier: 8, value: 320, stack: true },

  { id: 'hide', name: 'Raw Hide', category: 'material', tier: 1, value: 5, stack: true },
  { id: 'leather', name: 'Cured Leather', category: 'material', tier: 2, value: 14, stack: true },

  { id: 'marshHerb', name: 'Marsh Herb', category: 'material', tier: 1, value: 6, stack: true },
  { id: 'kingsfoil', name: "King's Foil", category: 'material', tier: 4, value: 55, stack: true },
  { id: 'gloamCap', name: 'Gloam Cap', category: 'material', tier: 6, value: 180, stack: true, blurb: 'Grows only in the dark, and only on something that used to be alive.' },

  { id: 'riverFish', name: 'River Fish', category: 'material', tier: 1, value: 4, stack: true },

  { id: 'potsherd', name: 'Potsherd', category: 'material', tier: 1, value: 2, stack: true, blurb: 'Worthless alone. Twenty of them are a floor plan.' },
  // The three tablet ages. Deeper strata yield older tablets, and older tablets
  // carry the rarer glyphs — the whole reason to keep digging down.
  { id: 'sealedTablet', name: 'Sealed Tablet', category: 'material', tier: 6, value: 400, stack: true, blurb: 'Second Age. Unread for nine hundred years, and Inscription will open it.' },
  { id: 'elderTablet', name: 'Elder Tablet', category: 'material', tier: 9, value: 2400, stack: true, blurb: 'Elder Age. The script runs the wrong way and the stone resists the chisel.' },
  { id: 'firstAgeTablet', name: 'First Age Tablet', category: 'material', tier: 12, value: 14000, stack: true, blurb: 'First Age. Older than the language anyone still speaks, and warm to the touch.' },
  { id: 'blankTablet', name: 'Blank Rune Tablet', category: 'material', tier: 3, value: 60, stack: true, blurb: 'Argentine-faced slate, waiting for a sentence.' },
]

export const MATERIAL_BY_ID: Record<string, MaterialTier> = Object.fromEntries(MATERIAL_TIERS.map((m) => [m.id, m]))

/** Bars, ores and relics as ItemDefs, derived from the ladder above. */
export function materialItems(): ItemDef[] {
  const out: ItemDef[] = []
  for (const m of MATERIAL_TIERS) {
    out.push({
      id: m.id,
      name: `${m.name} Bar`,
      category: 'material',
      tier: m.tier,
      value: Math.round(materialCost(m.tier) * 6),
      stack: true,
      blurb: m.blurb,
    })
    if (m.ore) {
      out.push({
        id: m.ore.id,
        name: m.ore.name,
        category: 'material',
        tier: m.tier,
        value: Math.round(materialCost(m.tier) * 2),
        stack: true,
      })
    }
  }
  for (const r of RELICS) {
    out.push({
      id: r.id,
      name: r.name,
      category: 'relic',
      tier: r.tier,
      value: Math.round(materialCost(r.tier) * 10),
      stack: true,
      blurb: r.blurb,
    })
  }
  return out
}

export { materialPower }
