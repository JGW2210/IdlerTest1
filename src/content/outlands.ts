import type { RegionDef, SiteDef, Terrain } from '@/engine/types'
import { mulberry32, hashString } from '@/engine/rng'
import { layer, strata, mine, wood, forage, water, dig, delve } from './siteKit'

/**
 * The Outlands — rings 4 and 5, fifty-four regions, generated rather than
 * authored.
 *
 * Generation runs off a fixed world seed rather than the save seed, so these
 * behave exactly like authored content: stable ids, portable saves, and
 * `validateContent()` checks them alongside everything else. Swapping in the
 * save seed later is a one-argument change if per-playthrough frontiers are
 * wanted; the frontier is deliberately the only part of the map that is not
 * hand-written, because past ring three the point is distance, not personality.
 */

const WORLD_SEED = 0x5ea50fed

interface Province {
  name: string
  terrains: Terrain[]
  /** Name grammar. */
  heads: string[]
  tails: string[]
  /** Materials this march is known for, over and above its terrain's. */
  signature: string[]
}

/** Six marches, one per sextant of the compass. */
const PROVINCES: Province[] = [
  {
    name: 'The Hoarfrost Marches',
    terrains: ['mountain', 'mountain', 'waste', 'moor'],
    heads: ['Rime', 'Frost', 'Cold', 'Hoar', 'Winter', 'Snow', 'Bleak', 'Glass'],
    tails: ['gate', 'fell', 'reach', 'watch', 'crag', 'hollow', 'scar', 'tor'],
    signature: ['rimeSalt', 'adamantOre', 'mithralOre'],
  },
  {
    name: 'The Cinderwaste',
    terrains: ['waste', 'waste', 'mountain', 'ruin'],
    heads: ['Ash', 'Ember', 'Cinder', 'Slag', 'Char', 'Scoria', 'Pyre', 'Smoulder'],
    tails: ['fall', 'field', 'barrow', 'pit', 'rise', 'waste', 'mouth', 'stair'],
    signature: ['emberstone', 'meteoricIron', 'voidironOre'],
  },
  {
    name: 'The Reaving Fens',
    terrains: ['marsh', 'marsh', 'cavern', 'ruin'],
    heads: ['Black', 'Mire', 'Sedge', 'Quag', 'Drown', 'Reed', 'Slough', 'Fell'],
    tails: ['fen', 'mere', 'water', 'bottom', 'deep', 'sink', 'wash', 'hollow'],
    signature: ['gloamCap', 'sanguineCrystal', 'shadowash'],
  },
  {
    name: 'The Sundered Downs',
    terrains: ['moor', 'plains', 'ruin', 'moor'],
    heads: ['Barrow', 'Standing', 'Nine', 'Cairn', 'Grave', 'Sarsen', 'Long', 'Kings'],
    tails: ['down', 'ridge', 'field', 'ring', 'mound', 'law', 'stone', 'meet'],
    signature: ['dragonbone', 'silverOre', 'orichalcumOre'],
  },
  {
    name: 'The Grey Littoral',
    terrains: ['coast', 'coast', 'marsh', 'ruin'],
    heads: ['Salt', 'Gull', 'Wrack', 'Storm', 'Grey', 'Tide', 'Drift', 'Foam'],
    tails: ['strand', 'reach', 'haven', 'skerry', 'sound', 'ness', 'bight', 'shore'],
    signature: ['faeglass', 'rimeSalt', 'angelsteel'],
  },
  {
    name: 'The Wolfwood Marches',
    terrains: ['forest', 'forest', 'moor', 'cavern'],
    heads: ['Wolf', 'Thorn', 'Elder', 'Green', 'Deep', 'Hunt', 'Bramble', 'Shadow'],
    tails: ['wood', 'holt', 'shaw', 'weald', 'covert', 'thicket', 'glade', 'march'],
    signature: ['ironbarkLog', 'heartwood', 'chronite'],
  },
]

