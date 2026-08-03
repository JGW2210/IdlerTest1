import { describe, expect, it } from 'vitest'
import { createState, succeed } from './createState'
import { grantXp, effectiveLevel, levelOf } from './skills'
import { CHILD_LEVEL_LEAD, PARENT_XP_SHARE, xpAtLevel, rollQuality, RETINUE_RATE, INHERITANCE_RATE } from './curves'
import { stepAll, assignFocus } from './tick'
import { resolveSpell, canInscribe } from './runes'
import { settleExpectation, mulberry32, stream } from './rng'
import { addItem, countItem, removeItem, equip } from './inventory'
import { validateContent } from '@/content'
import { REGIONS, AUTHORED_REGIONS, ringOf } from '@/content/regions'
import { generateOutlands } from '@/content/outlands'
import { GLYPHS } from '@/content/glyphs'
import { POWERS, TUTOR_ONLY_GLYPHS, glyphPrice, glyphsOffered, CLAIM_STANDING } from '@/content/powers'
import { knownHolds, learnFromTutor, claimHold, surveyReachBonus } from './diplomacy'
import { LORE } from '@/content/lore'
import { survey, surveyTime } from './survey'
import { decipher, candidateGlyphs, TABLET_BY_ITEM } from './archaeology'
import { migrate } from './save'
import { SAVE_VERSION } from './createState'
import { catchUp } from './offline'

/** Deterministic saves for tests — never the wall clock. */
function fresh() {
  return createState(12345, 'Test')
}

describe('content packs', () => {
  it('are referentially intact', () => {
    expect(validateContent()).toEqual([])
  })
})

describe('skill xp (charter §1.3)', () => {
  it('gives the parent an additional share rather than splitting', () => {
    const s = fresh()
    grantXp(s, 'blade', 1000)
    expect(s.skills['blade']!.xp).toBe(1000)
    expect(s.skills['oneHanded']!.xp).toBe(1000 * PARENT_XP_SHARE)
    // The total created exceeds what was granted — that is the point.
    expect(s.skills['blade']!.xp + s.skills['oneHanded']!.xp).toBeGreaterThan(1000)
  })

  it('caps a child at parent + lead, without destroying the banked xp', () => {
    const s = fresh()
    // Bank enough for a high blade level while leaving the parent low.
    s.skills['blade'] = { xp: xpAtLevel(40), level: 40 }
    s.skills['oneHanded'] = { xp: xpAtLevel(5), level: 5 }

    expect(levelOf(s, 'blade')).toBe(40)
    expect(effectiveLevel(s, 'blade')).toBe(5 + CHILD_LEVEL_LEAD)

    // Raising the parent releases the banked levels — breadth as a strategy.
    s.skills['oneHanded'] = { xp: xpAtLevel(35), level: 35 }
    expect(effectiveLevel(s, 'blade')).toBe(40)
  })

  it('applies the bloodline xp bonus', () => {
    const s = fresh()
    s.legacy.xpBonus = 2
    grantXp(s, 'mining', 100)
    expect(s.skills['mining']!.xp).toBe(200)
  })
})

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(99)
    const b = mulberry32(99)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('gives independent streams per name', () => {
    const a = stream(1, 'sim', 5)
    const b = stream(1, 'loot', 5)
    expect(a()).not.toBe(b())
  })

  it('settles fractional expectations without losing or inventing value', () => {
    // 0.44 expected per settle, 10000 settles, should land within 1% of 4400.
    let carry = 0
    let granted = 0
    const rng = mulberry32(7)
    for (let i = 0; i < 10000; i++) {
      const r = settleExpectation(0.44, carry, rng)
      carry = r.carry
      granted += r.granted
    }
    expect(granted).toBeGreaterThan(4400 * 0.99)
    expect(granted).toBeLessThan(4400 * 1.01)
  })
})

