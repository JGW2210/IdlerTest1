import type { RegionDef } from '@/engine/types'

/**
 * The opening cantref (ballot VIII-A). Hexes carry terrain, danger, ownership,
 * loyalty and prosperity — the last three inert until the realm layer opens, at
 * which point they become the substrate of diplomacy and war. Each hex holds one
 * to four activity nodes, which is where the character layer actually plays.
 *
 * Ring 1 is known from the start. Ring 2 sits under fog until Cartography lifts
 * it, so the map is a progression track rather than a backdrop.
 */
export const REGIONS: RegionDef[] = [
  {
    id: 'ashcombe',
    name: 'Ashcombe',
    coord: { q: 0, r: 0 },
    terrain: 'village',
    danger: 0,
    blurb: 'Forty households, a mill, a church with a leaking roof, and a smithy whose owner is getting old.',
    nodes: [
      { id: 'ashcombe_commons', name: 'The Commons', activity: 'gather', skill: 'foraging', levelReq: 1, baseTime: 3, xp: 6, yields: [
        { item: 'marshHerb', qty: [1, 2], weight: 60 },
        { item: 'birchLog', qty: [1, 1], weight: 30 },
        { item: 'hide', qty: [1, 1], weight: 10 },
      ] },
      { id: 'ashcombe_brook', name: 'Millbrook', activity: 'gather', skill: 'fishing', levelReq: 1, baseTime: 3.5, xp: 7, yields: [
        { item: 'riverFish', qty: [1, 2], weight: 100 },
      ] },
      { id: 'ashcombe_smithy', name: 'The Old Smithy', activity: 'trade', skill: 'commerce', levelReq: 1, baseTime: 4, xp: 5, yields: [
        { item: 'coal', qty: [1, 3], weight: 100 },
      ] },
    ],
  },
  {
    id: 'greyhollow',
    name: 'Greyhollow Mine',
    coord: { q: 1, r: -1 },
    terrain: 'mountain',
    danger: 1,
    blurb: 'Worked for six generations. The upper galleries are picked clean; the lower ones are not, for a reason.',
    nodes: [
      { id: 'greyhollow_upper', name: 'Upper Galleries', activity: 'gather', skill: 'mining', levelReq: 1, baseTime: 3.2, xp: 8, yields: [
        { item: 'copperOre', qty: [1, 2], weight: 55 },
        { item: 'tinOre', qty: [1, 1], weight: 25 },
        { item: 'coal', qty: [1, 2], weight: 20 },
      ] },
      { id: 'greyhollow_deep', name: 'Deep Seams', activity: 'gather', skill: 'mining', levelReq: 12, baseTime: 4.5, xp: 22, yields: [
        { item: 'ironOre', qty: [1, 2], weight: 60 },
        { item: 'coal', qty: [2, 3], weight: 30 },
        { item: 'emberstone', qty: [1, 1], weight: 10 },
      ] },
      { id: 'greyhollow_pale', name: 'The Pale Seam', activity: 'gather', skill: 'mining', levelReq: 40, baseTime: 6, xp: 90, yields: [
        { item: 'silverOre', qty: [1, 2], weight: 50 },
        { item: 'mithralOre', qty: [1, 1], weight: 12 },
        { item: 'rimeSalt', qty: [1, 1], weight: 18 },
        { item: 'ironOre', qty: [2, 3], weight: 20 },
      ] },
    ],
  },
  {
    id: 'tanglewood',
    name: 'Tanglewood',
    coord: { q: -1, r: 0 },
    terrain: 'forest',
    danger: 2,
    blurb: 'Old growth, poorly charted. The wolves are not the problem; what the wolves avoid is the problem.',
    nodes: [
      { id: 'tanglewood_eaves', name: 'The Eaves', activity: 'gather', skill: 'forestry', levelReq: 1, baseTime: 3.2, xp: 8, yields: [
        { item: 'birchLog', qty: [1, 2], weight: 70 },
        { item: 'marshHerb', qty: [1, 1], weight: 30 },
      ] },
      { id: 'tanglewood_heart', name: 'Heartwood Stand', activity: 'gather', skill: 'forestry', levelReq: 15, baseTime: 4.4, xp: 26, yields: [
        { item: 'oakLog', qty: [1, 2], weight: 60 },
        { item: 'ashLog', qty: [1, 1], weight: 22 },
        { item: 'kingsfoil', qty: [1, 1], weight: 18 },
      ] },
      { id: 'tanglewood_den', name: 'The Wolf Den', activity: 'hunt', skill: 'oneHanded', levelReq: 3, baseTime: 5, xp: 0, foes: ['wolf', 'directWolf'], yields: [
        { item: 'hide', qty: [1, 2], weight: 100 },
      ] },
    ],
  },
  {
    id: 'fallow',
    name: 'The Fallow',
    coord: { q: 0, r: 1 },
    terrain: 'plains',
    danger: 2,
    blurb: 'Good soil left untilled since the last levy took the men who worked it.',
    nodes: [
      { id: 'fallow_hedgerows', name: 'Hedgerows', activity: 'gather', skill: 'foraging', levelReq: 6, baseTime: 3.6, xp: 14, yields: [
        { item: 'marshHerb', qty: [2, 3], weight: 55 },
        { item: 'kingsfoil', qty: [1, 1], weight: 20 },
        { item: 'hide', qty: [1, 2], weight: 25 },
      ] },
      { id: 'fallow_road', name: 'The Old Road', activity: 'hunt', skill: 'oneHanded', levelReq: 8, baseTime: 5.5, xp: 0, foes: ['bandit', 'banditArcher'], yields: [
        { item: 'leather', qty: [1, 1], weight: 100 },
      ] },
    ],
  },
  {
    id: 'barrowdeep',
    name: 'Barrowdeep',
    coord: { q: 1, r: 0 },
    terrain: 'cavern',
    danger: 4,
    blurb: 'A cave mouth that was a door once. The torches gutter about thirty paces in and nobody has agreed why.',
    nodes: [
      { id: 'barrowdeep_mouth', name: 'The Mouth', activity: 'delve', skill: 'oneHanded', levelReq: 10, baseTime: 6, xp: 0, foes: ['barrowRat', 'ghoul'], yields: [
        { item: 'shadowash', qty: [1, 1], weight: 40 },
        { item: 'potsherd', qty: [1, 3], weight: 60 },
      ] },
      { id: 'barrowdeep_vaults', name: 'The Vaults', activity: 'delve', skill: 'oneHanded', levelReq: 30, baseTime: 8, xp: 0, foes: ['ghoul', 'barrowWight'], yields: [
        { item: 'shadowash', qty: [1, 2], weight: 35 },
        { item: 'sealedTablet', qty: [1, 1], weight: 8 },
        { item: 'dragonbone', qty: [1, 1], weight: 2 },
        { item: 'potsherd', qty: [2, 4], weight: 55 },
      ] },
    ],
  },
  {
    id: 'stonewatch',
    name: 'Stonewatch Ruin',
    coord: { q: 0, r: -1 },
    terrain: 'ruin',
    danger: 3,
    blurb: 'Older than Camelot and built by people who did not use doors the way we do.',
    nodes: [
      { id: 'stonewatch_terrace', name: 'Collapsed Terrace', activity: 'excavate', skill: 'archaeology', levelReq: 1, baseTime: 5, xp: 16, yields: [
        { item: 'potsherd', qty: [1, 3], weight: 70 },
        { item: 'copperOre', qty: [1, 2], weight: 20 },
        { item: 'sealedTablet', qty: [1, 1], weight: 10 },
      ] },
      { id: 'stonewatch_undercroft', name: 'The Undercroft', activity: 'excavate', skill: 'archaeology', levelReq: 20, baseTime: 7, xp: 65, yields: [
        { item: 'sealedTablet', qty: [1, 1], weight: 30 },
        { item: 'potsherd', qty: [2, 5], weight: 45 },
        { item: 'gloamCap', qty: [1, 1], weight: 15 },
        { item: 'faeglass', qty: [1, 1], weight: 3 },
        { item: 'heartwood', qty: [1, 1], weight: 2 },
      ] },
    ],
  },
  {
    id: 'aldermarch',
    name: 'Aldermarch',
    coord: { q: -1, r: 1 },
    terrain: 'town',
    danger: 1,
    blurb: 'Two thousand souls, a wool market, and the nearest person who will teach you anything for money.',
    nodes: [
      { id: 'aldermarch_market', name: 'Wool Market', activity: 'trade', skill: 'commerce', levelReq: 1, baseTime: 4.5, xp: 12, yields: [
        { item: 'leather', qty: [1, 2], weight: 50 },
        { item: 'coal', qty: [2, 4], weight: 35 },
        { item: 'blankTablet', qty: [1, 1], weight: 15 },
      ] },
      { id: 'aldermarch_scriptorium', name: 'The Scriptorium', activity: 'excavate', skill: 'inscription', levelReq: 5, baseTime: 6, xp: 30, yields: [
        { item: 'sealedTablet', qty: [1, 1], weight: 25 },
        { item: 'blankTablet', qty: [1, 2], weight: 75 },
      ] },
    ],
  },

  // ------------------------------------------------------------ ring two
  {
    id: 'thornfell',
    name: 'Thornfell',
    coord: { q: 2, r: -2 },
    terrain: 'mountain',
    danger: 6,
    scoutLevelReq: 10,
    blurb: 'High, cold, and holding the only adamant seam this side of the range.',
    nodes: [
      { id: 'thornfell_seam', name: 'Adamant Seam', activity: 'gather', skill: 'mining', levelReq: 60, baseTime: 8, xp: 240, yields: [
        { item: 'adamantOre', qty: [1, 2], weight: 60 },
        { item: 'mithralOre', qty: [1, 2], weight: 25 },
        { item: 'rimeSalt', qty: [1, 2], weight: 15 },
      ] },
    ],
  },
  {
    id: 'drownedcity',
    name: 'The Drowned City',
    coord: { q: -2, r: 2 },
    terrain: 'ruin',
    danger: 8,
    scoutLevelReq: 25,
    blurb: 'It goes under at every tide and comes back with the streets rearranged.',
    nodes: [
      { id: 'drowned_causeway', name: 'The Causeway', activity: 'excavate', skill: 'archaeology', levelReq: 55, baseTime: 10, xp: 520, yields: [
        { item: 'orichalcumOre', qty: [1, 2], weight: 40 },
        { item: 'sealedTablet', qty: [1, 2], weight: 30 },
        { item: 'faeglass', qty: [1, 1], weight: 12 },
        { item: 'angelsteel', qty: [1, 1], weight: 3 },
        { item: 'chronite', qty: [1, 1], weight: 2 },
      ] },
    ],
  },
]

export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r]))

export function findNode(nodeId: string): { region: RegionDef; node: RegionDef['nodes'][number] } | undefined {
  for (const region of REGIONS) {
    const node = region.nodes.find((n) => n.id === nodeId)
    if (node) return { region, node }
  }
  return undefined
}

/** Ring 1 is known from the start; ring 2 waits on Cartography. */
export const STARTING_REGIONS = ['ashcombe', 'greyhollow', 'tanglewood', 'fallow', 'barrowdeep', 'stonewatch', 'aldermarch']
