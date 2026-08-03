import type { GameState, SkillId } from './types'
import { CHILD_LEVEL_LEAD, PARENT_XP_SHARE, levelForXp, MAX_LEVEL } from './curves'
import { SKILL_BY_ID } from '@/content/skills'

/**
 * The correction from charter §1.3, in code.
 *
 * A combat child receives 100% of the XP it earns and its parent receives an
 * *additional* 30% — created, never divided. Splitting would make every weapon
 * swap read as a tax and players would lock onto one weapon by hour two, which
 * is the exact opposite of what a wide roster is for.
 */
export function grantXp(state: GameState, skillId: SkillId, amount: number): { leveled: SkillId[] } {
  const leveled: SkillId[] = []
  if (amount <= 0) return { leveled }

  const scaled = amount * state.legacy.xpBonus
  applyXp(state, skillId, scaled, leveled)

  const def = SKILL_BY_ID[skillId]
  if (def?.parent) applyXp(state, def.parent, scaled * PARENT_XP_SHARE, leveled)

  return { leveled }
}

function applyXp(state: GameState, skillId: SkillId, amount: number, leveled: SkillId[]) {
  const s = state.skills[skillId]
  if (!s) return
  const before = s.level
  s.xp += amount
  const after = Math.min(MAX_LEVEL, levelForXp(s.xp))
  if (after !== before) {
    s.level = after
    leveled.push(skillId)
  }
}

export function levelOf(state: GameState, skillId: SkillId): number {
  return state.skills[skillId]?.level ?? 1
}

/**
 * A child may not exceed its parent by more than CHILD_LEVEL_LEAD. This is the
 * quiet engine of breadth: raising your favourite weapon past the cap means
 * raising the parent, and the cheapest way to do that is to spend time on the
 * siblings. Breadth becomes a strategy rather than a chore.
 *
 * The cap clamps *effective* level — XP still banks, so nothing is lost and the
 * player is never punished for over-investing, only asked to widen.
 */
export function effectiveLevel(state: GameState, skillId: SkillId): number {
  const raw = levelOf(state, skillId)
  const def = SKILL_BY_ID[skillId]
  if (!def?.parent) return raw
  const cap = levelOf(state, def.parent) + CHILD_LEVEL_LEAD
  return Math.min(raw, cap)
}

export function isCapped(state: GameState, skillId: SkillId): boolean {
  return effectiveLevel(state, skillId) < levelOf(state, skillId)
}

/** Which combat child governs the equipped weapon, defaulting to unarmed. */
export function activeWeaponSkill(state: GameState): SkillId {
  const main = state.equipment.mainHand
  if (!main) return 'striking'
  const def = SKILL_BY_ID_ITEM(main.item)
  return def ?? 'striking'
}

// Kept separate so items.ts is not imported into the hot path of every module.
import { itemById } from '@/content/items'
function SKILL_BY_ID_ITEM(itemId: string): SkillId | undefined {
  return itemById(itemId)?.weaponSkill
}