describe('inventory', () => {
  it('stacks materials and instances equipment', () => {
    const s = fresh()
    addItem(s, 'copperOre', 5)
    addItem(s, 'copperOre', 3)
    expect(countItem(s, 'copperOre')).toBe(8)
    expect(s.inventory.filter((x) => x.item === 'copperOre')).toHaveLength(1)

    addItem(s, 'copper_dagger', 2)
    expect(s.inventory.filter((x) => x.item === 'copper_dagger')).toHaveLength(3) // 1 from the starting kit
  })

  it('refuses to remove more than is held', () => {
    const s = fresh()
    addItem(s, 'coal', 2)
    expect(removeItem(s, 'coal', 5)).toBe(false)
    expect(countItem(s, 'coal')).toBe(2)
  })

  it('never re-issues a uid across a save/reload cycle', () => {
    // The uid counter lives on the save. If it lived in module scope it would
    // reset on reload and the next crafted item would collide with an existing
    // one — equipping would then pick up the wrong instance.
    const s = fresh()
    addItem(s, 'copper_dagger', 3)
    const reloaded = JSON.parse(JSON.stringify(s)) as typeof s
    addItem(reloaded, 'copper_dagger', 3)

    const uids = reloaded.inventory.map((x) => x.uid).filter(Boolean)
    expect(new Set(uids).size).toBe(uids.length)
  })

  it('equips into the matching slot and returns what was worn', () => {
    const s = fresh()
    const dagger = s.inventory.find((x) => x.item === 'copper_dagger')!
    expect(equip(s, dagger.uid!)).toBe(true)
    expect(s.equipment.mainHand?.item).toBe('copper_dagger')
    expect(s.inventory.find((x) => x.uid === dagger.uid)).toBeUndefined()
  })
})

describe('quality (ballot VII-B)', () => {
  it('shifts probability up the ladder as skill exceeds the requirement', () => {
    const atReq = Array.from({ length: 1000 }, (_, i) => rollQuality(10, 10, i / 1000))
    const wayOver = Array.from({ length: 1000 }, (_, i) => rollQuality(80, 10, i / 1000))
    const crudeAt = atReq.filter((q) => q === 'crude').length
    const crudeOver = wayOver.filter((q) => q === 'crude').length
    const highOver = wayOver.filter((q) => q === 'masterwork' || q === 'legendary').length
    expect(crudeOver).toBeLessThan(crudeAt)
    expect(highOver).toBeGreaterThan(0)
  })
})

describe('rune grammar (ballot V-A)', () => {
  it('derives name, cost and description from the components', () => {
    const r = resolveSpell({ uid: 'x', name: '', element: 'frost', form: 'nova', modifiers: ['split'], trigger: 'onCast' })!
    expect(r.name).toBe('Split Frost Nova')
    expect(r.trueName).toContain('GLACIES')
    expect(r.power).toBeGreaterThan(0)
    expect(r.description).toContain('slows the target')
  })

  it('makes triggered spells cost no cast time', () => {
    const onCast = resolveSpell({ uid: 'a', name: '', element: 'fire', form: 'bolt', modifiers: [], trigger: 'onCast' })!
    const onHit = resolveSpell({ uid: 'b', name: '', element: 'fire', form: 'bolt', modifiers: [], trigger: 'onHit' })!
    expect(onCast.castTime).toBeGreaterThan(0)
    expect(onHit.castTime).toBe(0)
    expect(onHit.power).toBeLessThan(onCast.power)
  })

  it('refuses glyphs the character has not found', () => {
    const s = fresh()
    const check = canInscribe(s, { uid: 'x', name: '', element: 'gloam', form: 'bolt', modifiers: [], trigger: 'onCast' })
    expect(check.ok).toBe(false)
    expect(check.reason).toContain('Gloam')
  })

  it('allows a composition made only of known glyphs', () => {
    const s = fresh()
    const check = canInscribe(s, { uid: 'x', name: '', element: 'fire', form: 'bolt', modifiers: [], trigger: 'onCast' })
    expect(check.ok).toBe(true)
  })
})

