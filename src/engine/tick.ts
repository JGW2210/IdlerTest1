import type { Assignment, GameState, RetinueMember, WorldNodeDef } from './types'
import type { Rng } from './rng'
import {
  RETINUE_RATE, SECONDS_PER_YEAR, TICK_SECONDS, actionTime, rollQuality,
} from './curves'
import { effectiveLevel, grantXp, levelOf } from './skills'
import { addItem, consumeInputs, hasInputs, toolSpeedFor } from './inventory'
import { refreshTechniques, startCombat, tickCombat } from './combat'
import { settleExpectation, randInt, pickWeighted, stream } from './rng'
import { findNode } from '@/content/regions'
import { recipeById } from '@/content/recipes'
import { itemById } from '@/content/items'
import { FOE_BY_ID } from '@/content/foes'

/**
 * The simulation. Nothing in this file touches the DOM, reads a clock, or holds
 * a reference to anything that is not serialisable — which is what makes offline
 * catch-up simply "the same engine, run with a longer stride", and what will let
 * the whole thing move behind a worker boundary without a rewrite.
 */

export type TickMode = 'live' | 'offline'

/** A yield rarer than this is a "rare" — focused work rolls it, background work
 *  does not. That single asymmetry is what makes attention worth paying. */
const RARE_THRESHOLD = 0.15

export interface TickReport {
  gained: Record<string, number>
  xp: Record<string, number>
  coin: number
  levelUps: string[]
}

export function emptyReport(): TickReport {
  return { gained: {}, xp: {}, coin: 0, levelUps: [] }
}

function note(report: TickReport, item: string, qty: number) {
  report.gained[item] = (report.gained[item] ?? 0) + qty
}

/**
 * Advance the world by one fixed step. Callers must not vary `dt` arbitrarily —
 * `stepAll` below is the supported entry point and keeps the stride constant so
 * a replay of the same seed produces the same save.
 */
export function step(state: GameState, dt: number, mode: TickMode, report: TickReport): void {
  const rng = nextRng(state)

  state.elapsed += dt
  state.character.age += dt / SECONDS_PER_YEAR

  runAssignment(state, state.focus, dt, 1, mode, rng, report, null)

  for (const member of state.retinue) {
    runAssignment(state, member.assignment, dt, RETINUE_RATE * member.skill, mode, rng, report, member)
  }

  if (state.combat) tickCombat(state, dt, rng)

  const unlocked = refreshTechniques(state)
  for (const t of unlocked) state.log.push({ t: state.elapsed, text: `Technique learned: ${t}.` })
}

/** Advance by whole fixed steps, returning what was gained. */
export function stepAll(state: GameState, seconds: number, mode: TickMode, stride = TICK_SECONDS): TickReport {
  const report = emptyReport()
  const steps = Math.floor(seconds / stride)
  for (let i = 0; i < steps; i++) step(state, stride, mode, report)
  return report
}

function nextRng(state: GameState): Rng {
  state.rngCounter += 1
  return stream(state.seed, 'sim', state.rngCounter)
}

// --------------------------------------------------------------- assignments

function runAssignment(
  state: GameState,
  assignment: Assignment,
  dt: number,
  rate: number,
  mode: TickMode,
  rng: Rng,
  report: TickReport,
  member: RetinueMember | null,
): void {
  if (assignment.kind === 'idle' || rate <= 0) return

  if (assignment.kind === 'node') {
    const found = assignment.node ? findNode(assignment.node) : undefined
    if (!found) return
    const { node } = found

    // Hunt and delve nodes hand off to the combat resolver rather than a yield
    // table; the focused character fights, the retinue only gathers.
    if ((node.activity === 'hunt' || node.activity === 'delve') && !member) {
      if (!state.combat && node.foes?.length) {
        const foe = node.foes[Math.floor(rng() * node.foes.length)]
        if (foe && FOE_BY_ID[foe]) startCombat(state, foe)
      }
      return
    }

    const level = effectiveLevel(state, node.skill)
    if (level < node.levelReq) return

    const perAction = actionTime(node.baseTime, level, toolSpeedFor(state, node.skill)) / rate
    assignment.progress += dt
    const completions = Math.floor(assignment.progress / perAction)
    if (completions <= 0) return
    assignment.progress -= completions * perAction

    grantXpTracked(state, node.skill, node.xp * completions, report)
    grantYields(state, node, completions, mode, rng, report, member !== null)
    return
  }

  if (assignment.kind === 'recipe') {
    const recipe = assignment.recipe ? recipeById(assignment.recipe) : undefined
    if (!recipe) return

    const level = effectiveLevel(state, recipe.skill)
    if (level < recipe.levelReq) return

    const perAction = actionTime(recipe.baseTime, level) / rate
    assignment.progress += dt

    let made = 0
    const cap = Math.floor(assignment.progress / perAction)
    for (let i = 0; i < cap; i++) {
      if (!hasInputs(state, recipe.inputs)) break
      consumeInputs(state, recipe.inputs)
      const outDef = itemById(recipe.output.item)
      const quality = outDef && !outDef.stack ? rollQuality(level, recipe.levelReq, rng()) : undefined
      addItem(state, recipe.output.item, recipe.output.qty, quality)
      note(report, recipe.output.item, recipe.output.qty)
      made += 1
    }

    // Only consume the time actually spent producing, so a stalled craft does
    // not silently burn hours of banked progress.
    assignment.progress -= made * perAction
    if (made < cap) assignment.progress = Math.min(assignment.progress, perAction)

    if (made > 0) grantXpTracked(state, recipe.skill, recipe.xp * made, report)
  }
}

