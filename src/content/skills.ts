import type { SkillDef } from '@/engine/types'

/**
 * Ballot VI-B: five combat parents, three children each. Weapon *variants*
 * (a sabre versus an arming sword) live inside a child and differ in speed,
 * reach and scaling — they add stats, not another bar to fill.
 *
 * 20 combat + 3 defence + 5 gathering + 6 production + 6 civil = 40 tracks,
 * presented as 25 cards with children nested under their parent.
 */
export const SKILLS: SkillDef[] = [
  // -------------------------------------------------------- combat parents
  { id: 'oneHanded', name: 'One-Handed', kind: 'combat-parent', blurb: 'Accuracy and stamina economy with a single weapon and a free hand.' },
  { id: 'twoHanded', name: 'Two-Handed', kind: 'combat-parent', blurb: 'Committed swings that trade guard for reach and weight.' },
  { id: 'ranged', name: 'Ranged', kind: 'combat-parent', blurb: 'Distance, patience, and the discipline of the draw.' },
  { id: 'martial', name: 'Martial Arts', kind: 'combat-parent', blurb: 'The body as the weapon, when the weapon is lost or forbidden.' },
  { id: 'sorcery', name: 'Sorcery', kind: 'combat-parent', blurb: 'Command of the composed word, and the mana to sustain it.' },

  // ------------------------------------------------------- combat children
  { id: 'blade', name: 'Blade', kind: 'combat-child', parent: 'oneHanded', blurb: 'Arming swords, sabres, falchions. Balanced speed and bleed.' },
  { id: 'haft', name: 'Haft', kind: 'combat-child', parent: 'oneHanded', blurb: 'Axes, maces, war hammers. Slow, and unkind to armour.' },
  { id: 'point', name: 'Point', kind: 'combat-child', parent: 'oneHanded', blurb: 'Daggers and rapiers. Fast, precise, punishing to the unarmoured.' },

  { id: 'greatblade', name: 'Greatblade', kind: 'combat-child', parent: 'twoHanded', blurb: 'Longswords and zweihanders. Sweeping arcs that catch groups.' },
  { id: 'greathaft', name: 'Greathaft', kind: 'combat-child', parent: 'twoHanded', blurb: 'Mauls and greataxes. The slowest swing and the largest hole.' },
  { id: 'polearm', name: 'Polearm', kind: 'combat-child', parent: 'twoHanded', blurb: 'Spears and halberds. Reach that strikes first and keeps distance.' },

  { id: 'bow', name: 'Bow', kind: 'combat-child', parent: 'ranged', blurb: 'Draw weight scales with strength; rate of fire with practice.' },
  { id: 'crossbow', name: 'Crossbow', kind: 'combat-child', parent: 'ranged', blurb: 'Slow to span, indifferent to armour, lethal in one shot.' },
  { id: 'thrown', name: 'Thrown', kind: 'combat-child', parent: 'ranged', blurb: 'Javelins, axes and slings. Cheap, expendable, surprisingly deadly.' },

  { id: 'striking', name: 'Striking', kind: 'combat-child', parent: 'martial', blurb: 'Fists, elbows, knees. Fast enough to interrupt a caster.' },
  { id: 'grappling', name: 'Grappling', kind: 'combat-child', parent: 'martial', blurb: 'Holds and throws that ignore armour entirely.' },
  { id: 'focus', name: 'Focus', kind: 'combat-child', parent: 'martial', blurb: 'Breath and stillness. Converts stamina into force.' },

  { id: 'evocation', name: 'Evocation', kind: 'combat-child', parent: 'sorcery', blurb: 'Bolts, novas and beams — magic that lands as damage.' },
  { id: 'weaving', name: 'Weaving', kind: 'combat-child', parent: 'sorcery', blurb: 'Lasting enhancements laid on yourself and your retinue.' },
  { id: 'warding', name: 'Warding', kind: 'combat-child', parent: 'sorcery', blurb: 'Shields, sigils and the refusal of harm.' },

  // -------------------------------------------------------------- defence
  { id: 'guarding', name: 'Guarding', kind: 'defence', blurb: 'Blocks and parries. Turns a landed hit into a glancing one.' },
  { id: 'evasion', name: 'Evasion', kind: 'defence', blurb: 'Footwork. The hit that never arrives costs nothing to survive.' },
  { id: 'vitality', name: 'Vitality', kind: 'defence', blurb: 'Constitution and recovery. Raises maximum health directly.' },

  // ------------------------------------------------------------- gathering
  { id: 'mining', name: 'Mining', kind: 'gathering', blurb: 'Ore from stone. The first rung of every material ladder.' },
  { id: 'forestry', name: 'Forestry', kind: 'gathering', blurb: 'Timber for hafts, bows, buildings and charcoal.' },
  { id: 'foraging', name: 'Foraging', kind: 'gathering', blurb: 'Herbs, fungus and reagents from hedgerow and deep wood.' },
  { id: 'fishing', name: 'Fishing', kind: 'gathering', blurb: 'Patient work. Feeds a village long before a farm does.' },
  { id: 'archaeology', name: 'Archaeology', kind: 'gathering', blurb: 'Excavation of what earlier ages left. Yields knowledge, not ore — glyphs, recipes, map fragments and the locations of relics.' },

  // ------------------------------------------------------------ production
  { id: 'smithing', name: 'Smithing', kind: 'production', blurb: 'Smelting, alloying and the forging of arms and armour.' },
  { id: 'alchemy', name: 'Alchemy', kind: 'production', blurb: 'Draughts, tinctures and the transmutation of reagents.' },
  { id: 'cooking', name: 'Cooking', kind: 'production', blurb: 'Restoratives and the lasting buffs of a proper meal.' },
  { id: 'leatherworking', name: 'Leatherworking', kind: 'production', blurb: 'Hide and cloth. Light armour, quivers and packs.' },
  { id: 'woodworking', name: 'Woodworking', kind: 'production', blurb: 'Bows, shafts, hafts, tool handles and furniture.' },
  { id: 'inscription', name: 'Inscription', kind: 'production', blurb: 'The runic art proper — cutting glyphs into tablets so a composed spell will hold.' },

  // ----------------------------------------------------------------- civil
  { id: 'construction', name: 'Construction', kind: 'civil', hidden: true, blurb: 'Workshops, walls and the buildings that grant retinue slots.' },
  { id: 'farming', name: 'Farming', kind: 'civil', hidden: true, blurb: 'Grain and stock. What a growing retinue eats.' },
  { id: 'commerce', name: 'Commerce', kind: 'civil', hidden: true, blurb: 'Prices, contracts and the standing to negotiate them.' },
  { id: 'statecraft', name: 'Statecraft', kind: 'civil', hidden: true, blurb: 'Oaths, tribute and the management of neighbours who would rather not be neighbours.' },
  { id: 'cartography', name: 'Cartography', kind: 'civil', blurb: 'Survey and scouting. The only way the fog on ring two lifts.' },
  { id: 'beastHandling', name: 'Beast Handling', kind: 'civil', hidden: true, blurb: 'Mounts, pack animals and companions that fight beside you.' },
]

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

export const COMBAT_PARENTS = SKILLS.filter((s) => s.kind === 'combat-parent')

export function childrenOf(parentId: string): SkillDef[] {
  return SKILLS.filter((s) => s.parent === parentId)
}