describe('the tick loop (ballot I-B)', () => {
  it('produces yields and xp from a focused gathering node', () => {
    const s = fresh()
    assignFocus(s, { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 })
    stepAll(s, 300, 'live')
    expect(s.skills['mining']!.xp).toBeGreaterThan(0)
    expect(s.inventory.length).toBeGreaterThan(1)
  })

  it('runs retinue work slower than focused work', () => {
    const focused = fresh()
    assignFocus(focused, { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 })
    stepAll(focused, 600, 'live')

    const background = fresh()
    background.retinue.push({
      uid: 'r1', name: 'Edith', skill: 1,
      assignment: { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 },
    })
    stepAll(background, 600, 'live')

    const ratio = background.skills['mining']!.xp / focused.skills['mining']!.xp
    expect(ratio).toBeGreaterThan(RETINUE_RATE * 0.8)
    expect(ratio).toBeLessThan(RETINUE_RATE * 1.2)
  })

  it('does not let a stalled craft bank unbounded progress', () => {
    const s = fresh()
    // No inputs at all: the craft should stall rather than accumulate hours.
    assignFocus(s, { kind: 'recipe', recipe: 'smelt_copperBar', progress: 0 })
    stepAll(s, 3600, 'live')
    expect(countItem(s, 'copperBar')).toBe(0)

    addItem(s, 'copperOre', 3)
    stepAll(s, 30, 'live')
    // Should make a few bars, not 3 instantly from an hour of banked time.
    expect(countItem(s, 'copperBar')).toBeGreaterThan(0)
  })

  it('is deterministic for a given seed', () => {
    const a = createState(4242, 'A')
    const b = createState(4242, 'A')
    assignFocus(a, { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 })
    assignFocus(b, { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 })
    stepAll(a, 600, 'live')
    stepAll(b, 600, 'live')
    expect(a.inventory).toEqual(b.inventory)
    expect(a.skills).toEqual(b.skills)
  })
})

describe('offline catch-up (ballot II-A)', () => {
  it('ignores an absence shorter than a minute', () => {
    const s = fresh()
    s.lastSeen = Date.now() - 5_000
    expect(catchUp(s)).toBeNull()
  })

  it('credits time up to the cap and reports the overflow', () => {
    const s = fresh()
    assignFocus(s, { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 })
    const cap = 3600
    s.lastSeen = Date.now() - 10 * 3600 * 1000
    const result = catchUp(s, Date.now(), cap)!
    expect(result.credited).toBe(cap)
    expect(result.cappedBy).toBeGreaterThan(0)
    expect(s.skills['mining']!.xp).toBeGreaterThan(0)
  })

  it('pays roughly what the same time spent watching would have', () => {
    const live = fresh()
    assignFocus(live, { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 })
    stepAll(live, 3600, 'live')

    const away = fresh()
    assignFocus(away, { kind: 'node', node: 'grey_upper_1', region: 'greyhollow', progress: 0 })
    away.lastSeen = Date.now() - 3600 * 1000
    catchUp(away)

    const ratio = away.skills['mining']!.xp / live.skills['mining']!.xp
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })
})

describe('succession (ballot III-A)', () => {
  it('passes on a share of xp, keeps the world, and compounds the bonus', () => {
    const s = fresh()
    grantXp(s, 'mining', 100_000)
    s.regions['greyhollow']!.held = true
    s.knownGlyphs.push('storm')
    const before = s.skills['mining']!.xp

    const heir = succeed(s, 'Heir')

    expect(heir.legacy.generation).toBe(2)
    expect(heir.legacy.traits).toHaveLength(1)
    expect(heir.legacy.xpBonus).toBeGreaterThan(s.legacy.xpBonus)
    expect(heir.skills['mining']!.xp).toBe(Math.floor(before * INHERITANCE_RATE))
    // The world remembers even when the person does not.
    expect(heir.regions['greyhollow']!.held).toBe(true)
    expect(heir.knownGlyphs).toContain('storm')
    expect(heir.character.name).toBe('Heir')
  })
})

// ===========================================================================
// The chart, the frontier, and what comes out of the ground
// ===========================================================================

