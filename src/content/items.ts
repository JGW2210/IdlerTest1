import type { EquipSlot, ItemDef, SkillId } from '@/engine/types'
import { materialPower } from '@/engine/curves'
import { MATERIAL_TIERS, RAW_MATERIALS, materialItems, type MaterialTier } from './materials'

/**
 * Equipment is generated from the material ladder crossed with a small table of
 * archetypes. This is the load-bearing consequence of "content is data": adding
 * a thirteenth tier or a fourteenth weapon shape produces a full line of items
 * without a line of new code, and every generated item lands on the same curve.
 *
 * Ballot VI-B lives here too. A sabre and an arming sword are both `blade` —
 * they differ in speed and stat profile, and neither adds a skill bar.
 */

interface WeaponArchetype {
  key: string
  name: string
  skill: SkillId
  slot: EquipSlot
  /** Seconds between swings, before skill and material adjust it. */
  speed: number
  /** Damage multiplier, roughly proportional to speed so DPS stays comparable. */
  mult: number
  crit?: number
  blurb: string
}

const WEAPONS: WeaponArchetype[] = [
  { key: 'armingSword', name: 'Arming Sword', skill: 'blade', slot: 'mainHand', speed: 1.0, mult: 1.0, blurb: 'The soldier’s default. Nothing about it is remarkable, which is the point.' },
  { key: 'sabre', name: 'Sabre', skill: 'blade', slot: 'mainHand', speed: 0.85, mult: 0.9, crit: 0.03, blurb: 'Curved, quick, and unkind to anyone without a shield.' },
  { key: 'warAxe', name: 'War Axe', skill: 'haft', slot: 'mainHand', speed: 1.25, mult: 1.3, blurb: 'Splits a shield in two swings and a helm in one.' },
  { key: 'mace', name: 'Mace', skill: 'haft', slot: 'mainHand', speed: 1.15, mult: 1.2, blurb: 'Does not care how good the armour is.' },
  { key: 'dagger', name: 'Dagger', skill: 'point', slot: 'mainHand', speed: 0.6, mult: 0.62, crit: 0.06, blurb: 'Three strikes in the time a maul takes to rise.' },
  { key: 'rapier', name: 'Rapier', skill: 'point', slot: 'mainHand', speed: 0.8, mult: 0.85, crit: 0.05, blurb: 'Finds the gap rather than making one.' },

  { key: 'longsword', name: 'Longsword', skill: 'greatblade', slot: 'mainHand', speed: 1.4, mult: 1.5, blurb: 'Two hands, and a swing that catches whatever stands beside the target.' },
  { key: 'zweihander', name: 'Zweihänder', skill: 'greatblade', slot: 'mainHand', speed: 1.7, mult: 1.85, blurb: 'A weapon for breaking formations, wielded by people who have given up on subtlety.' },
  { key: 'maul', name: 'Maul', skill: 'greathaft', slot: 'mainHand', speed: 1.95, mult: 2.2, blurb: 'The slowest swing in the arsenal and the largest hole.' },
  { key: 'greataxe', name: 'Greataxe', skill: 'greathaft', slot: 'mainHand', speed: 1.75, mult: 1.95, crit: 0.04, blurb: 'Momentum does most of the work.' },
  { key: 'spear', name: 'Spear', skill: 'polearm', slot: 'mainHand', speed: 1.2, mult: 1.25, blurb: 'Reach. Strikes first, and keeps striking first.' },
  { key: 'halberd', name: 'Halberd', skill: 'polearm', slot: 'mainHand', speed: 1.5, mult: 1.65, blurb: 'Axe, spike and hook. Answers most problems on a battlefield.' },

  { key: 'shortbow', name: 'Shortbow', skill: 'bow', slot: 'mainHand', speed: 1.0, mult: 0.95, blurb: 'Quick to draw, forgiving of movement.' },
  { key: 'longbow', name: 'Longbow', skill: 'bow', slot: 'mainHand', speed: 1.45, mult: 1.55, blurb: 'Draw weight that takes a decade of practice to use honestly.' },
  { key: 'crossbow', name: 'Crossbow', skill: 'crossbow', slot: 'mainHand', speed: 2.0, mult: 2.3, crit: 0.05, blurb: 'Slow to span. Indifferent to armour. Lethal once.' },
  { key: 'javelin', name: 'Javelin', skill: 'thrown', slot: 'mainHand', speed: 1.1, mult: 1.15, blurb: 'Cheap, expendable, and returned to you after the fight if you are lucky.' },

  { key: 'handwraps', name: 'Handwraps', skill: 'striking', slot: 'hands', speed: 0.7, mult: 0.7, crit: 0.04, blurb: 'Weighted at the knuckle. Legal in most towns.' },
  { key: 'focusStone', name: 'Focus Stone', skill: 'focus', slot: 'offHand', speed: 1.0, mult: 0.8, blurb: 'Held, not swung. Converts stamina into force.' },
  { key: 'rod', name: 'Rod', skill: 'evocation', slot: 'mainHand', speed: 1.2, mult: 0.85, blurb: 'Channels a composed spell without the caster having to shout.' },
]

