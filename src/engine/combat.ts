import type { CombatLogEntry, CombatState, GambitRule, GameState } from './types'
import type { Rng } from './rng'
import { damageAfterArmour, maxHealth, maxMana, maxStamina } from './curves'
import { effectiveLevel, grantXp, levelOf } from './skills'
import { addItem, equipmentStats, effectiveStats } from './inventory'
import { resolveSpell } from './runes'
import { FOE_BY_ID, TECHNIQUE_BY_ID } from '@/content/foes'
import { itemById } from '@/content/items'
import { randInt } from './rng'

/**
 * The gambit resolver (ballot IV-A).
 *
 * Combat resolves itself. What the player authors is the priority list: the
 * engine walks it top to bottom each time the character is free to act and fires
 * the first rule whose condition holds. Techniques therefore become decisions
 * the player made in advance, and theorycrafting the list *is* the gameplay —
 * while remaining entirely compatible with being away from the tab.
 */

const LOG_LIMIT = 40

export function derivedStats(state: GameState) {
  const gear = equipmentStats(state)
  const weapon = state.equipment.mainHand
  const weaponDef = weapon ? itemById(weapon.item) : undefined
  const weaponSkill = weaponDef?.weaponSkill ?? 'striking'
  const skillLevel = effectiveLevel(state, weaponSkill)
  const parentLevel = levelOf(state, 'oneHanded')

  // Weapon damage scales with the child skill; the parent contributes accuracy
  // and stamina economy rather than raw damage (charter §1.3).
  const base = (gear.attack || 6) * (1 + skillLevel * 0.03)

  return {
    attack: Math.round(base),
    armour: gear.armour,
    maxHealth: maxHealth(levelOf(state, 'vitality'), gear.health),
    maxStamina: maxStamina(parentLevel, gear.stamina),
    maxMana: maxMana(levelOf(state, 'sorcery'), gear.mana),
    crit: Math.min(0.6, 0.05 + gear.crit + skillLevel * 0.001),
    speed: weaponDef?.speed ?? 1,
    weaponSkill,
  }
}

export function startCombat(state: GameState, foeId: string): boolean {
  const foe = FOE_BY_ID[foeId]
  if (!foe) return false
  state.combat = {
    foe: foeId,
    foeHealth: foe.health,
    foeMaxHealth: foe.health,
    foeCooldown: foe.speed,
    selfCooldown: 0,
    cooldowns: {},
    log: [{ t: state.elapsed, text: `${foe.name} closes.`, kind: 'info' }],
  }
  return true
}

function log(c: CombatState, t: number, text: string, kind: CombatLogEntry['kind']) {
  c.log.push({ t, text, kind })
  if (c.log.length > LOG_LIMIT) c.log.splice(0, c.log.length - LOG_LIMIT)
}

function conditionHolds(rule: GambitRule, state: GameState, c: CombatState): boolean {
  const s = derivedStats(state)
  switch (rule.condition.kind) {
    case 'always': return true
    case 'foeHealthBelow': return c.foeHealth / c.foeMaxHealth < rule.condition.pct
    case 'foeHealthAbove': return c.foeHealth / c.foeMaxHealth > rule.condition.pct
    case 'selfHealthBelow': return state.character.health / s.maxHealth < rule.condition.pct
    case 'staminaAbove': return state.character.stamina > rule.condition.value
    case 'manaAbove': return state.character.mana > rule.condition.value
  }
}

function actionAvailable(rule: GambitRule, state: GameState, c: CombatState): boolean {
  switch (rule.action.kind) {
    case 'attack':
    case 'flee':
      return true
    case 'technique': {
      const t = TECHNIQUE_BY_ID[rule.action.technique]
      if (!t) return false
      if (!state.unlockedTechniques.includes(t.id)) return false
      if ((c.cooldowns[t.id] ?? 0) > 0) return false
      return state.character.stamina >= t.staminaCost
    }
    case 'spell': {
      const spell = state.spells.find((s) => s.uid === (rule.action as { spell: string }).spell)
      if (!spell) return false
      const resolved = resolveSpell(spell)
      if (!resolved) return false
      return state.character.mana >= resolved.manaCost
    }
  }
}

/**
 * Advance combat by `dt` seconds. Pure: everything it needs is on `state`, and
 * the same seed produces the same fight — which is what makes offline resolution
 * (ballot II-A) trustworthy.
 */