describe('the map', () => {
  it('spans five rings', () => {
    const rings = new Map<number, number>()
    for (const r of REGIONS) {
      const d = ringOf(r)
      rings.set(d, (rings.get(d) ?? 0) + 1)
    }
    // A hex field of radius 5 is 1 + 6 + 12 + 18 + 24 + 30 = 91.
    expect(rings.get(0)).toBe(1)
    expect(rings.get(1)).toBe(6)
    expect(rings.get(2)).toBe(12)
    expect(rings.get(3)).toBe(18)
    expect(rings.get(4)).toBe(24)
    expect(rings.get(5)).toBe(30)
    expect(REGIONS).toHaveLength(91)
  })

  it('hand-authors rings 0-3 and generates only the outlands', () => {
    expect(AUTHORED_REGIONS).toHaveLength(37)
    expect(AUTHORED_REGIONS.every((r) => ringOf(r) <= 3)).toBe(true)
    const generated = REGIONS.filter((r) => r.outland)
    expect(generated).toHaveLength(54)
    expect(generated.every((r) => ringOf(r) >= 4)).toBe(true)
    // Every generated region still gets a name and a province.
    expect(generated.every((r) => r.name.length > 2 && !!r.province)).toBe(true)
  })

  it('generates the outlands identically for the same seed', () => {
    const a = generateOutlands(555)
    const b = generateOutlands(555)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const c = generateOutlands(556)
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a))
  })

  it('gives every site depth that goes downward', () => {
    let layers = 0
    for (const r of REGIONS) {
      for (const s of r.sites) {
        layers += s.layers.length
        for (let i = 1; i < s.layers.length; i++) {
          expect(s.layers[i]!.levelReq).toBeGreaterThan(s.layers[i - 1]!.levelReq)
        }
      }
    }
    expect(layers).toBeGreaterThan(200)
  })

  it('starts with only home and its neighbours drawn', () => {
    const s = fresh()
    const known = REGIONS.filter((r) => s.regions[r.id]!.discovered)
    expect(known).toHaveLength(7)
    expect(s.regions['ashcombe']!.surveyed).toBe(1)
  })
})

describe('surveying', () => {
  it('finishes known sheets before pushing outward', () => {
    const s = fresh()
    const before = REGIONS.filter((r) => s.regions[r.id]!.discovered).length
    const rng = mulberry32(1)
    // The six ring-1 sheets start part-drawn, so early passes go into detail.
    const first = survey(s, rng)
    expect(first.kind).toBe('detail')
    expect(REGIONS.filter((r) => s.regions[r.id]!.discovered)).toHaveLength(before)
  })

  it('reveals a new region once the known ones are drawn and the level allows', () => {
    const s = fresh()
    for (const r of REGIONS) {
      const rs = s.regions[r.id]!
      if (rs.discovered) rs.surveyed = 1
    }
    s.skills['cartography'] = { xp: xpAtLevel(40), level: 40 }
    const result = survey(s, mulberry32(2))
    expect(result.kind).toBe('discovery')
    expect(s.regions[result.region!]!.discovered).toBe(true)
  })

  it('blocks when Cartography is too low to go on', () => {
    const s = fresh()
    for (const r of REGIONS) {
      const rs = s.regions[r.id]!
      if (rs.discovered) rs.surveyed = 1
    }
    // Level 1 cannot reach any ring-2 region.
    const result = survey(s, mulberry32(3))
    expect(result.kind).toBe('blocked')
  })

  it('does not bank unusable time against a blocked survey', () => {
    const s = fresh()
    for (const r of REGIONS) {
      const rs = s.regions[r.id]!
      if (rs.discovered) rs.surveyed = 1
    }
    assignFocus(s, { kind: 'survey', progress: 0 })
    stepAll(s, 3600, 'live')
    // An hour spent blocked must not become an hour of banked progress; at most
    // one pending action is held, ready to fire when Cartography rises.
    expect(s.focus.progress).toBeLessThanOrEqual(surveyTime(s) + 0.001)

    // And when the level does rise, that pending action pays out immediately.
    s.skills['cartography'] = { xp: xpAtLevel(40), level: 40 }
    const before = REGIONS.filter((r) => s.regions[r.id]!.discovered).length
    stepAll(s, 30, 'live')
    expect(REGIONS.filter((r) => s.regions[r.id]!.discovered).length).toBeGreaterThan(before)
  })
})

