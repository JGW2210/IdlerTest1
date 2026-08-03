import type { ItemDef } from '@/engine/types'

/**
 * The foreign powers.
 *
 * Rings three to five are not a gradient from "your land" into "wilderness" —
 * they are settled ground fraying into wilds, with other peoples' holds scattered
 * through the gaps. Reaching one is the point of going out there.
 *
 * Each power has three things nobody else has:
 *
 *   a metal   — trade-only, unminable, so their goods are a supply line
 *   a tongue  — their holds are named from their own grammar
 *   words     — glyphs only they will teach, so the rune grammar is partly
 *               *geographic*. You cannot compose with Moonsilver's vocabulary
 *               until you have reached the Hollow Court and earned their patience.
 *
 * That last one is the reason this layer exists. Digging gives you glyphs the
 * ground happens to hold; tutors give you glyphs a people chose to keep.
 */

export interface PowerDef {
  id: string
  /** The march they hold, matching the province names in outlands.ts. */
  province: string
  name: string
  /** What they call themselves. */
  endonym: string
  blurb: string
  /** Name grammar for their holds. */
  heads: string[]
  tails: string[]
  /** Their signature material, which cannot be gathered anywhere. */
  material: { id: string; name: string; tier: number; blurb: string }
  /** Other goods their markets carry. */
  goods: string[]
  /** Glyphs they teach, in the order they will part with them. */
  glyphs: string[]
  /**
   * The subset no dig will ever turn up. These are the words this people kept
   * rather than the words the ground happened to hold — the reason the rune
   * grammar is partly geographic.
   */
  exclusive: string[]
  /** What their market site is called. */
  marketName: string
  /** How they greet a stranger. Shown at zero standing. */
  greeting: string
}

export const POWERS: PowerDef[] = [
  {
    id: 'kaldmark',
    province: 'The Hoarfrost Marches',
    name: 'The Rimeward Jarldom',
    endonym: 'Kaldmark',
    blurb:
      'Hall-folk of the high north, who reckon a year by the two months it is possible to travel. They keep no lord above a jarl and no jarl above an oath.',
    heads: ['Kald', 'Vetr', 'Vindr', 'Hrim', 'Nord', 'Skarn', 'Vald', 'Fross'],
    tails: ['hall', 'stead', 'gard', 'holm', 'vik', 'fell', 'thing', 'borg'],
    material: { id: 'rimesteel', name: 'Rimesteel', tier: 8, blurb: 'Worked at a temperature the southern forges cannot reach going down.' },
    goods: ['rimeSalt', 'adamantOre', 'leather'],
    glyphs: ['ward', 'linger', 'onLow'],
    exclusive: ['ward'],
    marketName: 'The Oath-Hall',
    greeting: 'They will hear you out. They will not offer you a seat.',
  },
  {
    id: 'ashband',
    province: 'The Cinderwaste',
    name: 'The Ashband',
    endonym: 'Emberkin',
    blurb:
      'Nomads of the caldera, marked at birth with the ash of the vent they were born beside. They follow the warm ground and will not build anything they cannot leave.',
    heads: ['Cinder', 'Vent', 'Pyre', 'Scoria', 'Fume', 'Slag', 'Brand', 'Kiln'],
    tails: ['camp', 'wend', 'walk', 'ring', 'hearth', 'road', 'mark', 'reach'],
    material: { id: 'emberglass', name: 'Emberglass', tier: 9, blurb: 'Volcanic glass folded ninety times. Holds an edge and a grudge.' },
    goods: ['emberstone', 'dragonbone', 'coal'],
    glyphs: ['brand', 'amplify', 'onKill'],
    exclusive: ['amplify'],
    marketName: 'The Wending Market',
    greeting: 'They are camped here this season. They will not be next.',
  },
  {
    id: 'morvaren',
    province: 'The Reaving Fens',
    name: 'The Sunken Thegns',
    endonym: 'Morvaren',
    blurb:
      'Fen-folk who did not leave when the water came, and have since stopped agreeing that it did. Their halls are on stilts and their memory is longer than the fen.',
    heads: ['Mor', 'Sedge', 'Slough', 'Hythe', 'Cull', 'Wade', 'Reeve', 'Fen'],
    tails: ['hythe', 'stilt', 'ait', 'wick', 'holt', 'staithe', 'lode', 'eyot'],
    material: { id: 'bogsilver', name: 'Bogsilver', tier: 7, blurb: 'Silver that has lain in peat for an age. It takes an inscription and never lets go.' },
    goods: ['gloamCap', 'sanguineCrystal', 'riverFish'],
    glyphs: ['gloam', 'siphon', 'sigil'],
    exclusive: ['siphon'],
    marketName: 'The Stilt Market',
    greeting: 'They watched you approach for two hours and let you.',
  },
  {
    id: 'corhen',
    province: 'The Sundered Downs',
    name: 'The Cor Hen',
    endonym: 'the Old Watch',
    blurb:
      'Not a people but an order, older than the kingdom, who keep the barrows shut. They will trade, and they will ask what you have been digging.',
    heads: ['Cor', 'Ward', 'Vigil', 'Keep', 'Sarn', 'Grave', 'Hen', 'Maen'],
    tails: ['garth', 'watch', 'close', 'chapter', 'gate', 'rest', 'ring', 'house'],
    material: { id: 'wardstone', name: 'Wardstone', tier: 8, blurb: 'Cut from a barrow lintel. Nothing that was buried will cross it.' },
    goods: ['dragonbone', 'silverOre', 'elderTablet'],
    glyphs: ['stone', 'onBlock', 'echo'],
    exclusive: ['echo'],
    marketName: 'The Chapter House',
    greeting: 'They know what you have in your pack. They have not said so.',
  },
  {
    id: 'tirmorgant',
    province: 'The Grey Littoral',
    name: 'Tir Morgant',
    endonym: 'the Nine Keels',
    blurb:
      'A sea-kingdom of nine hulls and no capital, whose king is whoever is holding the tiller. They have charts of places that are not there yet.',
    heads: ['Mor', 'Kern', 'Llyr', 'Tal', 'Gwael', 'Aber', 'Pen', 'Traeth'],
    tails: ['gant', 'haven', 'keel', 'sound', 'wick', 'reach', 'ness', 'porth'],
    material: { id: 'tidesteel', name: 'Tidesteel', tier: 10, blurb: 'Quenched in the ninth wave. It is heavier at high water and nobody will explain this.' },
    goods: ['faeglass', 'angelsteel', 'rimeSalt'],
    glyphs: ['gale', 'chain', 'hasten'],
    exclusive: ['hasten'],
    marketName: 'The Keel Market',
    greeting: 'They will trade. They will not tell you where they have been.',
  },
  {
    id: 'hollowcourt',
    province: 'The Wolfwood Marches',
    name: 'The Hollow Court',
    endonym: 'they do not say',
    blurb:
      'A court in the deep wood that keeps a calendar of its own and a great many promises of other people’s. Everything here is a bargain, including the greeting.',
    heads: ['Thorn', 'Moth', 'Glass', 'Hollow', 'Bramble', 'Whisper', 'Ash', 'Nine'],
    tails: ['court', 'gate', 'ring', 'bower', 'thorn', 'stair', 'hall', 'grove'],
    material: { id: 'moonsilver', name: 'Moonsilver', tier: 11, blurb: 'Weighs nothing on the night it was given and a great deal afterwards.' },
    goods: ['faeglass', 'heartwood', 'chronite'],
    glyphs: ['storm', 'split', 'beam', 'empower'],
    exclusive: ['beam', 'empower'],
    marketName: 'The Bargain Bower',
    greeting: 'You are welcome. You are asked to remember that you were welcomed.',
  },
]

