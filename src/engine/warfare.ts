import type {
  Battle, BattleRule, BattleStance, Company, CompanyRole, GameState, RegionId,
} from './types'
import type { Rng } from './rng'
import { randInt } from './rng'
import { REGIONS, REGION_BY_ID } from '@/content/regions'
import { POWER_BY_ID, willTreat } from '@/content/powers'
import { MATERIAL_TIERS } from '@/content/materials'
import { countItem, removeItem, nextUid } from './inventory'
import { derivedStats } from './combat'
import { levelOf, grantXp } from './skills'

/**
 * War.
 *
 * Four things are true here, and each was a deliberate choice:
 *
 *  1. Companies are raised from the levy your held ground can bear, and armed
 *     from your own forge. That is what turns the metal ladder from one
 *     character's sword into an industry with demand.
 *  2. Battles resolve on their own, driven by a plan written in the same
 *     conditional language as personal combat. The plan is the skill, not
 *     being at the keyboard.
 *  3. Two of the six powers will never treat, and the aggressive ones muster
 *     against *you*. War is mostly not your idea.
 *  4. Everything is lossy. Companies die and stay dead, ground can be taken
 *     back off you, standing collapses across every power that is watching,
 *     and a commander who will not withdraw does not always come home.
 */

// ------------------------------------------------------------------ the levy

export const ROLES: Record<CompanyRole, { name: string; blurb: string; cost: number }> = {
  foot: { name: 'Foot', blurb: 'The line. Holds ground and takes the weight of it.', cost: 1 },
  bow: { name: 'Bow', blurb: 'Kills at a distance and dies badly up close.', cost: 1.2 },
  horse: { name: 'Horse', blurb: 'Turns a wavering flank into a rout. Expensive to keep.', cost: 1.8 },
  engine: { name: 'Engines', blurb: 'Breaks walls. Useless in open field.', cost: 2.2 },
}

/** Men your held ground can put in the field, before anything is raised. */
export function levyCapacity(state: GameState): number {
  let total = 0
  for (const region of REGIONS) {
    const rs = state.regions[region.id]
    if (!rs?.held) continue
    // Prosperity is what feeds a levy; a held ruin contributes almost nothing.
    total += 20 + Math.floor(rs.prosperity * 2.5) + Math.floor(rs.loyalty / 8)
  }
  return total
}

export function levyInUse(state: GameState): number {
  return state.companies.reduce((n, c) => n + Math.ceil(c.strength * ROLES[c.role].cost), 0)
}

export function levyFree(state: GameState): number {
  return Math.max(0, levyCapacity(state) - levyInUse(state))
}

// ---------------------------------------------------------------- companies

const COMPANY_NAMES = [
  'the Ashcombe Foot', 'the Millbrook Levy', 'the Greyhollow Picks', 'the Tanglewood Bows',
  'the Fallow Riders', 'the Aldermarch Watch', 'the Barrow Company', 'the Stonewatch Guard',
  'the Long Company', 'the Free Lances', 'the Winter Company', 'the Hollow Band',
]

export function companyName(state: GameState): string {
  const used = new Set(state.companies.map((c) => c.name))
  const free = COMPANY_NAMES.find((n) => !used.has(n))
  return free ?? `the ${state.companies.length + 1}th Company`
}

/**
 * Company power.
 *
 * Arms tier is the dominant term on purpose — a hundred men with sticks lose to
 * forty in steel, which is what makes the forge worth running. Veterancy and
 * morale are multipliers rather than replacements for equipment.
 */
export function companyPower(c: Company): number {
  const arms = 1 + c.arms * 0.42
  const vet = 1 + c.veterancy * 0.04
  const heart = 0.45 + (c.morale / 100) * 0.55
  return Math.round(c.strength * arms * vet * heart)
}

export function armyPower(state: GameState, uids: string[]): number {
  return state.companies
    .filter((c) => uids.includes(c.uid) && c.strength > 0)
    .reduce((n, c) => n + companyPower(c), 0)
}

export type RaiseResult = { ok: true; company: Company } | { ok: false; reason: string }