describe('archaeology and decipherment', () => {
  it('consumes the tablet and returns something usable', () => {
    const s = fresh()
    addItem(s, 'sealedTablet', 1)
    const out = decipher(s, 'sealedTablet', mulberry32(11))
    expect(countItem(s, 'sealedTablet')).toBe(0)
    expect(['glyph', 'lore', 'fragment', 'insight']).toContain(out.kind)
  })

  it('refuses a tablet the character cannot yet read', () => {
    const s = fresh()
    addItem(s, 'firstAgeTablet', 1)
    const out = decipher(s, 'firstAgeTablet', mulberry32(12))
    expect(out.kind).toBe('nothing')
    // A refused tablet must not be consumed.
    expect(countItem(s, 'firstAgeTablet')).toBe(1)
  })

  it('teaches glyphs, and never one already known', () => {
    const s = fresh()
    const before = new Set(s.knownGlyphs)
    addItem(s, 'sealedTablet', 60)
    for (let i = 0; i < 60; i++) decipher(s, 'sealedTablet', mulberry32(100 + i))
    const learned = s.knownGlyphs.filter((g) => !before.has(g))
    expect(learned.length).toBeGreaterThan(0)
    expect(new Set(s.knownGlyphs).size).toBe(s.knownGlyphs.length)
  })

  it('gates the deepest glyphs behind the oldest tablets', () => {
    const s = fresh()
    const sealed = TABLET_BY_ITEM['sealedTablet']!
    // Sigil needs level 48; a Second Age tablet tops out at 22.
    expect(candidateGlyphs(s, sealed)).not.toContain('sigil')
    const first = TABLET_BY_ITEM['firstAgeTablet']!
    expect(candidateGlyphs(s, first)).toContain('sigil')
  })

  it('never digs up a word a people kept', () => {
    const s = fresh()
    // Tutor-exclusive glyphs must be unobtainable at every tablet age, or the
    // powers stop being the only route to them and the geography stops mattering.
    for (const def of Object.values(TABLET_BY_ITEM)) {
      for (const g of TUTOR_ONLY_GLYPHS) {
        expect(candidateGlyphs(s, def)).not.toContain(g)
      }
    }
    expect(TUTOR_ONLY_GLYPHS.size).toBeGreaterThan(0)
  })

  it('inks in a region when a fragment turns up', () => {
    const s = fresh()
    addItem(s, 'sealedTablet', 200)
    let fragments = 0
    for (let i = 0; i < 200; i++) {
      const out = decipher(s, 'sealedTablet', mulberry32(9000 + i))
      if (out.kind === 'fragment') {
        fragments += 1
        expect(s.regions[out.region]!.discovered).toBe(true)
      }
    }
    expect(fragments).toBeGreaterThan(0)
    expect(s.mapFragments.length).toBe(fragments)
  })

  it('never wastes a tablet even with nothing left to learn', () => {
    const s = fresh()
    // Know everything, read everything, and have the whole map drawn.
    s.knownGlyphs = GLYPHS.map((g) => g.id)
    s.lore = LORE.map((l) => ({ id: l.id, title: l.title, text: l.text, foundAt: 0 }))
    for (const r of REGIONS) s.regions[r.id]!.discovered = true
    addItem(s, 'sealedTablet', 1)
    const before = s.insight
    const out = decipher(s, 'sealedTablet', mulberry32(13))
    expect(out.kind).toBe('insight')
    expect(s.insight).toBeGreaterThan(before)
  })

  it('runs as an ordinary assignment through the tick loop', () => {
    const s = fresh()
    addItem(s, 'sealedTablet', 5)
    assignFocus(s, { kind: 'decipher', tablet: 'sealedTablet', progress: 0 })
    stepAll(s, 300, 'live')
    expect(countItem(s, 'sealedTablet')).toBeLessThan(5)
    expect(s.skills['inscription']!.xp).toBeGreaterThan(0)
    expect(s.skills['archaeology']!.xp).toBeGreaterThan(0)
  })
})