/** Which terrain yields what, before the province signature is folded in. */
const TERRAIN_YIELDS: Record<Terrain, string[]> = {
  mountain: ['ironOre', 'silverOre', 'coal', 'mithralOre', 'adamantOre'],
  waste: ['emberstone', 'shadowash', 'coal', 'voidironOre'],
  moor: ['marshHerb', 'kingsfoil', 'potsherd', 'hide'],
  marsh: ['gloamCap', 'marshHerb', 'riverFish', 'potsherd'],
  coast: ['riverFish', 'rimeSalt', 'potsherd', 'birchLog'],
  forest: ['ashLog', 'oakLog', 'ironbarkLog', 'kingsfoil'],
  cavern: ['shadowash', 'ironOre', 'voidironOre', 'potsherd'],
  ruin: ['potsherd', 'sealedTablet', 'elderTablet', 'silverOre'],
  plains: ['marshHerb', 'hide', 'kingsfoil', 'oakLog'],
  village: ['marshHerb'],
  town: ['leather', 'coal'],
  unknown: ['potsherd'],
}

function pickFrom<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T
}

/** Sextant of the compass a hex falls in, 0–5. */
function sextant(q: number, r: number): number {
  const x = 1.5 * q
  const y = Math.sqrt(3) * (r + q / 2)
  const angle = Math.atan2(y, x) // -PI..PI, 0 = east
  const turns = (angle + Math.PI * 2) % (Math.PI * 2)
  return Math.floor(turns / (Math.PI / 3)) % 6
}

function hexDistance(q: number, r: number): number {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2
}

function makeSites(rng: () => number, id: string, terrain: Terrain, ring: number, province: Province): SiteDef[] {
  // Ring 4 sits in the high fifties to low seventies; ring 5 past that. Both are
  // beyond every authored region, which is what makes the frontier the frontier.
  const base = ring === 4 ? 54 : 68
  const lo = base + Math.floor(rng() * 6)
  const hi = lo + 10 + Math.floor(rng() * 8)

  const pool = [...(TERRAIN_YIELDS[terrain] ?? ['potsherd']), ...province.signature]
  const common = () => pickFrom(rng, pool)
  const rare = () => pickFrom(rng, province.signature)

  const yieldsFor = (rareWeight: number) => [
    { item: common(), qty: [2, 4] as [number, number], weight: 44 },
    { item: common(), qty: [1, 3] as [number, number], weight: 32 },
    { item: rare(), qty: [1, 1] as [number, number], weight: rareWeight },
    { item: 'potsherd', qty: [2, 4] as [number, number], weight: 24 - rareWeight },
  ]

  const pos: [number, number] = [0.3 + rng() * 0.1, 0.34 + rng() * 0.12]
  const pos2: [number, number] = [0.62 + rng() * 0.1, 0.58 + rng() * 0.12]

  const sites: SiteDef[] = []

  switch (terrain) {
    case 'mountain':
    case 'waste':
      sites.push(mine(`${id}_a`, 'The Workings', pos, [
        layer('Upper Cut', lo, yieldsFor(8)),
        layer('The Deep Cut', hi, yieldsFor(16)),
      ]))
      break
    case 'forest':
      sites.push(wood(`${id}_a`, 'The Standing Wood', pos, [
        layer('Outer Stand', lo, yieldsFor(8)),
        layer('The Old Growth', hi, yieldsFor(16)),
      ]))
      break
    case 'coast':
    case 'marsh':
      sites.push(water(`${id}_a`, 'The Waters', pos, [
        layer('Shallows', lo, yieldsFor(8)),
        layer('The Deeps', hi, yieldsFor(16)),
      ]))
      break
    case 'cavern':
      sites.push(delve(`${id}_a`, 'The Under-Reaches', pos, [
        layer('First Descent', lo, yieldsFor(10), { foes: ['ghoul'] }),
        layer('The Lightless Floor', hi, yieldsFor(18), { foes: ['barrowWight'] }),
      ]))
      break
    default:
      sites.push(forage(`${id}_a`, 'The Open Ground', pos, [
        layer('Verges', lo, yieldsFor(8)),
        layer('The Far Ground', hi, yieldsFor(14)),
      ]))
  }

  // Roughly half the frontier carries something to excavate. The Outlands are
  // where the oldest strata are, so this is the long tail of glyph discovery.
  if (rng() < 0.55 || terrain === 'ruin') {
    sites.push(dig(`${id}_b`, 'The Old Works', pos2, strata([
      { name: 'Overburden', levelReq: lo, age: ring === 4 ? 3 : 4, yields: [
        { item: 'elderTablet', qty: [1, 2], weight: 34 },
        { item: 'potsherd', qty: [3, 5], weight: 38 },
        { item: rare(), qty: [1, 1], weight: 28 },
      ] },
      { name: 'The Old Floor', levelReq: hi, age: 5, yields: [
        { item: 'firstAgeTablet', qty: [1, 2], weight: 34 },
        { item: 'elderTablet', qty: [1, 2], weight: 26 },
        { item: rare(), qty: [1, 2], weight: 30 },
        { item: pickFrom(rng, ['chronite', 'angelsteel', 'sanguineCrystal', 'faeglass', 'heartwood', 'dragonbone']), qty: [1, 1], weight: 10 },
      ] },
    ])))
  }

  return sites
}

