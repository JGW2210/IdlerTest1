import type { GameState, SkillId, SkillState } from './types'
import { INHERITANCE_RATE, STARTING_AGE, maxHealth, maxMana, maxStamina, levelForXp } from './curves'
import { SKILLS } from '@/content/skills'
import { REGIONS, STARTING_REGIONS } from '@/content/regions'
import { STARTING_GLYPHS } from '@/content/glyphs'
import { addItem, nextUid } from './inventory'

export const SAVE_VERSION = 3

function blankSkills(): Record<SkillId, SkillState> {
  const out: Record<SkillId, SkillState> = {}
  for (const s of SKILLS) out[s.id] = { xp: 0, level: 1 }
  return out
}

export function createState(seed = Math.floor(Math.random() * 0xffffffff), name = 'Wat of Ashcombe'): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngCounter: 0,
    uidCounter: 0,
    elapsed: 0,
    lastSeen: Date.now(),

    character: { name, age: STARTING_AGE, health: 0, stamina: 0, mana: 0 },
    legacy: { generation: 1, traits: [], xpBonus: 1 },

    skills: blankSkills(),
    inventory: [],
    equipment: {},
    coin: 12,
    insight: 0,

    focus: { kind: 'idle', progress: 0 },
    retinue: [],

    regions: Object.fromEntries(
      REGIONS.map((r) => [
        r.id,
        {
          discovered: STARTING_REGIONS.includes(r.id),
          held: r.id === 'ashcombe',
          loyalty: r.id === 'ashcombe' ? 100 : 0,
          prosperity: r.id === 'ashcombe' ? 10 : 0,
          // Home is fully drawn; the ring around it is sketched and wants
          // finishing, which is the first thing a survey has to do.
          surveyed: r.id === 'ashcombe' ? 1 : STARTING_REGIONS.includes(r.id) ? 0.45 : 0,
          standing: 0,
        },
      ]),
    ),

    knownGlyphs: [...STARTING_GLYPHS],
    lore: [],
    mapFragments: [],
    spells: [],
    gambits: [],
    combat: null,
    dropCarry: {},
    unlockedTechniques: [],
    log: [{ t: 0, text: 'You inherit a pick, a hand-me-down knife, and forty households who expect nothing of you.' }],
  }

  // A starting kit, so the first thirty seconds have somewhere to go.
  addItem(state, 'copperPick', 1)
  addItem(state, 'copperAxe', 1)
  addItem(state, 'copper_dagger', 1, 'crude')
  addItem(state, 'breadRation', 5)

  state.gambits = defaultGambits(state)

  const s = vitals(state)
  state.character.health = s.health
  state.character.stamina = s.stamina
  state.character.mana = s.mana

  return state
}

function vitals(state: GameState) {
  return {
    health: maxHealth(state.skills['vitality']?.level ?? 1, 0),
    stamina: maxStamina(state.skills['oneHanded']?.level ?? 1, 0),
    mana: maxMana(state.skills['sorcery']?.level ?? 1, 0),
  }
}

/** A sane opening priority list, so combat works before the player has read the
 *  gambit UI. Every rule here is one they can reorder, edit or delete. */
export function defaultGambits(state: GameState) {
  return [
    { uid: nextUid(state, 'g'), enabled: true, condition: { kind: 'selfHealthBelow' as const, pct: 0.25 }, action: { kind: 'flee' as const } },
    { uid: nextUid(state, 'g'), enabled: true, condition: { kind: 'always' as const }, action: { kind: 'attack' as const } },
  ]
}

/**
 * Succession (ballot III-A).
 *
 * The heir inherits a fraction of every skill's XP plus a permanent bloodline
 * trait chosen from what the forebear actually did. The map, the realm, known
 * glyphs and unlocked recipes persist — the *person* resets, not the world. That
 * is what makes this a prestige system that never breaks the fiction.
 */
export function succeed(state: GameState, heirName: string): GameState {
  const next = createState(state.seed + state.legacy.generation, heirName)

  next.legacy = {
    generation: state.legacy.generation + 1,
    traits: [...state.legacy.traits, traitFor(state)],
    xpBonus: Math.round((state.legacy.xpBonus + 0.15) * 100) / 100,
  }

  for (const [id, s] of Object.entries(state.skills)) {
    const kept = Math.floor(s.xp * INHERITANCE_RATE)
    next.skills[id] = { xp: kept, level: levelForXp(kept) }
  }

  // The world remembers even when the person does not.
  next.regions = structuredClone(state.regions)
  next.knownGlyphs = [...state.knownGlyphs]
  next.lore = structuredClone(state.lore)
  next.mapFragments = [...state.mapFragments]
  next.spells = structuredClone(state.spells)
  next.coin = Math.floor(state.coin * 0.5)
  next.insight = state.insight
  next.retinue = structuredClone(state.retinue).map((m) => ({ ...m, assignment: { kind: 'idle' as const, progress: 0 } }))
  next.elapsed = state.elapsed
  // Inherited spells and retinue carry their uids across, so the counter has to
  // come with them or the heir's first craft collides with a forebear's tablet.
  next.uidCounter = Math.max(next.uidCounter, state.uidCounter)

  next.log = [{
    t: state.elapsed,
    text: `${state.character.name} is laid to rest at ${Math.floor(state.character.age)}. ${heirName} takes the holding.`,
  }]

  const v = vitals(next)
  next.character.health = v.health
  next.character.stamina = v.stamina
  next.character.mana = v.mana

  return next
}

/** The bloodline trait is earned by what the forebear was actually best at. */
function traitFor(state: GameState): string {
  let bestId = 'vitality'
  let bestXp = -1
  for (const [id, s] of Object.entries(state.skills)) {
    if (s.xp > bestXp) { bestXp = s.xp; bestId = id }
  }
  const names: Record<string, string> = {
    mining: 'Stonebred — mining yields +5%',
    smithing: 'Forgeborn — quality rolls +5%',
    blade: 'Swordline — blade damage +5%',
    archaeology: 'Antiquarian — excavation yields +5%',
    inscription: 'Runeblood — one extra glyph per tablet',
    vitality: 'Hardy — maximum health +5%',
  }
  return names[bestId] ?? `Legacy of ${bestId} — +5%`
}