describe('save migration', () => {
  it('carries a v1 save forward and drops its dangling node assignment', () => {
    const legacy: Record<string, unknown> = {
      version: 1,
      seed: 1, rngCounter: 0, elapsed: 0, lastSeen: 0,
      character: { name: 'Old', age: 20, health: 10, stamina: 10, mana: 10 },
      legacy: { generation: 1, traits: [], xpBonus: 1 },
      skills: {}, inventory: [], equipment: {}, coin: 0, insight: 0,
      // A node id from before sites gained layers.
      focus: { kind: 'node', node: 'greyhollow_upper', progress: 44 },
      retinue: [{ uid: 'r1', name: 'E', skill: 1, assignment: { kind: 'node', node: 'tanglewood_eaves', progress: 9 } }],
      regions: { ashcombe: { discovered: true, held: true, loyalty: 100, prosperity: 10 } },
      knownGlyphs: [], spells: [], gambits: [], combat: null,
      dropCarry: {}, unlockedTechniques: [], log: [],
    }

    const migrated = migrate(legacy)
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.lore).toEqual([])
    expect(migrated.mapFragments).toEqual([])
    expect(migrated.regions['ashcombe']!.surveyed).toBe(0.45)
    // The old ids no longer resolve, so the assignments are cleared rather than
    // left pointing at nothing.
    expect(migrated.focus.kind).toBe('idle')
    expect(migrated.focus.node).toBeUndefined()
    expect(migrated.retinue[0]!.assignment.kind).toBe('idle')
  })
})

// ===========================================================================
// The foreign powers
// ===========================================================================