let cache: RegionDef[] | null = null

export function generateOutlands(seed = WORLD_SEED): RegionDef[] {
  if (seed === WORLD_SEED && cache) return cache

  const out: RegionDef[] = []

  for (let q = -5; q <= 5; q++) {
    for (let r = -5; r <= 5; r++) {
      const dist = hexDistance(q, r)
      if (dist < 4 || dist > 5) continue

      const id = `out_${q + 5}_${r + 5}`
      const rng = mulberry32(seed ^ hashString(id))
      const province = PROVINCES[sextant(q, r)] as Province
      const terrain = pickFrom(rng, province.terrains)

      const name = `${pickFrom(rng, province.heads)}${pickFrom(rng, province.tails)}`

      out.push({
        id,
        name,
        coord: { q, r },
        terrain,
        // The frontier is dangerous in a way the cantref never is.
        danger: Math.round(8 + (dist - 4) * 3 + rng() * 3),
        outland: true,
        province: province.name,
        scoutLevelReq: Math.round(36 + (dist - 4) * 18 + rng() * 10),
        blurb: outlandBlurb(rng, province, terrain),
        sites: makeSites(rng, id, terrain, dist, province),
      })
    }
  }

  if (seed === WORLD_SEED) cache = out
  return out
}

function outlandBlurb(rng: () => number, province: Province, terrain: Terrain): string {
  const openings = [
    'Beyond the last waystone.',
    'No lord claims it and no map before yours has named it.',
    'The road gives out two days short of here.',
    'Marked on one older chart, and marked wrongly.',
    'Whatever was here has been gone a long time.',
  ]
  const closers: Partial<Record<Terrain, string[]>> = {
    mountain: ['The passes close for eight months of the year.', 'Thin air and thinner welcome.'],
    waste: ['Nothing grows and nothing has tried in a century.', 'The ground is still warm in places.'],
    marsh: ['The water is standing and has been for a very long time.', 'Sound does not carry right out here.'],
    coast: ['The tide comes in faster than a man walks.', 'Wreck timber, and not all of it from ships you recognise.'],
    forest: ['The canopy closes overhead and stays closed.', 'Nothing has been coppiced here, ever.'],
    cavern: ['The entrance is a good deal wider than it needs to be.', 'Cold air comes out of it, steadily.'],
    ruin: ['Walls to the height of a man, and no roof anywhere.', 'Someone dressed these stones with great care.'],
    moor: ['Open ground, and you will still be surprised.', 'The heather hides more than it should.'],
  }
  const tail = closers[terrain] ?? ['Little enough is known.']
  return `${pickFrom(rng, openings)} ${province.name}. ${pickFrom(rng, tail)}`
}