function grantXpTracked(state: GameState, skill: string, amount: number, report: TickReport) {
  const { leveled } = grantXp(state, skill, amount)
  report.xp[skill] = (report.xp[skill] ?? 0) + amount
  for (const l of leveled) if (!report.levelUps.includes(l)) report.levelUps.push(l)
}

/**
 * Yield resolution — the mechanical heart of ballot II-A.
 *
 * Live play rolls each completion individually, so streaks and dry spells feel
 * the way they should. Offline resolution instead settles the *expectation* and
 * carries the remainder, so a long absence pays exactly what the same time spent
 * watching would have averaged. Nothing is rounded away and nothing is farmed by
 * logging out at the right moment.
 */
function grantYields(
  state: GameState,
  node: WorldNodeDef,
  completions: number,
  mode: TickMode,
  rng: Rng,
  report: TickReport,
  background: boolean,
): void {
  const total = node.yields.reduce((n, y) => n + y.weight, 0)
  if (total <= 0) return

  const table = background
    ? node.yields.filter((y) => y.weight / total >= RARE_THRESHOLD)
    : node.yields

  const tableTotal = table.reduce((n, y) => n + y.weight, 0)
  if (tableTotal <= 0) return

  if (mode === 'live' && completions <= 24) {
    for (let i = 0; i < completions; i++) {
      const y = pickWeighted(rng, table.map((e) => ({ item: e, weight: e.weight })))
      if (!y) continue
      const qty = randInt(rng, y.qty[0], y.qty[1])
      addItem(state, y.item, qty)
      note(report, y.item, qty)
    }
    return
  }

  for (const y of table) {
    const p = y.weight / tableTotal
    const avgQty = (y.qty[0] + y.qty[1]) / 2
    const expected = p * avgQty * completions
    const key = `${node.id}:${y.item}`
    const { granted, carry } = settleExpectation(expected, state.dropCarry[key] ?? 0, rng)
    state.dropCarry[key] = carry
    if (granted > 0) {
      addItem(state, y.item, granted)
      note(report, y.item, granted)
    }
  }
}

// ------------------------------------------------------------------ commands

export function assignFocus(state: GameState, assignment: Assignment): void {
  state.focus = { ...assignment, progress: 0 }
  if (assignment.kind !== 'node') state.combat = null
  else {
    const found = assignment.node ? findNode(assignment.node) : undefined
    if (!found || (found.node.activity !== 'hunt' && found.node.activity !== 'delve')) state.combat = null
  }
}

export function assignRetinue(state: GameState, uid: string, assignment: Assignment): void {
  const member = state.retinue.find((m) => m.uid === uid)
  if (member) member.assignment = { ...assignment, progress: 0 }
}

/** What a focused action currently costs in seconds — for the UI readout. */
export function currentActionTime(state: GameState, assignment: Assignment): number | null {
  if (assignment.kind === 'node' && assignment.node) {
    const found = findNode(assignment.node)
    if (!found) return null
    return actionTime(found.node.baseTime, effectiveLevel(state, found.node.skill), toolSpeedFor(state, found.node.skill))
  }
  if (assignment.kind === 'recipe' && assignment.recipe) {
    const r = recipeById(assignment.recipe)
    if (!r) return null
    return actionTime(r.baseTime, effectiveLevel(state, r.skill))
  }
  return null
}

export { levelOf }