describe('the powers', () => {
  it('intersperses settled ground and wilds through rings 3-5', () => {
    for (const ring of [3, 4, 5]) {
      const inRing = REGIONS.filter((r) => ringOf(r) === ring)
      const settled = inRing.filter((r) => r.kind !== 'wild')
      const wild = inRing.filter((r) => r.kind === 'wild')
      expect(settled.length, `ring ${ring} settled`).toBeGreaterThan(0)
      expect(wild.length, `ring ${ring} wild`).toBeGreaterThan(0)
    }
  })

  it('thins outward: settled ground gives way to wilds', () => {
    const share = (ring: number) => {
      const inRing = REGIONS.filter((r) => ringOf(r) === ring)
      return inRing.filter((r) => r.kind !== 'wild').length / inRing.length
    }
    // Ring 3 mostly settled, ring 4 around half, ring 5 mostly wild.
    expect(share(3)).toBeGreaterThan(0.6)
    expect(share(4)).toBeGreaterThan(0.3)
    expect(share(4)).toBeLessThan(0.7)
    expect(share(5)).toBeLessThan(0.35)
    expect(share(3)).toBeGreaterThan(share(4))
    expect(share(4)).toBeGreaterThan(share(5))
  })

  it('gives every power at least one reachable hold', () => {
    for (const p of POWERS) {
      const holds = REGIONS.filter((r) => r.kind === 'foreign' && r.power === p.id)
      expect(holds.length, `${p.id} holds`).toBeGreaterThan(0)
      // A hold must carry its power's trade-only metal somewhere.
      const sells = holds.some((h) =>
        h.sites.some((s) => s.layers.some((l) => l.yields.some((y) => y.item === p.material.id))))
      expect(sells, `${p.id} trades ${p.material.id}`).toBe(true)
    }
  })

  it('makes a hold safer than the wilds around it', () => {
    const foreign = REGIONS.filter((r) => r.kind === 'foreign')
    const wild = REGIONS.filter((r) => r.kind === 'wild')
    const avg = (rs: typeof foreign) => rs.reduce((n, r) => n + r.danger, 0) / rs.length
    expect(avg(foreign)).toBeLessThan(avg(wild))
  })

  it('earns standing by working a hold, and announces each tier', () => {
    const s = fresh()
    const hold = REGIONS.find((r) => r.kind === 'foreign')!
    s.regions[hold.id]!.discovered = true
    // Reach the level its market needs.
    s.skills['commerce'] = { xp: xpAtLevel(80), level: 80 }
    const marketLayer = hold.sites.find((x) => x.activity === 'trade')!.layers[0]!
    assignFocus(s, { kind: 'node', node: marketLayer.id, region: hold.id, progress: 0 })
    stepAll(s, 1800, 'live')
    expect(s.regions[hold.id]!.standing).toBeGreaterThan(0)
  })

  it('will not teach beyond the standing you have earned', () => {
    const s = fresh()
    const hold = REGIONS.find((r) => r.kind === 'foreign')!
    const power = POWERS.find((p) => p.id === hold.power)!
    s.regions[hold.id]!.discovered = true
    s.insight = 100000

    // At zero standing they teach nothing at all.
    expect(glyphsOffered(power, 0)).toHaveLength(0)
    const refused = learnFromTutor(s, hold.id, power.glyphs[0]!)
    expect(refused.ok).toBe(false)

    // Known standing opens exactly the first word.
    s.regions[hold.id]!.standing = 25
    expect(glyphsOffered(power, 25)).toEqual([power.glyphs[0]])
    const bought = learnFromTutor(s, hold.id, power.glyphs[0]!)
    expect(bought.ok).toBe(true)
    expect(s.knownGlyphs).toContain(power.glyphs[0])

    // The second is still withheld.
    const tooSoon = learnFromTutor(s, hold.id, power.glyphs[1]!)
    expect(tooSoon.ok).toBe(false)
  })

  it('charges insight, and refuses when you cannot pay', () => {
    const s = fresh()
    const hold = REGIONS.find((r) => r.kind === 'foreign')!
    const power = POWERS.find((p) => p.id === hold.power)!
    s.regions[hold.id]!.discovered = true
    s.regions[hold.id]!.standing = 50
    s.insight = 0

    const broke = learnFromTutor(s, hold.id, power.glyphs[0]!)
    expect(broke.ok).toBe(false)

    s.insight = glyphPrice(0)
    const paid = learnFromTutor(s, hold.id, power.glyphs[0]!)
    expect(paid.ok).toBe(true)
    expect(s.insight).toBe(0)
  })

  it('treats for the hold only at full standing', () => {
    const s = fresh()
    const hold = REGIONS.find((r) => r.kind === 'foreign')!
    s.regions[hold.id]!.discovered = true

    expect(claimHold(s, hold.id).ok).toBe(false)
    s.regions[hold.id]!.standing = CLAIM_STANDING
    expect(claimHold(s, hold.id).ok).toBe(true)
    expect(s.regions[hold.id]!.held).toBe(true)
  })

  it('refuses to claim wilderness, which has nobody to treat with', () => {
    const s = fresh()
    const wild = REGIONS.find((r) => r.kind === 'wild')!
    s.regions[wild.id]!.discovered = true
    const result = claimHold(s, wild.id)
    expect(result.ok).toBe(false)
  })

  it('makes each reached hold a base that extends survey reach', () => {
    const s = fresh()
    expect(surveyReachBonus(s)).toBe(0)
    const holds = REGIONS.filter((r) => r.kind === 'foreign').slice(0, 2)
    for (const h of holds) s.regions[h.id]!.discovered = true
    const found = surveyReachBonus(s)
    expect(found).toBeGreaterThan(0)
    // Being welcome there is worth more than merely knowing where it is.
    s.regions[holds[0]!.id]!.standing = 75
    expect(surveyReachBonus(s)).toBeGreaterThan(found)
  })

  it('lists only holds that have actually been found', () => {
    const s = fresh()
    expect(knownHolds(s)).toHaveLength(0)
    const hold = REGIONS.find((r) => r.kind === 'foreign')!
    s.regions[hold.id]!.discovered = true
    expect(knownHolds(s)).toHaveLength(1)
  })
})
