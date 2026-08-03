import type { RegionDef } from '@/engine/types'
import { layer, strata, mine, wood, forage, water, dig, lair, delve, market, site } from './siteKit'
import { generateOutlands } from './outlands'

/**
 * Rings 0–3 of the cantref, hand-authored: thirty-seven regions, each with a
 * name, a character and layered sites. Rings 4–5 are the Outlands and are
 * generated (see outlands.ts) — the frontier is meant to feel like frontier.
 *
 * Geography, roughly: mountains north, deep wood west, farmland and then coast
 * south, barrows and waste east, and the trading towns strung along the
 * south-west road.
 */

const AUTHORED: RegionDef[] = [
  // ============================================================ ring 0
  {
    id: 'ashcombe', name: 'Ashcombe', coord: { q: 0, r: 0 }, terrain: 'village', danger: 0,
    blurb: 'Forty households, a mill, a church with a leaking roof, and a smithy whose owner is getting old.',
    sites: [
      forage('ash_commons', 'The Commons', [0.28, 0.62], [
        layer('Hedgerow', 1, [
          { item: 'marshHerb', weight: 60 }, { item: 'birchLog', qty: [1, 1], weight: 30 }, { item: 'hide', qty: [1, 1], weight: 10 },
        ]),
        layer('The Old Orchard', 14, [
          { item: 'marshHerb', qty: [2, 3], weight: 50 }, { item: 'kingsfoil', qty: [1, 1], weight: 25 }, { item: 'hide', weight: 25 },
        ]),
      ], 'Common land, grazed thin, but the hedges still give.'),
      water('ash_brook', 'Millbrook', [0.68, 0.30], [
        layer('The Shallows', 1, [{ item: 'riverFish', weight: 100 }]),
        layer('The Mill Pool', 20, [{ item: 'riverFish', qty: [2, 3], weight: 80 }, { item: 'marshHerb', weight: 20 }]),
      ]),
      market('ash_smithy', 'The Old Smithy', [0.50, 0.44], [
        layer('Buy Charcoal', 1, [{ item: 'coal', qty: [1, 3], weight: 100 }]),
        layer('Broker Scrap', 18, [{ item: 'coal', qty: [2, 4], weight: 60 }, { item: 'copperOre', qty: [1, 3], weight: 40 }]),
      ], 'Wat the smith will sell you charcoal and opinions in equal measure.'),
    ],
  },

  // ============================================================ ring 1
  {
    id: 'stonewatch', name: 'Stonewatch Ruin', coord: { q: 0, r: -1 }, terrain: 'ruin', danger: 3,
    blurb: 'Older than Camelot and built by people who did not use doors the way we do.',
    sites: [
      dig('stone_terrace', 'Collapsed Terrace', [0.34, 0.30], strata([
        { name: 'Turf and Rubble', levelReq: 1, age: 1, yields: [
          { item: 'potsherd', qty: [1, 3], weight: 70 }, { item: 'copperOre', weight: 20 }, { item: 'sealedTablet', qty: [1, 1], weight: 10 },
        ], blurb: 'Mostly the last century of goat herders losing things.' },
        { name: 'The Burn Layer', levelReq: 20, age: 2, yields: [
          { item: 'sealedTablet', qty: [1, 1], weight: 34 }, { item: 'potsherd', qty: [2, 5], weight: 40 },
          { item: 'gloamCap', qty: [1, 1], weight: 16 }, { item: 'elderTablet', qty: [1, 1], weight: 10 },
        ], blurb: 'Everything here is charcoal. Something burned this place on purpose.' },
      ])),
      site('stone_undercroft', 'The Undercroft', {
        activity: 'excavate', skill: 'archaeology', icon: 'barrow', pos: [0.66, 0.62],
        blurb: 'The stair goes down further than the hill is tall.',
      }, strata([
        { name: 'Flooded Steps', levelReq: 30, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 1], weight: 34 }, { item: 'potsherd', qty: [2, 4], weight: 36 },
          { item: 'faeglass', qty: [1, 1], weight: 8 }, { item: 'silverOre', weight: 22 },
        ] },
        { name: 'The Sealed Vault', levelReq: 52, age: 4, yields: [
          { item: 'firstAgeTablet', qty: [1, 1], weight: 26 }, { item: 'elderTablet', qty: [1, 2], weight: 34 },
          { item: 'heartwood', qty: [1, 1], weight: 6 }, { item: 'orichalcumOre', weight: 34 },
        ], blurb: 'Sealed from the inside.' },
      ])),
    ],
  },
  {
    id: 'greyhollow', name: 'Greyhollow Mine', coord: { q: 1, r: -1 }, terrain: 'mountain', danger: 1,
    blurb: 'Worked for six generations. The upper galleries are picked clean; the lower ones are not, for a reason.',
    sites: [
      mine('grey_upper', 'Greyhollow Galleries', [0.30, 0.36], [
        layer('Upper Gallery', 1, [
          { item: 'copperOre', weight: 55 }, { item: 'tinOre', qty: [1, 1], weight: 25 }, { item: 'coal', weight: 20 },
        ]),
        layer('Deep Seam', 12, [
          { item: 'ironOre', weight: 60 }, { item: 'coal', qty: [2, 3], weight: 30 }, { item: 'emberstone', qty: [1, 1], weight: 10 },
        ]),
        layer('The Pale Seam', 40, [
          { item: 'silverOre', weight: 46 }, { item: 'mithralOre', qty: [1, 1], weight: 12 },
          { item: 'rimeSalt', qty: [1, 1], weight: 18 }, { item: 'ironOre', qty: [2, 3], weight: 24 },
        ], { blurb: 'Where the rock turns the colour of a drowned man.' }),
      ]),
      forage('grey_spoil', 'The Spoil Heaps', [0.68, 0.66], [
        layer('Pickings', 6, [{ item: 'coal', qty: [1, 3], weight: 60 }, { item: 'copperOre', weight: 40 }]),
      ], 'Six generations of what the miners could not be bothered to carry.'),
    ],
  },
  {
    id: 'barrowdeep', name: 'Barrowdeep', coord: { q: 1, r: 0 }, terrain: 'cavern', danger: 4,
    blurb: 'A cave mouth that was a door once. The torches gutter about thirty paces in and nobody has agreed why.',
    sites: [
      delve('barrow_mouth', 'The Mouth', [0.34, 0.40], [
        layer('Entrance Hall', 10, [
          { item: 'shadowash', qty: [1, 1], weight: 40 }, { item: 'potsherd', qty: [1, 3], weight: 60 },
        ], { foes: ['barrowRat', 'ghoul'] }),
        layer('The Vaults', 30, [
          { item: 'shadowash', weight: 34 }, { item: 'sealedTablet', qty: [1, 1], weight: 12 },
          { item: 'dragonbone', qty: [1, 1], weight: 3 }, { item: 'potsherd', qty: [2, 4], weight: 51 },
        ], { foes: ['ghoul', 'barrowWight'] }),
        layer('The King Below', 55, [
          { item: 'dragonbone', qty: [1, 1], weight: 10 }, { item: 'firstAgeTablet', qty: [1, 1], weight: 16 },
          { item: 'voidironOre', weight: 34 }, { item: 'shadowash', qty: [2, 4], weight: 40 },
        ], { foes: ['barrowWight'], blurb: 'He was buried standing up, facing the door.' }),
      ]),
    ],
  },
  {
    id: 'fallow', name: 'The Fallow', coord: { q: 0, r: 1 }, terrain: 'plains', danger: 2,
    blurb: 'Good soil left untilled since the last levy took the men who worked it.',
    sites: [
      forage('fallow_hedges', 'Hedgerows', [0.30, 0.34], [
        layer('The Verges', 6, [
          { item: 'marshHerb', qty: [2, 3], weight: 55 }, { item: 'kingsfoil', qty: [1, 1], weight: 20 }, { item: 'hide', weight: 25 },
        ]),
        layer('The Wild Acre', 26, [
          { item: 'kingsfoil', weight: 45 }, { item: 'marshHerb', qty: [2, 4], weight: 35 }, { item: 'gloamCap', qty: [1, 1], weight: 20 },
        ]),
      ]),
      lair('fallow_road', 'The Old Road', [0.70, 0.62], [
        layer('Toll Bend', 8, [{ item: 'leather', qty: [1, 1], weight: 100 }], { foes: ['bandit', 'banditArcher'] }),
      ], 'Bandits work it now, and they are not very good at it.'),
    ],
  },
  {
    id: 'aldermarch', name: 'Aldermarch', coord: { q: -1, r: 1 }, terrain: 'town', danger: 1,
    blurb: 'Two thousand souls, a wool market, and the nearest person who will teach you anything for money.',
    sites: [
      market('alder_market', 'Wool Market', [0.32, 0.40], [
        layer('The Stalls', 1, [
          { item: 'leather', weight: 50 }, { item: 'coal', qty: [2, 4], weight: 35 }, { item: 'blankTablet', qty: [1, 1], weight: 15 },
        ]),
        layer('The Long Counter', 24, [
          { item: 'leather', qty: [2, 4], weight: 40 }, { item: 'silverOre', weight: 20 },
          { item: 'blankTablet', qty: [1, 2], weight: 25 }, { item: 'kingsfoil', weight: 15 },
        ]),
      ]),
      site('alder_scriptorium', 'The Scriptorium', {
        activity: 'excavate', skill: 'inscription', icon: 'shrine', pos: [0.66, 0.64],
        blurb: 'Nine monks, one of whom will talk to you about the older alphabets.',
      }, [
        layer('Copying Desk', 5, [{ item: 'blankTablet', qty: [1, 2], weight: 75 }, { item: 'sealedTablet', qty: [1, 1], weight: 25 }]),
        layer('The Locked Press', 35, [
          { item: 'sealedTablet', qty: [1, 1], weight: 50 }, { item: 'elderTablet', qty: [1, 1], weight: 25 }, { item: 'blankTablet', qty: [1, 2], weight: 25 },
        ]),
      ]),
    ],
  },
  {
    id: 'tanglewood', name: 'Tanglewood', coord: { q: -1, r: 0 }, terrain: 'forest', danger: 2,
    blurb: 'Old growth, poorly charted. The wolves are not the problem; what the wolves avoid is the problem.',
    sites: [
      wood('tangle_eaves', 'The Eaves', [0.26, 0.30], [
        layer('Coppice', 1, [{ item: 'birchLog', weight: 70 }, { item: 'marshHerb', qty: [1, 1], weight: 30 }]),
        layer('Heartwood Stand', 15, [
          { item: 'oakLog', weight: 60 }, { item: 'ashLog', qty: [1, 1], weight: 22 }, { item: 'kingsfoil', qty: [1, 1], weight: 18 },
        ]),
        layer('The Grandfather Oaks', 45, [
          { item: 'ashLog', qty: [2, 3], weight: 50 }, { item: 'ironbarkLog', qty: [1, 1], weight: 18 }, { item: 'gloamCap', weight: 32 },
        ]),
      ]),
      lair('tangle_den', 'The Wolf Den', [0.70, 0.66], [
        layer('The Den', 3, [{ item: 'hide', weight: 100 }], { foes: ['wolf'] }),
        layer('Deep Runs', 22, [{ item: 'hide', qty: [2, 4], weight: 80 }, { item: 'kingsfoil', weight: 20 }], { foes: ['wolf', 'directWolf'] }),
      ]),
    ],
  },

  // ============================================================ ring 2
  {
    id: 'thornfell', name: 'Thornfell', coord: { q: 0, r: -2 }, terrain: 'mountain', danger: 6, scoutLevelReq: 4,
    blurb: 'High, cold, and holding the only adamant seam this side of the range.',
    sites: [
      mine('thorn_seam', 'The Adamant Seam', [0.36, 0.34], [
        layer('Scree Workings', 34, [{ item: 'ironOre', qty: [2, 3], weight: 60 }, { item: 'silverOre', weight: 40 }]),
        layer('The Adamant Seam', 60, [
          { item: 'adamantOre', weight: 56 }, { item: 'mithralOre', weight: 26 }, { item: 'rimeSalt', weight: 18 },
        ]),
      ]),
      forage('thorn_crags', 'The Crags', [0.68, 0.62], [
        layer('Cliff Herbs', 30, [{ item: 'kingsfoil', qty: [2, 3], weight: 60 }, { item: 'rimeSalt', qty: [1, 1], weight: 40 }]),
      ]),
    ],
  },
  {
    id: 'coldiron', name: 'Coldiron Scarp', coord: { q: 1, r: -2 }, terrain: 'mountain', danger: 5, scoutLevelReq: 5,
    blurb: 'A cliff of ore so pure the compass needles lie for a mile around it.',
    sites: [
      mine('coldiron_face', 'The Scarp Face', [0.32, 0.42], [
        layer('Open Face', 22, [{ item: 'ironOre', qty: [2, 4], weight: 70 }, { item: 'coal', qty: [2, 4], weight: 30 }]),
        layer('The Lodestone Cut', 48, [
          { item: 'ironOre', qty: [3, 5], weight: 44 }, { item: 'silverOre', qty: [1, 3], weight: 30 }, { item: 'meteoricIron', qty: [1, 1], weight: 8 },
          { item: 'emberstone', weight: 18 },
        ], { blurb: 'Lightning strikes here in every storm and always the same spot.' }),
      ]),
    ],
  },
  {
    id: 'sarnbeacon', name: 'Sarn Beacon', coord: { q: 2, r: -2 }, terrain: 'moor', danger: 4, scoutLevelReq: 8,
    blurb: 'A signal cairn kept lit for a kingdom that no longer answers.',
    sites: [
      dig('sarn_cairn', 'The Beacon Cairn', [0.50, 0.32], strata([
        { name: 'Ash Bed', levelReq: 24, age: 2, yields: [
          { item: 'potsherd', qty: [2, 4], weight: 55 }, { item: 'sealedTablet', qty: [1, 1], weight: 25 }, { item: 'emberstone', weight: 20 },
        ] },
        { name: 'The First Fire', levelReq: 46, age: 4, yields: [
          { item: 'elderTablet', qty: [1, 1], weight: 38 }, { item: 'firstAgeTablet', qty: [1, 1], weight: 14 },
          { item: 'emberstone', qty: [2, 3], weight: 30 }, { item: 'angelsteel', qty: [1, 1], weight: 4 },
        ], blurb: 'Charcoal from a fire lit before the kingdom had a name.' },
      ])),
      forage('sarn_heath', 'Beacon Heath', [0.30, 0.68], [
        layer('Ling and Gorse', 18, [{ item: 'marshHerb', qty: [2, 4], weight: 70 }, { item: 'kingsfoil', weight: 30 }]),
      ]),
    ],
  },
  {
    id: 'hollowmere', name: 'Hollowmere', coord: { q: 2, r: -1 }, terrain: 'marsh', danger: 5, scoutLevelReq: 10,
    blurb: 'A lake with no inflow and no outflow that has never once frozen.',
    sites: [
      water('mere_reeds', 'The Reed Shallows', [0.30, 0.36], [
        layer('Reedbeds', 16, [{ item: 'riverFish', qty: [2, 3], weight: 70 }, { item: 'marshHerb', qty: [1, 2], weight: 30 }]),
        layer('The Still Deep', 42, [
          { item: 'riverFish', qty: [3, 5], weight: 50 }, { item: 'gloamCap', qty: [1, 2], weight: 28 }, { item: 'faeglass', qty: [1, 1], weight: 5 },
          { item: 'rimeSalt', weight: 17 },
        ]),
      ]),
      dig('mere_causeway', 'The Sunken Causeway', [0.68, 0.64], strata([
        { name: 'Silt', levelReq: 28, age: 2, yields: [
          { item: 'potsherd', qty: [2, 4], weight: 60 }, { item: 'sealedTablet', qty: [1, 1], weight: 28 }, { item: 'gloamCap', weight: 12 },
        ] },
        { name: 'The Offering Layer', levelReq: 50, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 2], weight: 42 }, { item: 'silverOre', qty: [2, 3], weight: 32 },
          { item: 'faeglass', qty: [1, 1], weight: 10 }, { item: 'sanguineCrystal', qty: [1, 1], weight: 4 }, { item: 'potsherd', qty: [2, 4], weight: 12 },
        ], blurb: 'Swords, all of them bent double before they went in.' },
      ])),
    ],
  },
  {
    id: 'gapingvault', name: 'The Gaping Vault', coord: { q: 2, r: 0 }, terrain: 'cavern', danger: 7, scoutLevelReq: 12,
    blurb: 'Not a cave. A room, with a roof, that happens to be nine hundred feet across.',
    sites: [
      delve('vault_floor', 'The Vault Floor', [0.36, 0.38], [
        layer('The Threshold', 32, [
          { item: 'shadowash', qty: [1, 2], weight: 46 }, { item: 'voidironOre', qty: [1, 1], weight: 14 }, { item: 'potsherd', qty: [2, 4], weight: 40 },
        ], { foes: ['ghoul'] }),
        layer('The Pillar Halls', 58, [
          { item: 'voidironOre', weight: 40 }, { item: 'firstAgeTablet', qty: [1, 1], weight: 18 },
          { item: 'shadowash', qty: [2, 4], weight: 30 }, { item: 'chronite', qty: [1, 1], weight: 3 }, { item: 'dragonbone', qty: [1, 1], weight: 9 },
        ], { foes: ['barrowWight'] }),
      ]),
    ],
  },
  {
    id: 'mereford', name: 'Mereford', coord: { q: 1, r: 1 }, terrain: 'town', danger: 1, scoutLevelReq: 3,
    blurb: 'A bridge town that charges for the bridge and apologises for nothing.',
    sites: [
      market('mereford_wharf', 'The Wharfside', [0.34, 0.44], [
        layer('Bridge Tolls', 12, [
          { item: 'leather', qty: [1, 3], weight: 40 }, { item: 'coal', qty: [2, 4], weight: 30 }, { item: 'oakLog', qty: [1, 3], weight: 30 },
        ]),
        layer('The Guild Floor', 38, [
          { item: 'silverOre', qty: [1, 3], weight: 34 }, { item: 'blankTablet', qty: [1, 2], weight: 26 },
          { item: 'ironbarkLog', qty: [1, 1], weight: 16 }, { item: 'leather', qty: [3, 5], weight: 24 },
        ]),
      ]),
      water('mereford_weir', 'The Weir', [0.68, 0.60], [
        layer('Salmon Ladder', 20, [{ item: 'riverFish', qty: [2, 4], weight: 100 }]),
      ]),
    ],
  },
  {
    id: 'wealdrush', name: 'Wealdrush', coord: { q: 0, r: 2 }, terrain: 'plains', danger: 3, scoutLevelReq: 3,
    blurb: 'Grain country. Whoever holds it feeds whoever holds the valley.',
    sites: [
      forage('weald_fields', 'The Long Fields', [0.30, 0.36], [
        layer('Field Margins', 12, [{ item: 'marshHerb', qty: [2, 4], weight: 60 }, { item: 'hide', qty: [1, 2], weight: 40 }]),
        layer('The Hollow Ways', 34, [
          { item: 'kingsfoil', qty: [2, 3], weight: 50 }, { item: 'hide', qty: [2, 4], weight: 30 }, { item: 'gloamCap', weight: 20 },
        ]),
      ]),
      lair('weald_camp', 'The Reiver Camp', [0.70, 0.64], [
        layer('Outriders', 18, [{ item: 'leather', qty: [1, 2], weight: 100 }], { foes: ['bandit', 'banditArcher'] }),
      ]),
    ],
  },
  {
    id: 'drownedcity', name: 'The Drowned City', coord: { q: -1, r: 2 }, terrain: 'ruin', danger: 8, scoutLevelReq: 18,
    blurb: 'It goes under at every tide and comes back with the streets rearranged.',
    sites: [
      dig('drowned_causeway', 'The Causeway', [0.32, 0.34], strata([
        { name: 'Tidewrack', levelReq: 40, age: 2, yields: [
          { item: 'potsherd', qty: [3, 5], weight: 46 }, { item: 'sealedTablet', qty: [1, 2], weight: 30 }, { item: 'silverOre', qty: [1, 3], weight: 24 },
        ] },
        { name: 'The Sunken Quarter', levelReq: 55, age: 4, yields: [
          { item: 'orichalcumOre', qty: [1, 2], weight: 36 }, { item: 'elderTablet', qty: [1, 2], weight: 28 },
          { item: 'faeglass', qty: [1, 1], weight: 12 }, { item: 'firstAgeTablet', qty: [1, 1], weight: 16 }, { item: 'angelsteel', qty: [1, 1], weight: 4 },
          { item: 'chronite', qty: [1, 1], weight: 4 },
        ] },
        { name: 'The Deepest Street', levelReq: 74, age: 5, yields: [
          { item: 'firstAgeTablet', qty: [1, 2], weight: 34 }, { item: 'aurelithOre', qty: [1, 1], weight: 12 },
          { item: 'chronite', qty: [1, 1], weight: 10 }, { item: 'angelsteel', qty: [1, 1], weight: 10 }, { item: 'orichalcumOre', qty: [2, 3], weight: 34 },
        ], blurb: 'The lowest street is dry, and it should not be.' },
      ])),
    ],
  },
  {
    id: 'saltmarch', name: 'Saltmarch', coord: { q: -2, r: 2 }, terrain: 'coast', danger: 4, scoutLevelReq: 14,
    blurb: 'Where the river gives up and the sea takes over the argument.',
    sites: [
      water('salt_flats', 'The Salt Flats', [0.32, 0.60], [
        layer('Tide Pools', 22, [{ item: 'riverFish', qty: [2, 4], weight: 64 }, { item: 'rimeSalt', qty: [1, 2], weight: 36 }]),
        layer('The Deep Channel', 48, [
          { item: 'riverFish', qty: [3, 6], weight: 48 }, { item: 'rimeSalt', qty: [2, 3], weight: 34 }, { item: 'faeglass', qty: [1, 1], weight: 6 },
          { item: 'gloamCap', weight: 12 },
        ]),
      ]),
    ],
  },
  {
    id: 'elderwood', name: 'Elderwood', coord: { q: -2, r: 1 }, terrain: 'forest', danger: 5, scoutLevelReq: 9,
    blurb: 'Nobody coppices here. The trees were left alone and have had opinions about it.',
    sites: [
      wood('elder_stand', 'The Standing Wood', [0.34, 0.34], [
        layer('Outer Stand', 26, [{ item: 'oakLog', qty: [2, 3], weight: 60 }, { item: 'ashLog', weight: 40 }]),
        layer('The Ironbark Grove', 52, [
          { item: 'ironbarkLog', weight: 46 }, { item: 'ashLog', qty: [2, 4], weight: 34 },
          { item: 'gloamCap', qty: [1, 2], weight: 16 }, { item: 'heartwood', qty: [1, 1], weight: 4 },
        ]),
      ]),
      forage('elder_shade', 'The Shade Floor', [0.68, 0.66], [
        layer('Fungal Beds', 32, [{ item: 'gloamCap', qty: [1, 2], weight: 60 }, { item: 'kingsfoil', qty: [1, 2], weight: 40 }]),
      ]),
    ],
  },
  {
    id: 'wraithmoor', name: 'Wraithmoor', coord: { q: -2, r: 0 }, terrain: 'moor', danger: 6, scoutLevelReq: 11,
    blurb: 'Flat, open, and you will still lose sight of your companion for a quarter hour at a time.',
    sites: [
      dig('wraith_stones', 'The Standing Stones', [0.50, 0.34], strata([
        { name: 'Peat', levelReq: 26, age: 2, yields: [
          { item: 'potsherd', qty: [2, 4], weight: 52 }, { item: 'sealedTablet', qty: [1, 1], weight: 28 }, { item: 'gloamCap', weight: 20 },
        ] },
        { name: 'Below the Peat', levelReq: 48, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 1], weight: 40 }, { item: 'shadowash', qty: [1, 2], weight: 30 },
          { item: 'sanguineCrystal', qty: [1, 1], weight: 6 }, { item: 'potsherd', qty: [2, 4], weight: 24 },
        ] },
      ])),
      lair('wraith_hunt', 'The Wandering Ground', [0.30, 0.68], [
        layer('Open Moor', 24, [{ item: 'hide', qty: [2, 3], weight: 100 }], { foes: ['directWolf', 'ghoul'] }),
      ]),
    ],
  },
  {
    id: 'cairnhead', name: 'Cairnhead', coord: { q: -1, r: -1 }, terrain: 'ruin', danger: 4, scoutLevelReq: 6,
    blurb: 'Ninety-one cairns on one hillside, and the ninety-second is being built by nobody anyone has seen.',
    sites: [
      dig('cairn_field', 'The Cairn Field', [0.36, 0.36], strata([
        { name: 'Surface Cairns', levelReq: 12, age: 1, yields: [
          { item: 'potsherd', qty: [1, 3], weight: 66 }, { item: 'sealedTablet', qty: [1, 1], weight: 20 }, { item: 'copperOre', qty: [1, 2], weight: 14 },
        ] },
        { name: 'The Cut Graves', levelReq: 36, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 1], weight: 34 }, { item: 'sealedTablet', qty: [1, 2], weight: 26 },
          { item: 'silverOre', qty: [1, 2], weight: 30 }, { item: 'dragonbone', qty: [1, 1], weight: 10 },
        ] },
      ])),
    ],
  },

  // ============================================================ ring 3
  {
    id: 'skyreach', name: 'Skyreach', coord: { q: 0, r: -3 }, terrain: 'mountain', danger: 9, scoutLevelReq: 26,
    blurb: 'The highest thing anyone has climbed and returned from. There is something built on top.',
    sites: [
      mine('sky_face', 'The North Face', [0.34, 0.30], [
        layer('Upper Snows', 56, [{ item: 'rimeSalt', qty: [2, 3], weight: 44 }, { item: 'mithralOre', qty: [1, 2], weight: 34 }, { item: 'adamantOre', weight: 22 }]),
        layer('The Crown Seam', 78, [
          { item: 'meteoricIron', weight: 30 }, { item: 'adamantOre', qty: [2, 3], weight: 34 },
          { item: 'voidironOre', qty: [1, 2], weight: 24 }, { item: 'aurelithOre', qty: [1, 1], weight: 12 },
        ]),
      ]),
      dig('sky_summit', 'The Summit Works', [0.68, 0.62], strata([
        { name: 'The Wind Terrace', levelReq: 64, age: 4, yields: [
          { item: 'firstAgeTablet', qty: [1, 1], weight: 30 }, { item: 'elderTablet', qty: [1, 2], weight: 30 },
          { item: 'angelsteel', qty: [1, 1], weight: 10 }, { item: 'meteoricIron', weight: 30 },
        ], blurb: 'Someone carried these stones up here. All of them.' },
      ])),
    ],
  },
  {
    id: 'emberfall', name: 'Emberfall Caldera', coord: { q: 1, r: -3 }, terrain: 'waste', danger: 10, scoutLevelReq: 30,
    blurb: 'Still warm after four hundred years, which is four hundred years longer than it should be.',
    sites: [
      mine('ember_vent', 'The Vent Fields', [0.36, 0.40], [
        layer('Cinder Slopes', 58, [{ item: 'emberstone', qty: [2, 4], weight: 56 }, { item: 'coal', qty: [3, 5], weight: 44 }]),
        layer('The Glass Throat', 80, [
          { item: 'emberstone', qty: [3, 5], weight: 36 }, { item: 'meteoricIron', qty: [1, 2], weight: 24 },
          { item: 'aurelithOre', qty: [1, 1], weight: 16 }, { item: 'dragonbone', qty: [1, 1], weight: 12 }, { item: 'voidironOre', qty: [1, 2], weight: 12 },
        ]),
      ]),
    ],
  },
  {
    id: 'ashensteps', name: 'The Ashen Steps', coord: { q: 2, r: -3 }, terrain: 'waste', danger: 9, scoutLevelReq: 28,
    blurb: 'A stair a mile wide, cut into the ash, going down to nothing anyone has found.',
    sites: [
      dig('ashen_stair', 'The Great Stair', [0.50, 0.36], strata([
        { name: 'Drifted Ash', levelReq: 50, age: 3, yields: [
          { item: 'potsherd', qty: [3, 5], weight: 40 }, { item: 'elderTablet', qty: [1, 2], weight: 34 }, { item: 'shadowash', qty: [2, 4], weight: 26 },
        ] },
        { name: 'The Landing', levelReq: 70, age: 5, yields: [
          { item: 'firstAgeTablet', qty: [1, 2], weight: 40 }, { item: 'chronite', qty: [1, 1], weight: 8 },
          { item: 'voidironOre', qty: [1, 3], weight: 32 }, { item: 'sanguineCrystal', qty: [1, 1], weight: 8 }, { item: 'shadowash', qty: [3, 5], weight: 12 },
        ] },
      ])),
    ],
  },
  {
    id: 'frostgate', name: 'Frostgate', coord: { q: 3, r: -3 }, terrain: 'mountain', danger: 8, scoutLevelReq: 24,
    blurb: 'A pass held by a garrison that has not been relieved in three reigns and does not intend to leave.',
    sites: [
      mine('frost_cut', 'The Pass Cut', [0.34, 0.42], [
        layer('Roadstone', 44, [{ item: 'ironOre', qty: [3, 5], weight: 56 }, { item: 'rimeSalt', qty: [1, 3], weight: 44 }]),
        layer('The Frozen Seam', 66, [
          { item: 'rimeSalt', qty: [3, 5], weight: 40 }, { item: 'mithralOre', qty: [1, 3], weight: 34 }, { item: 'adamantOre', qty: [1, 2], weight: 26 },
        ]),
      ]),
      market('frost_garrison', 'The Garrison Store', [0.70, 0.62], [
        layer('Quartermaster', 40, [
          { item: 'coal', qty: [3, 6], weight: 40 }, { item: 'leather', qty: [2, 4], weight: 34 }, { item: 'steelBar', qty: [1, 2], weight: 26 },
        ]),
      ]),
    ],
  },
  {
    id: 'rimewatch', name: 'Rimewatch', coord: { q: 3, r: -2 }, terrain: 'mountain', danger: 7, scoutLevelReq: 22,
    blurb: 'A watchtower facing north, which tells you what they expected to come from there.',
    sites: [
      dig('rime_tower', 'The Watchtower', [0.50, 0.34], strata([
        { name: 'Fallen Course', levelReq: 42, age: 2, yields: [
          { item: 'sealedTablet', qty: [1, 2], weight: 36 }, { item: 'potsherd', qty: [2, 5], weight: 40 }, { item: 'rimeSalt', qty: [1, 3], weight: 24 },
        ] },
        { name: 'The Signal Room', levelReq: 62, age: 4, yields: [
          { item: 'firstAgeTablet', qty: [1, 1], weight: 24 }, { item: 'elderTablet', qty: [1, 2], weight: 38 },
          { item: 'faeglass', qty: [1, 1], weight: 12 }, { item: 'silverOre', qty: [2, 4], weight: 26 },
        ] },
      ])),
    ],
  },
  {
    id: 'sunkendelve', name: 'The Sunken Delve', coord: { q: 3, r: -1 }, terrain: 'cavern', danger: 9, scoutLevelReq: 32,
    blurb: 'A dwarf-cut mine, abandoned mid-shift. The tools are still where they were set down.',
    sites: [
      delve('sunken_shafts', 'The Shafts', [0.36, 0.38], [
        layer('Working Level', 46, [
          { item: 'mithralOre', qty: [1, 2], weight: 40 }, { item: 'adamantOre', weight: 26 }, { item: 'shadowash', qty: [1, 2], weight: 34 },
        ], { foes: ['ghoul'] }),
        layer('The Flooded Deeps', 68, [
          { item: 'orichalcumOre', qty: [1, 2], weight: 34 }, { item: 'voidironOre', qty: [1, 2], weight: 28 },
          { item: 'firstAgeTablet', qty: [1, 1], weight: 14 }, { item: 'dragonbone', qty: [1, 1], weight: 10 }, { item: 'adamantOre', qty: [2, 3], weight: 14 },
        ], { foes: ['barrowWight'] }),
      ]),
    ],
  },
  {
    id: 'blackfen', name: 'Blackfen', coord: { q: 3, r: 0 }, terrain: 'marsh', danger: 7, scoutLevelReq: 20,
    blurb: 'Eleven villages went into this fen over three centuries. None came out, and all of them are still marked on the old charts.',
    sites: [
      forage('fen_beds', 'The Black Beds', [0.32, 0.38], [
        layer('Sedge', 36, [{ item: 'gloamCap', qty: [1, 2], weight: 50 }, { item: 'marshHerb', qty: [3, 5], weight: 50 }]),
        layer('The Sinking Ground', 58, [
          { item: 'gloamCap', qty: [2, 4], weight: 44 }, { item: 'kingsfoil', qty: [2, 4], weight: 30 }, { item: 'sanguineCrystal', qty: [1, 1], weight: 6 },
          { item: 'shadowash', qty: [1, 2], weight: 20 },
        ]),
      ]),
      dig('fen_villages', 'The Lost Villages', [0.68, 0.64], strata([
        { name: 'Roof Timbers', levelReq: 44, age: 2, yields: [
          { item: 'potsherd', qty: [3, 5], weight: 50 }, { item: 'sealedTablet', qty: [1, 2], weight: 32 }, { item: 'oakLog', qty: [2, 4], weight: 18 },
        ] },
        { name: 'The Bog Bodies', levelReq: 66, age: 4, yields: [
          { item: 'elderTablet', qty: [1, 2], weight: 40 }, { item: 'firstAgeTablet', qty: [1, 1], weight: 16 },
          { item: 'sanguineCrystal', qty: [1, 1], weight: 12 }, { item: 'gloamCap', qty: [2, 4], weight: 32 },
        ] },
      ])),
    ],
  },
  {
    id: 'harrowgate', name: 'Harrowgate', coord: { q: 2, r: 1 }, terrain: 'town', danger: 3, scoutLevelReq: 16,
    blurb: 'The last real town before the marches. Everything expensive here is expensive for a reason.',
    sites: [
      market('harrow_exchange', 'The Exchange', [0.34, 0.40], [
        layer('Open Floor', 30, [
          { item: 'steelBar', qty: [1, 2], weight: 30 }, { item: 'leather', qty: [2, 5], weight: 30 },
          { item: 'blankTablet', qty: [1, 2], weight: 24 }, { item: 'silverOre', qty: [1, 2], weight: 16 },
        ]),
        layer('The Private Rooms', 54, [
          { item: 'argentineBar', qty: [1, 1], weight: 20 }, { item: 'sealedTablet', qty: [1, 2], weight: 30 },
          { item: 'ironbarkLog', qty: [1, 2], weight: 22 }, { item: 'silverOre', qty: [2, 4], weight: 28 },
        ], { blurb: 'Where the Exchange does the business it does not minute.' }),
      ]),
    ],
  },
  {
    id: 'greenmantle', name: 'Greenmantle', coord: { q: 1, r: 2 }, terrain: 'forest', danger: 5, scoutLevelReq: 13,
    blurb: 'A managed wood, beautifully kept, by no one who will admit to keeping it.',
    sites: [
      wood('green_rides', 'The Rides', [0.32, 0.36], [
        layer('Coppiced Rides', 30, [{ item: 'oakLog', qty: [2, 4], weight: 60 }, { item: 'ashLog', qty: [1, 2], weight: 40 }]),
        layer('The Kept Grove', 56, [
          { item: 'ironbarkLog', qty: [1, 2], weight: 40 }, { item: 'ashLog', qty: [3, 4], weight: 36 }, { item: 'heartwood', qty: [1, 1], weight: 6 },
          { item: 'kingsfoil', qty: [2, 3], weight: 18 },
        ]),
      ]),
    ],
  },
  {
    id: 'ninebarrows', name: 'Ninebarrows', coord: { q: 0, r: 3 }, terrain: 'ruin', danger: 6, scoutLevelReq: 15,
    blurb: 'Nine barrows in a line, aligned on nothing in the sky that anyone can identify.',
    sites: [
      dig('nine_line', 'The Barrow Line', [0.50, 0.38], strata([
        { name: 'Turf Caps', levelReq: 32, age: 2, yields: [
          { item: 'potsherd', qty: [2, 5], weight: 54 }, { item: 'sealedTablet', qty: [1, 2], weight: 30 }, { item: 'copperOre', qty: [2, 3], weight: 16 },
        ] },
        { name: 'The Chambers', levelReq: 54, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 2], weight: 42 }, { item: 'dragonbone', qty: [1, 1], weight: 10 },
          { item: 'silverOre', qty: [2, 4], weight: 30 }, { item: 'faeglass', qty: [1, 1], weight: 6 }, { item: 'potsherd', qty: [3, 5], weight: 12 },
        ] },
        { name: 'The Ninth', levelReq: 76, age: 5, yields: [
          { item: 'firstAgeTablet', qty: [1, 2], weight: 38 }, { item: 'heartwood', qty: [1, 1], weight: 10 },
          { item: 'angelsteel', qty: [1, 1], weight: 8 }, { item: 'chronite', qty: [1, 1], weight: 6 }, { item: 'orichalcumOre', qty: [2, 3], weight: 38 },
        ], blurb: 'The ninth barrow has never been opened. The other eight were opened from within.' },
      ])),
    ],
  },
  {
    id: 'tidewrack', name: 'Tidewrack', coord: { q: -1, r: 3 }, terrain: 'coast', danger: 5, scoutLevelReq: 17,
    blurb: 'A shingle beach that collects things. Not always from this sea.',
    sites: [
      forage('tide_strand', 'The Strand', [0.32, 0.62], [
        layer('Wrack Line', 28, [
          { item: 'rimeSalt', qty: [1, 3], weight: 40 }, { item: 'potsherd', qty: [2, 4], weight: 36 }, { item: 'birchLog', qty: [2, 4], weight: 24 },
        ]),
        layer('After the Storms', 50, [
          { item: 'faeglass', qty: [1, 1], weight: 10 }, { item: 'sealedTablet', qty: [1, 1], weight: 24 },
          { item: 'rimeSalt', qty: [2, 4], weight: 36 }, { item: 'meteoricIron', qty: [1, 1], weight: 6 }, { item: 'potsherd', qty: [2, 5], weight: 24 },
        ]),
      ]),
      water('tide_deeps', 'The Long Water', [0.68, 0.36], [
        layer('Offshore', 34, [{ item: 'riverFish', qty: [3, 5], weight: 76 }, { item: 'rimeSalt', qty: [1, 2], weight: 24 }]),
      ]),
    ],
  },
  {
    id: 'gullsreach', name: "Gull's Reach", coord: { q: -2, r: 3 }, terrain: 'coast', danger: 4, scoutLevelReq: 19,
    blurb: 'A fishing hamlet of nine boats that will take your coin and not your questions.',
    sites: [
      water('gull_grounds', 'The Fishing Grounds', [0.34, 0.44], [
        layer('Inshore', 26, [{ item: 'riverFish', qty: [3, 4], weight: 100 }]),
        layer('The Banks', 52, [{ item: 'riverFish', qty: [4, 7], weight: 66 }, { item: 'rimeSalt', qty: [2, 3], weight: 24 }, { item: 'faeglass', qty: [1, 1], weight: 10 }]),
      ]),
      market('gull_quay', 'The Quay', [0.68, 0.62], [
        layer('Boat Trade', 24, [{ item: 'leather', qty: [1, 3], weight: 50 }, { item: 'birchLog', qty: [2, 4], weight: 50 }]),
      ]),
    ],
  },
  {
    id: 'weepingshore', name: 'The Weeping Shore', coord: { q: -3, r: 3 }, terrain: 'coast', danger: 8, scoutLevelReq: 34,
    blurb: 'The cliffs here run with fresh water year round and nobody has found the spring.',
    sites: [
      dig('weep_cliffs', 'The Cliff Cuts', [0.50, 0.36], strata([
        { name: 'Sea Caves', levelReq: 52, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 2], weight: 36 }, { item: 'faeglass', qty: [1, 1], weight: 14 },
          { item: 'rimeSalt', qty: [2, 4], weight: 30 }, { item: 'potsherd', qty: [2, 5], weight: 20 },
        ] },
        { name: 'The Weeping Face', levelReq: 72, age: 5, yields: [
          { item: 'firstAgeTablet', qty: [1, 2], weight: 36 }, { item: 'faeglass', qty: [1, 2], weight: 20 },
          { item: 'angelsteel', qty: [1, 1], weight: 10 }, { item: 'sanguineCrystal', qty: [1, 1], weight: 8 }, { item: 'aurelithOre', qty: [1, 1], weight: 26 },
        ] },
      ])),
    ],
  },
  {
    id: 'whitethorn', name: 'Whitethorn', coord: { q: -3, r: 2 }, terrain: 'forest', danger: 6, scoutLevelReq: 21,
    blurb: 'Hawthorn in flower all year. Cutting one is a hanging offence and always has been.',
    sites: [
      wood('white_thicket', 'The Thicket', [0.32, 0.36], [
        layer('Outer Thorn', 34, [{ item: 'ashLog', qty: [2, 3], weight: 60 }, { item: 'kingsfoil', qty: [1, 2], weight: 40 }]),
        layer('The White Heart', 60, [
          { item: 'heartwood', qty: [1, 1], weight: 8 }, { item: 'ironbarkLog', qty: [1, 2], weight: 36 },
          { item: 'kingsfoil', qty: [3, 4], weight: 32 }, { item: 'faeglass', qty: [1, 1], weight: 8 }, { item: 'ashLog', qty: [3, 4], weight: 16 },
        ]),
      ]),
    ],
  },
  {
    id: 'moondial', name: 'Moondial Ring', coord: { q: -3, r: 1 }, terrain: 'ruin', danger: 7, scoutLevelReq: 27,
    blurb: 'Sixty stones. It keeps time, and not the time anyone here uses.',
    sites: [
      dig('moon_ring', 'The Ring', [0.50, 0.34], strata([
        { name: 'The Bank and Ditch', levelReq: 46, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 2], weight: 40 }, { item: 'potsherd', qty: [3, 5], weight: 34 }, { item: 'silverOre', qty: [2, 3], weight: 26 },
        ] },
        { name: 'Beneath the Altar', levelReq: 68, age: 5, yields: [
          { item: 'firstAgeTablet', qty: [1, 2], weight: 42 }, { item: 'chronite', qty: [1, 1], weight: 12 },
          { item: 'faeglass', qty: [1, 2], weight: 16 }, { item: 'orichalcumOre', qty: [1, 3], weight: 30 },
        ], blurb: 'The altar stone is cut from something that does not occur on this island.' },
      ])),
    ],
  },
  {
    id: 'hollowhome', name: 'Hollowhome', coord: { q: -3, r: 0 }, terrain: 'cavern', danger: 8, scoutLevelReq: 25,
    blurb: 'A cave system people lived in for eight hundred years and then left over the course of a single winter.',
    sites: [
      delve('hollow_halls', 'The Living Halls', [0.34, 0.38], [
        layer('The Hearth Caves', 40, [
          { item: 'potsherd', qty: [2, 4], weight: 40 }, { item: 'shadowash', qty: [1, 2], weight: 30 }, { item: 'ironOre', qty: [2, 4], weight: 30 },
        ], { foes: ['barrowRat', 'ghoul'] }),
        layer('The Lower Warren', 64, [
          { item: 'voidironOre', qty: [1, 2], weight: 30 }, { item: 'elderTablet', qty: [1, 2], weight: 26 },
          { item: 'shadowash', qty: [2, 4], weight: 30 }, { item: 'dragonbone', qty: [1, 1], weight: 14 },
        ], { foes: ['ghoul', 'barrowWight'] }),
      ]),
    ],
  },
  {
    id: 'sunderfell', name: 'Sunderfell', coord: { q: -2, r: -1 }, terrain: 'mountain', danger: 6, scoutLevelReq: 12,
    blurb: 'A mountain split top to bottom by a single clean cut. Geology does not do this.',
    sites: [
      mine('sunder_cleft', 'The Cleft', [0.34, 0.36], [
        layer('The Sundered Face', 30, [{ item: 'ironOre', qty: [2, 4], weight: 56 }, { item: 'silverOre', qty: [1, 2], weight: 44 }]),
        layer('The Mirror Walls', 56, [
          { item: 'mithralOre', qty: [1, 2], weight: 38 }, { item: 'silverOre', qty: [2, 4], weight: 30 },
          { item: 'adamantOre', weight: 20 }, { item: 'faeglass', qty: [1, 1], weight: 12 },
        ], { blurb: 'Both faces are polished. Neither has weathered.' }),
      ]),
    ],
  },
  {
    id: 'longbarrow', name: 'The Long Barrow', coord: { q: -1, r: -2 }, terrain: 'ruin', danger: 5, scoutLevelReq: 7,
    blurb: 'Four hundred feet of barrow for one body, and the body is not the interesting part.',
    sites: [
      dig('long_mound', 'The Mound', [0.50, 0.36], strata([
        { name: 'The Forecourt', levelReq: 18, age: 1, yields: [
          { item: 'potsherd', qty: [2, 4], weight: 60 }, { item: 'sealedTablet', qty: [1, 1], weight: 28 }, { item: 'copperOre', qty: [1, 3], weight: 12 },
        ] },
        { name: 'The Gallery', levelReq: 38, age: 3, yields: [
          { item: 'elderTablet', qty: [1, 1], weight: 40 }, { item: 'sealedTablet', qty: [1, 2], weight: 24 },
          { item: 'silverOre', qty: [1, 3], weight: 24 }, { item: 'dragonbone', qty: [1, 1], weight: 12 },
        ] },
        { name: 'The End Chamber', levelReq: 58, age: 4, yields: [
          { item: 'firstAgeTablet', qty: [1, 1], weight: 26 }, { item: 'elderTablet', qty: [1, 2], weight: 34 },
          { item: 'heartwood', qty: [1, 1], weight: 8 }, { item: 'orichalcumOre', qty: [1, 2], weight: 32 },
        ] },
      ])),
    ],
  },
]

/** Rings 4–5: the Outlands, generated rather than authored. */
export const REGIONS: RegionDef[] = [...AUTHORED, ...generateOutlands()]

export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r]))

export const AUTHORED_REGIONS = AUTHORED

/** Resolve a site *layer* id to everything around it. */
export function findNode(layerId: string):
  | { region: RegionDef; site: RegionDef['sites'][number]; layer: RegionDef['sites'][number]['layers'][number] }
  | undefined {
  for (const region of REGIONS) {
    for (const s of region.sites) {
      const l = s.layers.find((x) => x.id === layerId)
      if (l) return { region, site: s, layer: l }
    }
  }
  return undefined
}

export function regionOfSite(siteId: string): RegionDef | undefined {
  return REGIONS.find((r) => r.sites.some((s) => s.id === siteId))
}

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2
}

export function ringOf(region: RegionDef): number {
  return hexDistance(region.coord, { q: 0, r: 0 })
}

/** Known from the first minute: home and its six neighbours. */
export const STARTING_REGIONS = REGIONS.filter((r) => ringOf(r) <= 1).map((r) => r.id)
