import type { EquipSlot, GameState, ItemStack, QualityId } from './types'
import { QUALITIES } from './curves'
import { itemById } from '@/content/items'

/**
 * Inventory operations. Materials stack; equipment does not, because quality
 * (ballot VII-B) makes two nominally identical blades genuinely different items.
 */

/**
 * Instance ids come off the save, not a module-level counter. A counter in
 * module scope resets on page load, so the first item crafted after a reload
 * would be issued a uid an existing item already held — and equipping would then
 * pick up the wrong one.
 */
export function nextUid(state: GameState, prefix = 'i'): string {
  state.uidCounter += 1
  return `${prefix}${state.uidCounter.toString(36)}`
}

export function addItem(state: GameState, itemId: string, qty = 1, quality?: QualityId): void {
  const def = itemById(itemId)
  if (!def || qty <= 0) return

  if (def.stack) {
    const existing = state.inventory.find((s) => s.item === itemId)
    if (existing) existing.qty += qty
    else state.inventory.push({ item: itemId, qty })
    return
  }

  for (let i = 0; i < qty; i++) {
    state.inventory.push({ item: itemId, qty: 1, quality: quality ?? 'common', uid: nextUid(state) })
  }
}

export function countItem(state: GameState, itemId: string): number {
  let n = 0
  for (const s of state.inventory) if (s.item === itemId) n += s.qty
  return n
}

export function removeItem(state: GameState, itemId: string, qty = 1): boolean {
  if (countItem(state, itemId) < qty) return false
  let remaining = qty
  for (let i = state.inventory.length - 1; i >= 0 && remaining > 0; i--) {
    const s = state.inventory[i]!
    if (s.item !== itemId) continue
    const take = Math.min(s.qty, remaining)
    s.qty -= take
    remaining -= take
    if (s.qty <= 0) state.inventory.splice(i, 1)
  }
  return true
}

export function hasInputs(state: GameState, inputs: { item: string; qty: number }[]): boolean {
  return inputs.every((i) => countItem(state, i.item) >= i.qty)
}

export function consumeInputs(state: GameState, inputs: { item: string; qty: number }[]): boolean {
  if (!hasInputs(state, inputs)) return false
  for (const i of inputs) removeItem(state, i.item, i.qty)
  return true
}

/** Effective value of a stack, quality included. */
export function stackValue(stack: ItemStack): number {
  const def = itemById(stack.item)
  if (!def) return 0
  const q = stack.quality ? QUALITIES[stack.quality].mult : 1
  return Math.round(def.value * q * stack.qty)
}

/** Item stats after the quality multiplier — the only place stats should be read. */
export function effectiveStats(stack: ItemStack) {
  const def = itemById(stack.item)
  if (!def?.stats) return {}
  const mult = stack.quality ? QUALITIES[stack.quality].mult : 1
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(def.stats)) {
    if (typeof v !== 'number') continue
    // Crit and slot counts are flat; everything else scales with quality.
    out[k] = k === 'crit' || k === 'tabletSlots' || k === 'gatherSpeed' ? v : Math.round(v * mult)
  }
  return out as Partial<Record<keyof NonNullable<typeof def.stats>, number>>
}

export function equip(state: GameState, uid: string): boolean {
  const idx = state.inventory.findIndex((s) => s.uid === uid)
  if (idx === -1) return false
  const stack = state.inventory[idx]!
  const def = itemById(stack.item)
  if (!def?.slot) return false

  const slot = resolveSlot(state, def.slot)
  const current = state.equipment[slot]
  state.inventory.splice(idx, 1)
  state.equipment[slot] = stack
  if (current) state.inventory.push(current)
  return true
}

/** Rings and tablets have paired slots; fill the empty one first. */
function resolveSlot(state: GameState, slot: EquipSlot): EquipSlot {
  if (slot === 'ring1' && state.equipment.ring1 && !state.equipment.ring2) return 'ring2'
  if (slot === 'tablet1' && state.equipment.tablet1 && !state.equipment.tablet2) return 'tablet2'
  return slot
}

export function unequip(state: GameState, slot: EquipSlot): boolean {
  const current = state.equipment[slot]
  if (!current) return false
  delete state.equipment[slot]
  state.inventory.push(current)
  return true
}

/** Summed equipment stats — health, armour, attack and the rest. */
export function equipmentStats(state: GameState) {
  const total = { attack: 0, armour: 0, health: 0, stamina: 0, mana: 0, crit: 0, tabletSlots: 0 }
  for (const stack of Object.values(state.equipment)) {
    if (!stack) continue
    const s = effectiveStats(stack)
    total.attack += s.attack ?? 0
    total.armour += s.armour ?? 0
    total.health += s.health ?? 0
    total.stamina += s.stamina ?? 0
    total.mana += s.mana ?? 0
    total.crit += s.crit ?? 0
    total.tabletSlots += s.tabletSlots ?? 0
  }
  return total
}

/** Best gathering-tool multiplier the player is carrying for a given skill. */
export function toolSpeedFor(state: GameState, skillId: string): number {
  const relevant: Record<string, string[]> = {
    mining: ['copperPick', 'steelPick', 'mithralPick'],
    forestry: ['copperAxe', 'steelAxe'],
    archaeology: ['trowel'],
  }
  const ids = relevant[skillId]
  if (!ids) return 1
  let best = 1
  for (const id of ids) {
    if (countItem(state, id) > 0) {
      const s = itemById(id)?.stats?.gatherSpeed ?? 1
      best = Math.min(best, s)
    }
  }
  return best
}

// ------------------------------------------------------------------- sorting

export type SortKey = 'name' | 'qty' | 'value' | 'tier'

export function sortStacks(stacks: ItemStack[], key: SortKey, desc = true): ItemStack[] {
  const dir = desc ? -1 : 1
  return [...stacks].sort((a, b) => {
    const da = itemById(a.item)
    const db = itemById(b.item)
    switch (key) {
      case 'qty': return dir * (a.qty - b.qty)
      case 'value': return dir * (stackValue(a) - stackValue(b))
      case 'tier': return dir * ((da?.tier ?? 0) - (db?.tier ?? 0))
      default: return -dir * (da?.name ?? '').localeCompare(db?.name ?? '')
    }
  })
}