interface ArmourArchetype {
  key: string
  name: string
  slot: EquipSlot
  /** Share of the tier's armour budget this piece carries. */
  weight: number
  light?: boolean
}

const ARMOUR: ArmourArchetype[] = [
  { key: 'helm', name: 'Helm', slot: 'head', weight: 0.16 },
  { key: 'cuirass', name: 'Cuirass', slot: 'chest', weight: 0.34 },
  { key: 'greaves', name: 'Greaves', slot: 'legs', weight: 0.24 },
  { key: 'gauntlets', name: 'Gauntlets', slot: 'hands', weight: 0.13 },
  { key: 'sabatons', name: 'Sabatons', slot: 'feet', weight: 0.13 },
]

interface Profile { atk: number; arm: number; spd: number; crit: number; mana: number }

const PROFILES: Record<MaterialTier['profile'], Profile> = {
  balanced: { atk: 1.0, arm: 1.0, spd: 1.0, crit: 0, mana: 0 },
  heavy: { atk: 1.15, arm: 1.2, spd: 1.15, crit: 0, mana: 0 },
  keen: { atk: 1.1, arm: 0.95, spd: 1.0, crit: 0.04, mana: 0 },
  arcane: { atk: 0.9, arm: 1.0, spd: 1.0, crit: 0, mana: 0.5 },
  warded: { atk: 0.95, arm: 1.3, spd: 1.05, crit: 0, mana: 0.2 },
  swift: { atk: 0.85, arm: 0.9, spd: 0.8, crit: 0.02, mana: 0 },
}

function round2(n: number) { return Math.round(n * 100) / 100 }

/** Every weapon and armour piece the ladder implies. */
export function forgedItems(): ItemDef[] {
  const out: ItemDef[] = []

  for (const m of MATERIAL_TIERS) {
    const p = PROFILES[m.profile]
    const power = materialPower(m.tier)

    for (const w of WEAPONS) {
      const speed = round2(w.speed * p.spd)
      out.push({
        id: `${m.id.replace(/Bar$/, '')}_${w.key}`,
        name: `${m.name} ${w.name}`,
        category: 'weapon',
        tier: m.tier,
        value: Math.round(power * 4 * w.mult),
        stack: false,
        slot: w.slot,
        weaponSkill: w.skill,
        speed,
        stats: {
          attack: Math.round(power * w.mult * p.atk),
          crit: round2((w.crit ?? 0) + p.crit),
          ...(p.mana > 0 ? { mana: Math.round(power * p.mana) } : {}),
        },
        blurb: w.blurb,
      })
    }

    for (const a of ARMOUR) {
      out.push({
        id: `${m.id.replace(/Bar$/, '')}_${a.key}`,
        name: `${m.name} ${a.name}`,
        category: 'armour',
        tier: m.tier,
        value: Math.round(power * 3 * a.weight * 4),
        stack: false,
        slot: a.slot,
        stats: {
          armour: Math.round(power * a.weight * 2.2 * p.arm),
          health: Math.round(power * a.weight * 0.8),
        },
      })
    }
  }

  return out
}

/** Accessories, tools, tablets and consumables — hand-authored, since these do
 *  not follow the material ladder. */
