import type { GameState, Spell, SpellResolved } from './types'
import { GLYPH_BY_ID } from '@/content/glyphs'
import { levelOf } from './skills'

/**
 * Spell resolution (ballot V-A).
 *
 * Nothing about a spell is authored. The form sets the base, the element and the
 * modifiers scale it, the trigger trades power against convenience, and the name
 * and description are composed from the parts. That is what lets ~27 glyphs
 * generate tens of thousands of legitimate spells without a content pass.
 */

export const MAX_MODIFIERS = 3

export function resolveSpell(spell: Spell): SpellResolved | null {
  const element = GLYPH_BY_ID[spell.element]
  const form = GLYPH_BY_ID[spell.form]
  const trigger = GLYPH_BY_ID[spell.trigger]
  if (!element || !form || !trigger) return null

  const mods = spell.modifiers.map((m) => GLYPH_BY_ID[m]).filter((g): g is NonNullable<typeof g> => !!g)

  let power = form.power * element.power * trigger.power
  let cost = form.cost * element.cost * trigger.cost
  let cast = form.cast * element.cast

  for (const m of mods) {
    power *= m.power
    cost *= m.cost
    cast *= m.cast
  }

  // A triggered spell has no cast time of its own — it rides the action that
  // fires it. That is the trade: less power for no tempo cost.
  if (trigger.id !== 'onCast') cast = 0

  const name = [...mods.map((m) => m.name), element.name, form.name].join(' ')
  const trueName = (element.root + form.root + (mods.length ? ' · ' + mods.map((m) => m.root).join(' · ') : '')).toUpperCase()

  const clauses: string[] = [`Fires ${trigger.clause}.`, `${capitalise(form.clause)}, and ${element.clause}.`]
  if (mods.length) clauses.push(`It ${mods.map((m) => m.clause).join(', and ')}.`)

  return {
    ...spell,
    name,
    trueName,
    description: clauses.join(' '),
    power: Math.round(power),
    manaCost: Math.round(cost),
    castTime: Math.round(cast * 10) / 10,
    glyphCount: 2 + mods.length + (trigger.id === 'onCast' ? 0 : 1),
  }
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** How many glyphs a single tablet can hold, from Inscription level. */
export function glyphCapacity(state: GameState): number {
  const lvl = levelOf(state, 'inscription')
  return 3 + Math.floor(lvl / 20)
}

/** How many spells may be equipped at once — one per tablet. */
export function tabletCapacity(state: GameState): number {
  let slots = 0
  for (const stack of Object.values(state.equipment)) {
    if (!stack) continue
    const bonus = tabletBonus(stack.item)
    slots += bonus
  }
  return Math.max(1, slots)
}

import { itemById } from '@/content/items'
function tabletBonus(itemId: string): number {
  const def = itemById(itemId)
  if (!def) return 0
  let n = def.category === 'tablet' ? 1 : 0
  n += def.stats?.tabletSlots ?? 0
  return n
}

/**
 * Whether the character may inscribe this spell: every glyph known, every level
 * requirement met, and the composition within the tablet's capacity.
 */
export function canInscribe(state: GameState, spell: Spell): { ok: boolean; reason?: string } {
  const ids = [spell.element, spell.form, spell.trigger, ...spell.modifiers]
  const known = new Set(state.knownGlyphs)
  const runic = levelOf(state, 'inscription')

  for (const id of ids) {
    if (!known.has(id)) return { ok: false, reason: `You have not found the ${GLYPH_BY_ID[id]?.name ?? id} glyph.` }
    const g = GLYPH_BY_ID[id]
    if (g && runic < g.levelReq) return { ok: false, reason: `${g.name} needs Inscription ${g.levelReq}.` }
  }
  if (spell.modifiers.length > MAX_MODIFIERS) return { ok: false, reason: `At most ${MAX_MODIFIERS} modifiers.` }

  const resolved = resolveSpell(spell)
  if (!resolved) return { ok: false, reason: 'That composition is not a sentence.' }
  if (resolved.glyphCount > glyphCapacity(state)) {
    return { ok: false, reason: `Needs a tablet holding ${resolved.glyphCount} glyphs; yours holds ${glyphCapacity(state)}.` }
  }
  return { ok: true }
}

/** Learning a glyph is the primary reward from Archaeology and dungeon depths. */
export function learnGlyph(state: GameState, glyphId: string): boolean {
  if (state.knownGlyphs.includes(glyphId)) return false
  if (!GLYPH_BY_ID[glyphId]) return false
  state.knownGlyphs.push(glyphId)
  return true
}