/**
 * Every word no excavation will ever produce. Archaeology gives you the glyphs
 * the ground kept; these you can only be taught.
 */
/**
 * Join a head and tail into a hold name without the doubled letter a naive
 * concatenation produces ("Sedge" + "eyot" reads as a typo, not a place).
 */
export function joinName(head: string, tail: string): string {
  const a = head[head.length - 1]?.toLowerCase()
  const b = tail[0]?.toLowerCase()
  return a && a === b ? head + tail.slice(1) : head + tail
}

export const TUTOR_ONLY_GLYPHS: Set<string> = new Set(POWERS.flatMap((p) => p.exclusive))

export const POWER_BY_ID: Record<string, PowerDef> = Object.fromEntries(POWERS.map((p) => [p.id, p]))
export const POWER_BY_PROVINCE: Record<string, PowerDef> = Object.fromEntries(POWERS.map((p) => [p.province, p]))

/** The six trade-only materials, as items. Nothing gathers these. */
export function powerMaterials(): ItemDef[] {
  return POWERS.map((p) => ({
    id: p.material.id,
    name: p.material.name,
    category: 'material' as const,
    tier: p.material.tier,
    value: Math.round(Math.pow(2.3, p.material.tier - 1) * 9),
    stack: true,
    blurb: p.material.blurb,
  }))
}

// ------------------------------------------------------------------ standing

/** Standing thresholds. Trade raises standing; standing opens what they'll part with. */
export interface StandingTier { at: number; name: string; teaches: number }

export const STANDING_TIERS: StandingTier[] = [
  { at: 0, name: 'Tolerated', teaches: 0 },
  { at: 20, name: 'Known', teaches: 1 },
  { at: 45, name: 'Trusted', teaches: 2 },
  { at: 70, name: 'Sworn-friend', teaches: 3 },
  { at: 100, name: 'Kin', teaches: 4 },
]

export function standingTier(standing: number): StandingTier {
  let tier = STANDING_TIERS[0]!
  for (const t of STANDING_TIERS) if (standing >= t.at) tier = t
  return tier
}

/** How many of a power's glyphs they will currently teach. */
export function glyphsOffered(power: PowerDef, standing: number): string[] {
  return power.glyphs.slice(0, standingTier(standing).teaches)
}

/** Insight price of the nth glyph a power teaches. They get dearer. */
export function glyphPrice(index: number): number {
  return Math.round(40 * Math.pow(2.6, index))
}

/** Standing at which a hold can be claimed outright. */
export const CLAIM_STANDING = 100