export function raiseCompany(state: GameState, role: CompanyRole, strength: number, home: RegionId): RaiseResult {
  const rs = state.regions[home]
  if (!rs?.held) return { ok: false, reason: 'You can only raise from ground you hold.' }
  if (strength < 10) return { ok: false, reason: 'A company under ten men is a rumour.' }

  const cost = Math.ceil(strength * ROLES[role].cost)
  if (cost > levyFree(state)) {
    return { ok: false, reason: `That needs ${cost} of levy; you have ${levyFree(state)} free.` }
  }

  const company: Company = {
    uid: nextUid(state, 'c'),
    name: companyName(state),
    role,
    strength,
    raisedAt: state.elapsed,
    arms: 0,
    morale: 70,
    veterancy: 0,
    home,
  }
  state.companies.push(company)
  state.log.push({ t: state.elapsed, text: `${strength} men muster as ${company.name}.` })
  return { ok: true, company }
}

export function disbandCompany(state: GameState, uid: string): boolean {
  const i = state.companies.findIndex((c) => c.uid === uid)
  if (i === -1) return false
  const [c] = state.companies.splice(i, 1)
  if (c) state.log.push({ t: state.elapsed, text: `${c.name} are sent back to their fields.` })
  return true
}

/** Bars needed to arm a company at a given tier. Scales with how many men. */
export function armsCost(strength: number, tier: number): number {
  return Math.max(1, Math.ceil((strength / 10) * (1 + tier * 0.35)))
}

export type ArmResult = { ok: true; tier: number; spent: number } | { ok: false; reason: string }

/**
 * Arm a company from the forge.
 *
 * This is the demand side the production chain never had: the metal ladder now
 * consumes bars by the dozen rather than three at a time for one sword.
 */
export function armCompany(state: GameState, uid: string, barItem: string): ArmResult {
  const company = state.companies.find((c) => c.uid === uid)
  if (!company) return { ok: false, reason: 'No such company.' }

  const mat = MATERIAL_TIERS.find((m) => m.id === barItem)
  if (!mat) return { ok: false, reason: 'They cannot be armed with that.' }
  if (mat.tier <= company.arms) return { ok: false, reason: 'They already carry as good or better.' }

  const cost = armsCost(company.strength, mat.tier)
  if (countItem(state, barItem) < cost) {
    return { ok: false, reason: `That needs ${cost} ${mat.name} bars; you have ${countItem(state, barItem)}.` }
  }

  removeItem(state, barItem, cost)
  company.arms = mat.tier
  // Being handed good steel is good for the mood.
  company.morale = Math.min(100, company.morale + 6)
  state.log.push({ t: state.elapsed, text: `${company.name} are re-armed in ${mat.name}.` })
  return { ok: true, tier: mat.tier, spent: cost }
}

// ------------------------------------------------------------------ stances

export const STANCES: Record<BattleStance, {
  name: string
  blurb: string
  /** Multiplier on the damage we deal. */
  ours: number
  /** Multiplier on the damage we take. */
  theirs: number
  /** Morale change per exchange. */
  morale: number
  /** The role this stance leans on, if any. */
  role?: CompanyRole
}> = {
  hold: { name: 'Hold the line', blurb: 'Give nothing. Take little, deal little, and steady the men.', ours: 0.7, theirs: 0.62, morale: 1.2 },
  press: { name: 'Press the attack', blurb: 'Everything forward. Ends the fight quickly, one way or the other.', ours: 1.45, theirs: 1.35, morale: -1.4 },
  flank: { name: 'Flank with horse', blurb: 'Ride the wing. Devastating, and only if you brought horse.', ours: 1.75, theirs: 0.95, morale: 0.4, role: 'horse' },
  volley: { name: 'Loose volleys', blurb: 'Kill at range and give little back. Needs bows.', ours: 1.3, theirs: 0.55, morale: 0.6, role: 'bow' },
  engines: { name: 'Bring up the engines', blurb: 'Break the walls. Slow, and the only thing that shortens a siege.', ours: 1.6, theirs: 0.8, morale: 0, role: 'engine' },
  withdraw: { name: 'Withdraw', blurb: 'Break off and march home with whoever is left.', ours: 0, theirs: 0.35, morale: -3 },
}

export function defaultBattlePlan(state: GameState): BattleRule[] {
  return [
    { uid: nextUid(state, 'b'), enabled: true, condition: { kind: 'ourLossesAbove', pct: 0.6 }, stance: 'withdraw' },
    { uid: nextUid(state, 'b'), enabled: true, condition: { kind: 'moraleBelow', pct: 35 }, stance: 'hold' },
    { uid: nextUid(state, 'b'), enabled: true, condition: { kind: 'theirLossesAbove', pct: 0.5 }, stance: 'press' },
    { uid: nextUid(state, 'b'), enabled: true, condition: { kind: 'always' }, stance: 'hold' },
  ]
}

