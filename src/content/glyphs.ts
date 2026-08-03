import type { GlyphDef } from '@/engine/types'

/**
 * The rune grammar (ballot V-A).
 *
 * A spell is a composed sentence — [Element] + [Form] + [Modifiers] + [Trigger]
 * — and its cost, cast time and power are *computed* from the parts rather than
 * authored per spell. Six elements, eight forms, eight modifiers and six
 * triggers already generate tens of thousands of legitimate spells, so the
 * limiting factor is the player's cleverness rather than a drop table.
 *
 * Glyphs are found, not bought: excavation, dungeon depths, tutors in Aldermarch,
 * and paid experimentation. That is what makes Archaeology the skill that
 * unlocks other skills rather than a slower kind of mining.
 */
export const GLYPHS: GlyphDef[] = [
  // -------------------------------------------------------------- elements
  { id: 'fire', name: 'Fire', kind: 'element', root: 'Ignis', power: 1.25, cost: 1.0, cast: 1.0, levelReq: 1, clause: 'burns for 30% of the hit over 6s' },
  { id: 'frost', name: 'Frost', kind: 'element', root: 'Glacies', power: 1.0, cost: 1.0, cast: 1.0, levelReq: 1, clause: 'slows the target by 35%' },
  { id: 'storm', name: 'Storm', kind: 'element', root: 'Fulgur', power: 1.1, cost: 1.1, cast: 0.95, levelReq: 8, clause: 'doubles critical chance against wet or metal-clad foes' },
  { id: 'stone', name: 'Stone', kind: 'element', root: 'Petra', power: 1.15, cost: 1.05, cast: 1.15, levelReq: 14, clause: 'strips 20 armour on hit' },
  { id: 'gale', name: 'Gale', kind: 'element', root: 'Ventus', power: 0.85, cost: 0.85, cast: 0.75, levelReq: 20, clause: 'casts far faster and can displace the target' },
  { id: 'gloam', name: 'Gloam', kind: 'element', root: 'Umbra', power: 1.05, cost: 1.15, cast: 1.05, levelReq: 30, clause: 'returns 15% of damage dealt as health' },

  // ----------------------------------------------------------------- forms
  { id: 'bolt', name: 'Bolt', kind: 'form', root: '-ictus', power: 34, cost: 8, cast: 0.9, levelReq: 1, clause: 'a single projectile' },
  { id: 'brand', name: 'Brand', kind: 'form', root: '-morsus', power: 12, cost: 12, cast: 0.7, levelReq: 5, clause: 'a mark that deals damage every second for 10s' },
  { id: 'ward', name: 'Ward', kind: 'form', root: '-scutum', power: 18, cost: 14, cast: 1.1, levelReq: 10, clause: 'a shield absorbing damage for 12s' },
  { id: 'nova', name: 'Nova', kind: 'form', root: '-fractum', power: 26, cost: 22, cast: 1.8, levelReq: 16, clause: 'erupts around you, striking everything within six paces' },
  { id: 'chain', name: 'Chain', kind: 'form', root: '-nexum', power: 24, cost: 16, cast: 1.3, levelReq: 24, clause: 'leaps between up to four foes, losing 15% each jump' },
  { id: 'beam', name: 'Beam', kind: 'form', root: '-lumen', power: 41, cost: 18, cast: 1.5, levelReq: 32, clause: 'a sustained line that pierces the first two foes' },
  { id: 'weave', name: 'Weave', kind: 'form', root: '-textum', power: 15, cost: 15, cast: 1.6, levelReq: 40, clause: 'a lasting enhancement on you or an ally' },
  { id: 'sigil', name: 'Sigil', kind: 'form', root: '-locus', power: 22, cost: 20, cast: 2.0, levelReq: 48, clause: 'a rune laid on the ground that triggers when stepped on' },

  // ------------------------------------------------------------- modifiers
  { id: 'amplify', name: 'Amplify', kind: 'modifier', root: 'magna', power: 1.4, cost: 1.55, cast: 1.15, levelReq: 6, clause: 'raises power sharply' },
  { id: 'hasten', name: 'Hasten', kind: 'modifier', root: 'celer', power: 0.88, cost: 1.1, cast: 0.55, levelReq: 12, clause: 'cuts cast time hard' },
  { id: 'pierce', name: 'Pierce', kind: 'modifier', root: 'acuo', power: 1.1, cost: 1.2, cast: 1.0, levelReq: 18, clause: 'ignores 40% of resistance' },
  { id: 'split', name: 'Split', kind: 'modifier', root: 'findo', power: 0.62, cost: 1.3, cast: 1.0, levelReq: 22, clause: 'divides into three weaker instances' },
  { id: 'linger', name: 'Linger', kind: 'modifier', root: 'maneo', power: 1.15, cost: 1.35, cast: 1.1, levelReq: 28, clause: 'persists for twice as long' },
  { id: 'siphon', name: 'Siphon', kind: 'modifier', root: 'haurio', power: 0.95, cost: 0.72, cast: 1.05, levelReq: 34, clause: 'refunds mana on every hit' },
  { id: 'echo', name: 'Echo', kind: 'modifier', root: 'iterum', power: 1.3, cost: 1.7, cast: 1.2, levelReq: 44, clause: 'repeats once, two seconds later' },
  { id: 'empower', name: 'Empower', kind: 'modifier', root: 'potens', power: 1.22, cost: 1.45, cast: 1.3, levelReq: 55, clause: 'scales with your Sorcery level' },

  // -------------------------------------------------------------- triggers
  { id: 'onCast', name: 'On Cast', kind: 'trigger', root: 'voco', power: 1.0, cost: 1.0, cast: 1.0, levelReq: 1, clause: 'when you cast it deliberately' },
  { id: 'onHit', name: 'On Hit', kind: 'trigger', root: 'tango', power: 0.45, cost: 0.4, cast: 0, levelReq: 15, clause: 'automatically whenever you land a weapon strike' },
  { id: 'onKill', name: 'On Kill', kind: 'trigger', root: 'caedo', power: 1.2, cost: 0.6, cast: 0, levelReq: 26, clause: 'automatically whenever a foe falls' },
  { id: 'onBlock', name: 'On Block', kind: 'trigger', root: 'paro', power: 0.9, cost: 0.5, cast: 0, levelReq: 33, clause: 'automatically whenever you turn an attack aside' },
  { id: 'onLow', name: 'Below 30% HP', kind: 'trigger', root: 'extremis', power: 1.5, cost: 0.8, cast: 0, levelReq: 42, clause: 'automatically the moment you drop below a third of your health' },
]

export const GLYPH_BY_ID: Record<string, GlyphDef> = Object.fromEntries(GLYPHS.map((g) => [g.id, g]))

export function glyphsOfKind(kind: GlyphDef['kind']): GlyphDef[] {
  return GLYPHS.filter((g) => g.kind === kind)
}

/** What a new character already knows. Everything else must be found. */
export const STARTING_GLYPHS = ['fire', 'frost', 'bolt', 'onCast']
