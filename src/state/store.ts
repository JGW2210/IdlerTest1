import { create } from 'zustand'
import type { Assignment, GambitRule, GameState, Spell, EquipSlot } from '@/engine/types'
import { TICK_SECONDS } from '@/engine/curves'
import { createState, succeed } from '@/engine/createState'
import { stepAll, assignFocus, assignRetinue } from '@/engine/tick'
import { catchUp, type OfflineResult } from '@/engine/offline'
import { loadGame, saveGame, exportSave, importSave, clearGame } from '@/engine/save'
import { equip, unequip, nextUid } from '@/engine/inventory'
import { canInscribe } from '@/engine/runes'

/**
 * The bridge between the pure engine and React.
 *
 * The engine is never called from a component. Everything goes through a command
 * on this store, which mutates a draft and republishes it — so the set of things
 * that can change game state is small, enumerable, and already shaped like the
 * message protocol a worker would need.
 */

interface Store {
  state: GameState | null
  ready: boolean
  running: boolean
  offline: OfflineResult | null
  error: string | null
  /** Bumped every publish so components re-render off a cheap scalar. */
  revision: number

  boot: () => Promise<void>
  setRunning: (running: boolean) => void
  dismissOffline: () => void

  setFocus: (assignment: Assignment) => void
  setRetinue: (uid: string, assignment: Assignment) => void
  hireRetinue: () => void

  equipItem: (uid: string) => void
  unequipSlot: (slot: EquipSlot) => void

  inscribeSpell: (spell: Omit<Spell, 'uid'>) => string | null
  removeSpell: (uid: string) => void

  setGambits: (rules: GambitRule[]) => void
  addGambitRule: () => void

  succeedNow: (heirName: string) => void

  exportToText: () => string
  importFromText: (text: string) => void
  hardReset: () => Promise<void>
}

const HIRE_BASE_COST = 250

export const useGame = create<Store>((set, get) => {
  /** Applies a mutation to the live state and republishes. */
  function mutate(fn: (s: GameState) => void) {
    const s = get().state
    if (!s) return
    fn(s)
    set({ revision: get().revision + 1 })
  }

  return {
    state: null,
    ready: false,
    running: true,
    offline: null,
    error: null,
    revision: 0,

    async boot() {
      let state: GameState | null = null
      try {
        state = await loadGame()
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) })
      }

      let offline: OfflineResult | null = null
      if (state) {
        offline = catchUp(state)
      } else {
        state = createState()
      }

      set({ state, offline, ready: true })
      startLoop(get, set)
    },

    setRunning(running) { set({ running }) },
    dismissOffline() { set({ offline: null }) },

    setFocus(assignment) { mutate((s) => assignFocus(s, assignment)) },
    setRetinue(uid, assignment) { mutate((s) => assignRetinue(s, uid, assignment)) },

    hireRetinue() {
      mutate((s) => {
        const cost = HIRE_BASE_COST * Math.pow(3, s.retinue.length)
        if (s.coin < cost) return
        s.coin -= cost
        s.retinue.push({
          uid: nextUid(s, 'r'),
          name: RETINUE_NAMES[s.retinue.length % RETINUE_NAMES.length] ?? 'Villager',
          skill: 1,
          assignment: { kind: 'idle', progress: 0 },
        })
        s.log.push({ t: s.elapsed, text: 'A villager joins your retinue. One more thing can happen at once.' })
      })
    },

    equipItem(uid) { mutate((s) => { equip(s, uid) }) },
    unequipSlot(slot) { mutate((s) => { unequip(s, slot) }) },

    inscribeSpell(spell) {
      const s = get().state
      if (!s) return null
      const uid = nextUid(s, 's')
      const full: Spell = { ...spell, uid, name: '' }
      const check = canInscribe(s, full)
      if (!check.ok) { set({ error: check.reason ?? 'Cannot inscribe.' }); return null }
      mutate((d) => {
        d.spells.push(full)
        d.log.push({ t: d.elapsed, text: 'A new spell is inscribed.' })
      })
      return uid
    },

    removeSpell(uid) {
      mutate((s) => {
        s.spells = s.spells.filter((x) => x.uid !== uid)
        s.gambits = s.gambits.filter((g) => !(g.action.kind === 'spell' && g.action.spell === uid))
      })
    },

    setGambits(rules) { mutate((s) => { s.gambits = rules }) },

    /** New rules land above the last one, which should stay unconditional. */
    addGambitRule() {
      mutate((s) => {
        const rule: GambitRule = {
          uid: nextUid(s, 'g'),
          enabled: true,
          condition: { kind: 'always' },
          action: { kind: 'attack' },
        }
        s.gambits = [...s.gambits.slice(0, -1), rule, ...s.gambits.slice(-1)]
      })
    },

    succeedNow(heirName) {
      const s = get().state
      if (!s) return
      const next = succeed(s, heirName)
      set({ state: next, revision: get().revision + 1 })
      void saveGame(next)
    },

    exportToText() {
      const s = get().state
      return s ? exportSave(s) : ''
    },

    importFromText(text) {
      try {
        const state = importSave(text)
        set({ state, revision: get().revision + 1, error: null })
        void saveGame(state)
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'That save could not be read.' })
      }
    },

    async hardReset() {
      await clearGame()
      set({ state: createState(), revision: get().revision + 1, offline: null, error: null })
    },
  }
})

const RETINUE_NAMES = ['Edith', 'Cuthbert', 'Maud', 'Osric', 'Alys', 'Godwin', 'Hilda', 'Leofric']

/**
 * Fixed-timestep driver.
 *
 * Real elapsed time accumulates and is spent in whole TICK_SECONDS steps, so the
 * simulation advances identically whether the browser is running at 60fps, 144,
 * or throttled to 1 in a background tab. Frame rate never buys progress.
 */
function startLoop(get: () => Store, set: (partial: Partial<Store>) => void) {
  let last = performance.now()
  let accumulator = 0
  let sinceSave = 0

  const frame = (now: number) => {
    const dt = Math.min(1, (now - last) / 1000)
    last = now

    const { state, running } = get()
    if (state && running) {
      accumulator += dt
      if (accumulator >= TICK_SECONDS) {
        const consume = Math.floor(accumulator / TICK_SECONDS) * TICK_SECONDS
        accumulator -= consume
        stepAll(state, consume, 'live')
        set({ revision: get().revision + 1 })
      }

      sinceSave += dt
      if (sinceSave > 10) {
        sinceSave = 0
        state.lastSeen = Date.now()
        void saveGame(state)
      }
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  // A tab closing is the most common way a session ends; persist on the way out.
  window.addEventListener('beforeunload', () => {
    const s = get().state
    if (s) {
      s.lastSeen = Date.now()
      void saveGame(s)
    }
  })
}