// ------------------------------------------------------------------ battles

/** Strength a hold or a raiding force fields. */
export function garrisonStrength(state: GameState, regionId: RegionId): number {
  const region = REGION_BY_ID[regionId]
  if (!region) return 0
  const power = region.power ? POWER_BY_ID[region.power] : undefined
  const base = 120 + region.danger * 34
  const mult = power?.garrison ?? 1
  // A hold that likes you keeps fewer men facing you.
  const standing = state.regions[regionId]?.standing ?? 0
  return Math.round(base * mult * (1 - Math.min(0.3, standing / 400)))
}

export type OpenResult = { ok: true } | { ok: false; reason: string }

export function beginAssault(state: GameState, regionId: RegionId, committed: string[]): OpenResult {
  if (state.battle) return { ok: false, reason: 'You are already in a battle.' }
  const region = REGION_BY_ID[regionId]
  if (!region) return { ok: false, reason: 'No such place.' }
  if (region.kind !== 'foreign') return { ok: false, reason: 'There is nobody there to fight.' }
  const rs = state.regions[regionId]
  if (!rs?.discovered) return { ok: false, reason: 'You have not found it.' }
  if (rs.held) return { ok: false, reason: 'It is already yours.' }

  const live = state.companies.filter((c) => committed.includes(c.uid) && c.strength > 0)
  if (!live.length) return { ok: false, reason: 'You have committed nobody.' }

  const enemy = garrisonStrength(state, regionId)
  state.battle = {
    region: regionId,
    side: 'attack',
    power: region.power ?? '',
    committed: live.map((c) => c.uid),
    startStrength: Object.fromEntries(live.map((c) => [c.uid, c.strength])),
    enemyStrength: enemy,
    enemyMaxStrength: enemy,
    cooldown: 0,
    elapsed: 0,
    stance: 'hold',
    log: [{ t: state.elapsed, text: `Your companies come up before ${region.name}.`, kind: 'info' }],
  }

  // Marching on a people is noticed by all of them.
  declareWar(state, region.power ?? '')
  return { ok: true }
}

/** Everyone is watching. Marching on one power costs standing with the rest. */
export function declareWar(state: GameState, powerId: string): void {
  if (!powerId) return
  if (!state.atWarWith.includes(powerId)) state.atWarWith.push(powerId)

  const target = POWER_BY_ID[powerId]
  for (const region of REGIONS) {
    if (region.kind !== 'foreign') continue
    const rs = state.regions[region.id]
    if (!rs) continue
    // Their own holds resent it most; the onlookers merely take note.
    const drop = region.power === powerId ? 60 : 12
    rs.standing = Math.max(0, rs.standing - drop)
  }
  if (target) {
    state.log.push({ t: state.elapsed, text: `You are at war with ${target.name}. Word travels.` })
  }
}

function conditionHolds(rule: BattleRule, state: GameState, b: Battle): boolean {
  const live = state.companies.filter((c) => b.committed.includes(c.uid))
  const started = Object.values(b.startStrength).reduce((n, v) => n + v, 0)
  const now = live.reduce((n, c) => n + c.strength, 0)
  switch (rule.condition.kind) {
    case 'always': return true
    case 'ourLossesAbove': return started > 0 && 1 - now / started > rule.condition.pct
    case 'theirLossesAbove': return 1 - b.enemyStrength / b.enemyMaxStrength > rule.condition.pct
    case 'moraleBelow': {
      if (!live.length) return false
      const avg = live.reduce((n, c) => n + c.morale, 0) / live.length
      return avg < rule.condition.pct
    }
    case 'outnumbered': return b.enemyStrength > now
    case 'haveRole': {
      const need = rule.condition.role
      return live.some((c) => c.role === need && c.strength > 0)
    }
  }
}

/** Whether a stance's role requirement is actually met. */
function stanceUsable(state: GameState, b: Battle, stance: BattleStance): boolean {
  const need = STANCES[stance].role
  if (!need) return true
  return state.companies.some((c) => b.committed.includes(c.uid) && c.role === need && c.strength > 0)
}

const EXCHANGE_SECONDS = 6