export const SPECIAL_ITEMS: ItemDef[] = [
  // tools — multiply gathering speed
  { id: 'copperPick', name: 'Copper Pick', category: 'tool', tier: 1, value: 30, stack: false, stats: { gatherSpeed: 0.95 }, blurb: 'Blunts quickly. Better than a rock.' },
  { id: 'steelPick', name: 'Steel Pick', category: 'tool', tier: 4, value: 340, stack: false, stats: { gatherSpeed: 0.78 } },
  { id: 'mithralPick', name: 'Mithral Pick', category: 'tool', tier: 7, value: 4200, stack: false, stats: { gatherSpeed: 0.6 } },
  { id: 'copperAxe', name: 'Copper Felling Axe', category: 'tool', tier: 1, value: 30, stack: false, stats: { gatherSpeed: 0.95 } },
  { id: 'steelAxe', name: 'Steel Felling Axe', category: 'tool', tier: 4, value: 340, stack: false, stats: { gatherSpeed: 0.78 } },
  { id: 'trowel', name: "Surveyor's Trowel", category: 'tool', tier: 2, value: 120, stack: false, stats: { gatherSpeed: 0.85 }, blurb: 'Archaeology is mostly patience and a good edge.' },

  // accessories
  { id: 'copperRing', name: 'Copper Ring', category: 'accessory', tier: 1, value: 40, stack: false, slot: 'ring1', stats: { health: 8 } },
  { id: 'signetRing', name: 'Signet Ring', category: 'accessory', tier: 4, value: 600, stack: false, slot: 'ring1', stats: { health: 40, stamina: 15 }, blurb: 'Marks you as someone with something to seal.' },
  { id: 'wardingBand', name: 'Warding Band', category: 'accessory', tier: 6, value: 3200, stack: false, slot: 'ring1', stats: { armour: 30, mana: 40 } },
  { id: 'huntersTorc', name: "Hunter's Torc", category: 'accessory', tier: 3, value: 400, stack: false, slot: 'neck', stats: { crit: 0.04, stamina: 20 } },
  { id: 'runeChain', name: 'Rune Chain', category: 'accessory', tier: 6, value: 4800, stack: false, slot: 'neck', stats: { mana: 90, tabletSlots: 1 }, blurb: 'A third tablet, worn where it can be reached in a hurry.' },
  { id: 'emberCharm', name: 'Ember Charm', category: 'accessory', tier: 5, value: 1800, stack: false, slot: 'charm', stats: { attack: 25, mana: 30 } },
  { id: 'oakenCharm', name: 'Oaken Charm', category: 'accessory', tier: 2, value: 180, stack: false, slot: 'charm', stats: { health: 30 } },

  // rune tablets — equipment that carries composed spells (ballot V-A)
  { id: 'slateTablet', name: 'Slate Tablet', category: 'tablet', tier: 3, value: 220, stack: false, slot: 'tablet1', stats: { mana: 20 }, blurb: 'Holds one inscribed spell. Cracks if you overreach.' },
  { id: 'argentineTablet', name: 'Argentine Tablet', category: 'tablet', tier: 6, value: 3600, stack: false, slot: 'tablet1', stats: { mana: 70 }, blurb: 'Silver-faced. Takes six glyphs without complaint.' },

  // consumables
  { id: 'breadRation', name: 'Bread Ration', category: 'consumable', tier: 1, value: 8, stack: true, stats: { health: 25 }, blurb: 'Restores 25 health.' },
  { id: 'stew', name: 'Hearth Stew', category: 'consumable', tier: 3, value: 45, stack: true, stats: { health: 90 }, blurb: 'Restores 90 health.' },
  { id: 'minorDraught', name: 'Minor Draught', category: 'consumable', tier: 2, value: 60, stack: true, stats: { mana: 40 }, blurb: 'Restores 40 mana.' },
]

let cache: ItemDef[] | null = null

export function allItems(): ItemDef[] {
  if (!cache) cache = [...materialItems(), ...RAW_MATERIALS, ...forgedItems(), ...SPECIAL_ITEMS]
  return cache
}

let byId: Record<string, ItemDef> | null = null

export function itemById(id: string): ItemDef | undefined {
  if (!byId) byId = Object.fromEntries(allItems().map((i) => [i.id, i]))
  return byId[id]
}