export function tickCombat(state: GameState, dt: number, rng: Rng): void {
  const c = state.combat
  if (!c) return
  const foe = FOE_BY_ID[c.foe]
  if (!foe) { state.combat = null; return }

  const s = derivedStats(state)

  for (const k of Object.keys(c.cooldowns)) {
    c.cooldowns[k] = Math.max(0, (c.cooldowns[k] ?? 0) - dt)
  }

  // Stamina and mana recover continuously; that recovery is what makes a
  // technique-heavy gambit list a real resource decision rather than free damage.
  state.character.stamina = Math.min(s.maxStamina, state.character.stamina + dt * 4)
  state.character.mana = Math.min(s.maxMana, state.character.mana + dt * 2.5)

  c.selfCooldown -= dt
  c.foeCooldown -= dt

  if (c.selfCooldown <= 0) {
    const rule = state.gambits.find((r) => r.enabled && conditionHolds(r, state, c) && actionAvailable(r, state, c))
    performAction(state, c, rule, s, rng)
    if (!state.combat) return
  }

  if (c.foeCooldown <= 0 && state.combat) {
    c.foeCooldown += foe.speed
    const raw = foe.attack * (0.85 + rng() * 0.3)
    const dealt = Math.round(damageAfterArmour(raw, s.armour))
    state.character.health -= dealt
    log(c, state.elapsed, `${foe.name} hits you for ${dealt}.`, 'taken')

    if (state.character.health <= 0) {
      state.character.health = Math.max(1, Math.round(s.maxHealth * 0.3))
      log(c, state.elapsed, 'You are driven off, bleeding but alive.', 'death')
      state.log.push({ t: state.elapsed, text: `Beaten back by ${foe.name}.` })
      state.combat = null
      return
    }
  }
}

function performAction(
  state: GameState,
  c: CombatState,
  rule: GambitRule | undefined,
  s: ReturnType<typeof derivedStats>,
  rng: Rng,
): void {
  const foe = FOE_BY_ID[c.foe]!
  const action = rule?.action ?? { kind: 'attack' as const }

  if (action.kind === 'flee') {
    log(c, state.elapsed, 'You disengage.', 'info')
    state.combat = null
    return
  }

  let damage = 0
  let label = ''
  let kind: CombatLogEntry['kind'] = 'hit'

  if (action.kind === 'technique') {
    const t = TECHNIQUE_BY_ID[action.technique]!
    state.character.stamina -= t.staminaCost
    c.cooldowns[t.id] = t.cooldown
    damage = s.attack * t.damageMult
    label = t.name
    kind = 'technique'
    c.selfCooldown += s.speed
  } else if (action.kind === 'spell') {
    const spell = state.spells.find((x) => x.uid === action.spell)!
    const resolved = resolveSpell(spell)!
    state.character.mana -= resolved.manaCost
    damage = resolved.power * (1 + levelOf(state, 'evocation') * 0.04)
    label = resolved.name
    kind = 'spell'
    c.selfCooldown += Math.max(0.4, resolved.castTime || s.speed)
    grantXp(state, 'evocation', Math.round(resolved.manaCost * 1.2))
  } else {
    damage = s.attack
    label = 'You strike'
    c.selfCooldown += s.speed
  }

  const crit = rng() < s.crit
  if (crit) { damage *= 1.8; kind = kind === 'hit' ? 'crit' : kind }
  damage *= 0.9 + rng() * 0.2

  const dealt = Math.max(1, Math.round(damageAfterArmour(damage, foe.armour)))
  c.foeHealth -= dealt

  const verb = action.kind === 'attack' ? `${label} for ${dealt}` : `${label} — ${dealt}`
  log(c, state.elapsed, crit ? `${verb} (critical).` : `${verb}.`, kind)

  if (c.foeHealth <= 0) resolveVictory(state, c, rng)
}

function resolveVictory(state: GameState, c: CombatState, rng: Rng): void {
  const foe = FOE_BY_ID[c.foe]!

  grantXp(state, derivedStats(state).weaponSkill, foe.xp)
  grantXp(state, 'vitality', Math.round(foe.xp * 0.25))
  grantXp(state, 'guarding', Math.round(foe.xp * 0.2))

  const gained: string[] = []
  for (const d of foe.drops) {
    if (rng() < d.chance) {
      const qty = randInt(rng, d.qty[0], d.qty[1])
      addItem(state, d.item, qty)
      gained.push(`${qty}x ${itemById(d.item)?.name ?? d.item}`)
    }
  }
  const coin = Math.round(foe.level * 4 * (0.8 + rng() * 0.4))
  state.coin += coin

  log(c, state.elapsed, `${foe.name} falls. +${foe.xp} xp, +${coin} coin${gained.length ? `, ${gained.join(', ')}` : ''}.`, 'reward')
  state.log.push({ t: state.elapsed, text: `Defeated ${foe.name}.` })

  // Immediately re-engage, so a hunt node keeps running while you are away.
  const next = foe.id
  c.foeHealth = FOE_BY_ID[next]!.health
  c.foeMaxHealth = FOE_BY_ID[next]!.health
  c.foeCooldown = FOE_BY_ID[next]!.speed
}

/** Techniques unlock at level breakpoints on the child skill. */
export function refreshTechniques(state: GameState): string[] {
  const unlocked: string[] = []
  for (const t of Object.values(TECHNIQUE_BY_ID)) {
    if (state.unlockedTechniques.includes(t.id)) continue
    if (levelOf(state, t.skill) >= t.levelReq) {
      state.unlockedTechniques.push(t.id)
      unlocked.push(t.id)
    }
  }
  return unlocked
}

export { effectiveStats }