function blog(b: Battle, t: number, text: string, kind: Battle['log'][number]['kind']) {
  b.log.push({ t, text, kind })
  if (b.log.length > 40) b.log.splice(0, b.log.length - 40)
}

/**
 * Advance a battle. Exchanges happen every EXCHANGE_SECONDS, so a fight is
 * minutes long rather than instant — long enough to walk away from and come
 * back to, which is the whole reason the plan exists.
 */
export function tickBattle(state: GameState, dt: number, rng: Rng): void {
  const b = state.battle
  if (!b) return

  b.elapsed += dt
  b.cooldown -= dt
  if (b.cooldown > 0) return
  b.cooldown += EXCHANGE_SECONDS

  const live = state.companies.filter((c) => b.committed.includes(c.uid) && c.strength > 0)
  if (!live.length) { loseBattle(state, b); return }

  const rule = state.battlePlan.find(
    (r) => r.enabled && stanceUsable(state, b, r.stance) && conditionHolds(r, state, b),
  )
  const stance = rule?.stance ?? 'hold'
  b.stance = stance
  const s = STANCES[stance]

  if (stance === 'withdraw') {
    // Withdrawing costs a parting bite but keeps the companies.
    for (const c of live) {
      c.strength = Math.max(0, Math.round(c.strength * 0.94))
      c.morale = Math.max(0, c.morale - 8)
    }
    blog(b, state.elapsed, 'You break off and march away.', 'info')
    state.log.push({ t: state.elapsed, text: `Withdrew from ${REGION_BY_ID[b.region]?.name ?? 'the field'}.` })
    state.battle = null
    return
  }

  // The commander fights too, and is worth a small company on their own.
  const captain = derivedStats(state)
  const ourPower = armyPower(state, b.committed) * s.ours + captain.attack * 2

  const theirPower = b.enemyStrength * (1 + (POWER_BY_ID[b.power]?.garrison ?? 1) * 0.2) * s.theirs

  const swing = 0.85 + rng() * 0.3
  const dealt = Math.max(1, Math.round(ourPower * 0.05 * swing))
  const taken = Math.max(1, Math.round(theirPower * 0.045 * (2 - swing)))

  b.enemyStrength = Math.max(0, b.enemyStrength - dealt)

  // Casualties fall across the committed companies in proportion to size, so a
  // big company bleeds more men and a small one is not wiped by one exchange.
  const total = live.reduce((n, c) => n + c.strength, 0)
  for (const c of live) {
    const share = c.strength / total
    const hit = Math.round(taken * share)
    c.strength = Math.max(0, c.strength - hit)
    c.morale = Math.max(0, Math.min(100, c.morale + s.morale - (hit / Math.max(1, c.strength + hit)) * 40))
    if (c.strength === 0) {
      blog(b, state.elapsed, `${c.name} are broken.`, 'rout')
    } else if (c.morale <= 10) {
      blog(b, state.elapsed, `${c.name} are close to routing.`, 'rout')
    }
  }

  blog(b, state.elapsed, `${STANCES[stance].name}: ${dealt} of theirs, ${taken} of ours.`, 'clash')

  if (b.enemyStrength <= 0) { winBattle(state, b, rng); return }
  if (state.companies.filter((c) => b.committed.includes(c.uid) && c.strength > 0).length === 0) {
    loseBattle(state, b)
  }
}

function winBattle(state: GameState, b: Battle, rng: Rng) {
  const region = REGION_BY_ID[b.region]
  const rs = state.regions[b.region]

  if (b.side === 'attack' && rs) {
    rs.held = true
    rs.loyalty = 20
    rs.prosperity = Math.max(rs.prosperity, 6)
    state.log.push({ t: state.elapsed, text: `${region?.name ?? 'The hold'} is taken.` })
  } else if (rs) {
    state.log.push({ t: state.elapsed, text: `${region?.name ?? 'The region'} holds.` })
  }

  for (const c of state.companies) {
    if (!b.committed.includes(c.uid) || c.strength <= 0) continue
    c.veterancy += 1
    c.morale = Math.min(100, c.morale + 18)
  }

  // A won battle is worth a great deal of practice.
  const xp = Math.round(b.enemyMaxStrength * 3)
  grantXp(state, 'statecraft', xp)
  grantXp(state, derivedStats(state).weaponSkill, Math.round(xp * 0.6))
  state.coin += randInt(rng, 200, 600) + Math.round(b.enemyMaxStrength)

  blog(b, state.elapsed, 'The field is yours.', 'win')
  state.battle = null
}

