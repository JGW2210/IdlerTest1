import type { Assignment, GameState, RetinueMember, SiteLayer } from './types'
import type { Rng } from './rng'
import {
  RETINUE_RATE, SECONDS_PER_YEAR, TICK_SECONDS, actionTime, rollQuality,
} from './curves'
import { effectiveLevel, grantXp, levelOf } from './skills'
import { addItem, consumeInputs, countItem, hasInputs, toolSpeedFor } from './inventory'
import { survey, surveyTime, surveyXp } from './survey'
import { standingPerAction } from './diplomacy'
import { POWER_BY_ID, STANDING_TIERS } from '@/content/powers'
import { TABLET_BY_ITEM, decipher, describeOutcome } from './archaeology'
import { tickBattle, considerMuster, resolveArrivals, commanderFalls, MUSTER_CHECK } from './warfare'
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

  tickWar(state, dt, rng)

  const unlocked = refreshTechniques(state)
  for (const t of unlocked) state.log.push({ t: state.elapsed, text: `Technique learned: ${t}.` })
}

/**
 * The war layer, ticked alongside everything else.
 *
 * Musters are only *considered* on a slow cadence rather than every step, so a
 * twelve-hour catch-up does not roll the dice four thousand times and bury the
 * player under an invasion for every region they hold.
 */
function tickWar(state: GameState, dt: number, rng: Rng): void {
  const before = state.battle
  if (before) {
    tickBattle(state, dt, rng)
    // A battle that ended in defeat is where a commander can be lost. Losing
    // the character triggers succession early, which is the whole reason the
    // plan wants a withdrawal rule in it.
    if (!state.battle && before.side === 'attack' && before.enemyStrength > 0) {
      if (commanderFalls(state, rng)) {
        state.character.health = 1
        state.pendingSuccession = true
        state.log.push({
          t: state.elapsed,
          text: `${state.character.name} does not come back from the field. The holding wants an heir.`,
        })
      }
    }
  }

  state.musterTimer = (state.musterTimer ?? 0) + dt
  if (state.musterTimer >= MUSTER_CHECK) {
    state.musterTimer -= MUSTER_CHECK
    considerMuster(state, rng)
  }
  resolveArrivals(state)
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
    const { site: siteDef, layer: node } = found

    // Hunt and delve layers hand off to the combat resolver rather than a yield
    // table; the focused character fights, the retinue only gathers.
    if ((siteDef.activity === 'hunt' || siteDef.activity === 'delve') && !member) {
      if (!state.combat && node.foes?.length) {
        const foe = node.foes[Math.floor(rng() * node.foes.length)]
        if (foe && FOE_BY_ID[foe]) startCombat(state, foe)
      }
      return
    }

    const level = effectiveLevel(state, siteDef.skill)
    if (level < node.levelReq) return

    const perAction = actionTime(node.baseTime, level, toolSpeedFor(state, siteDef.skill)) / rate
    assignment.progress += dt
    const completions = Math.floor(assignment.progress / perAction)
    if (completions <= 0) return
    assignment.progress -= completions * perAction

    grantXpTracked(state, siteDef.skill, node.xp * completions, report)
    grantYields(state, node, completions, mode, rng, report, member !== null)

    // Working a foreign hold's ground is how standing is earned. Trading counts
    // for most of it; labouring in their works counts for something.
    if (found.region.kind === 'foreign') {
      const rs = state.regions[found.region.id]
      if (rs) {
        const before = rs.standing
        rs.standing = Math.min(100, rs.standing + standingPerAction(siteDef.activity) * completions)
        const power = found.region.power ? POWER_BY_ID[found.region.power] : undefined
        if (power) {
          // Announce each threshold crossed, since a new tier means new words.
          for (const tier of STANDING_TIERS) {
            if (before < tier.at && rs.standing >= tier.at && tier.at > 0) {
              state.log.push({ t: state.elapsed, text: `${power.name} count you ${tier.name.toLowerCase()}.` })
            }
          }
        }
      }
    }
    return
  }

  if (assignment.kind === 'survey') {
    const perAction = surveyTime(state) / rate
    assignment.progress += dt

    let done = 0
    const cap = Math.floor(assignment.progress / perAction)
    for (let i = 0; i < cap; i++) {
      const result = survey(state, rng)
      // Blocked means the frontier needs a higher Cartography than we have.
      if (result.kind === 'blocked') break
      done += 1
      grantXpTracked(state, 'cartography', surveyXp(state), report)
      if (result.kind === 'discovery') {
        state.log.push({ t: state.elapsed, text: `Surveyed and named: ${result.name}.` })
      }
    }

    assignment.progress -= done * perAction
    // Hold at most one action's worth while blocked: the pending survey fires
    // the moment Cartography rises, without banking hours of unusable time.
    if (done < cap) assignment.progress = Math.min(assignment.progress, perAction)
    return
  }

  if (assignment.kind === 'decipher') {
    // Retinue members are labourers, not scholars.
    if (member) return
    const item = assignment.tablet
    const def = item ? TABLET_BY_ITEM[item] : undefined
    if (!def) return
    if (levelOf(state, 'inscription') < def.levelReq) return
    if (countItem(state, def.item) <= 0) {
      assignment.progress = Math.min(assignment.progress, actionTime(def.baseTime, levelOf(state, 'inscription')))
      return
    }

    const perAction = actionTime(def.baseTime, effectiveLevel(state, 'inscription')) / rate
    assignment.progress += dt

    let opened = 0
    const cap = Math.floor(assignment.progress / perAction)
    for (let i = 0; i < cap; i++) {
      if (countItem(state, def.item) <= 0) break
      const outcome = decipher(state, def.item, rng)
      if (outcome.kind === 'nothing') break
      opened += 1
      grantXpTracked(state, 'inscription', def.xp, report)
      grantXpTracked(state, 'archaeology', Math.round(def.xp * 0.35), report)
      state.log.push({ t: state.elapsed, text: describeOutcome(outcome) })
    }

    assignment.progress -= opened * perAction
    if (opened < cap) assignment.progress = Math.min(assignment.progress, perAction)
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
  node: SiteLayer,
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
  // Walking away from a fight ends it; only a hunt or delve layer sustains one.
  if (assignment.kind !== 'node') state.combat = null
  else {
    const found = assignment.node ? findNode(assignment.node) : undefined
    if (!found || (found.site.activity !== 'hunt' && found.site.activity !== 'delve')) state.combat = null
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
    return actionTime(found.layer.baseTime, effectiveLevel(state, found.site.skill), toolSpeedFor(state, found.site.skill))
  }
  if (assignment.kind === 'recipe' && assignment.recipe) {
    const r = recipeById(assignment.recipe)
    if (!r) return null
    return actionTime(r.baseTime, effectiveLevel(state, r.skill))
  }
  if (assignment.kind === 'survey') return surveyTime(state)
  if (assignment.kind === 'decipher' && assignment.tablet) {
    const def = TABLET_BY_ITEM[assignment.tablet]
    if (!def) return null
    return actionTime(def.baseTime, effectiveLevel(state, 'inscription'))
  }
  return null
}

export { levelOf }