function loseBattle(state: GameState, b: Battle) {
  const region = REGION_BY_ID[b.region]

  if (b.side === 'defend') {
    // Ground can go backwards. A failed defence costs the region outright.
    const rs = state.regions[b.region]
    if (rs) {
      rs.held = false
      rs.loyalty = 0
      state.log.push({ t: state.elapsed, text: `${region?.name ?? 'The region'} is lost.` })
    }
  } else {
    state.log.push({ t: state.elapsed, text: `The assault on ${region?.name ?? 'the hold'} fails.` })
  }

  blog(b, state.elapsed, 'The line is gone.', 'loss')
  state.battle = null
}

/**
 * Whether the commander survives a defeat, and the cost if not.
 *
 * A plan with no withdrawal rule is a plan that can kill you — which is the
 * point of writing one. Succession does the rest.
 */
export function commanderFalls(state: GameState, rng: Rng): boolean {
  const vitality = levelOf(state, 'vitality')
  const risk = Math.max(0.04, 0.3 - vitality * 0.002)
  return rng() < risk
}

// ------------------------------------------------------------------ threats

/** Seconds between a power considering whether to march. */
const MUSTER_CHECK = 900

/**
 * Enemy aggression.
 *
 * Powers muster against ground you hold. It is announced with a countdown
 * because an idle game must never take a region off you during the eight hours
 * you were asleep without ever having shown you it was coming.
 */
export function considerMuster(state: GameState, rng: Rng): void {
  const held = REGIONS.filter((r) => state.regions[r.id]?.held && r.id !== 'ashcombe')
  if (!held.length) return

  for (const power of Object.values(POWER_BY_ID)) {
    const known = REGIONS.some((r) => r.power === power.id && state.regions[r.id]?.discovered)
    if (!known) continue

    const atWar = state.atWarWith.includes(power.id)
    // Aggression rises steeply once you have actually marched on them.
    const chance = (power.aggression / 100) * (atWar ? 3.5 : 1) * (MUSTER_CHECK / 3600)
    if (rng() > chance) continue

    // They come for ground of yours nearest to them.
    const target = held[Math.floor(rng() * held.length)]
    if (!target) continue
    if (state.threats.some((t) => t.region === target.id)) continue

    const strength = Math.round((90 + rng() * 120) * power.garrison * (atWar ? 1.5 : 1))
    state.threats.push({
      uid: nextUid(state, 't'),
      region: target.id,
      power: power.id,
      strength,
      // Days of warning, not minutes.
      arrivesAt: state.elapsed + 1200 + rng() * 1800,
    })
    state.log.push({ t: state.elapsed, text: `${power.warcry} ${target.name} is their mark.` })
  }
}

/** Threats whose time has come become battles, or take the region unopposed. */
export function resolveArrivals(state: GameState): void {
  for (let i = state.threats.length - 1; i >= 0; i--) {
    const threat = state.threats[i]!
    if (state.elapsed < threat.arrivesAt) continue
    state.threats.splice(i, 1)

    const rs = state.regions[threat.region]
    if (!rs?.held) continue

    const defenders = state.companies.filter((c) => c.home === threat.region && c.strength > 0)
    const region = REGION_BY_ID[threat.region]

    if (!defenders.length) {
      // Nobody was raised there. The region simply changes hands.
      rs.held = false
      rs.loyalty = 0
      state.log.push({
        t: state.elapsed,
        text: `${region?.name ?? 'A region'} falls without a fight. Nobody was raised to hold it.`,
      })
      continue
    }

    if (state.battle) continue

    state.battle = {
      region: threat.region,
      side: 'defend',
      power: threat.power,
      committed: defenders.map((c) => c.uid),
      startStrength: Object.fromEntries(defenders.map((c) => [c.uid, c.strength])),
      enemyStrength: threat.strength,
      enemyMaxStrength: threat.strength,
      cooldown: 0,
      elapsed: 0,
      stance: 'hold',
      log: [{
        t: state.elapsed,
        text: `${POWER_BY_ID[threat.power]?.name ?? 'They'} are before ${region?.name ?? 'the walls'}.`,
        kind: 'info',
      }],
    }
  }
}

export { willTreat, MUSTER_CHECK }
