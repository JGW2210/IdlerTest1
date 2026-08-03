import { useMemo, useState } from 'react'
import { useGame } from '@/state/store'
import { itemById } from '@/content/items'
import { sortStacks, stackValue, effectiveStats, type SortKey } from '@/engine/inventory'
import type { EquipSlot, ItemCategory, ItemStack } from '@/engine/types'

/**
 * Inventory and loadout. The brief asked for type sorting with sub-sorting by
 * amount and value; both are here, and quality is surfaced by colour because
 * under ballot VII-B two items with the same name are genuinely different.
 */

const CATEGORIES: { id: ItemCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'material', label: 'Materials' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armour', label: 'Armour' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'tablet', label: 'Tablets' },
  { id: 'consumable', label: 'Consumables' },
  { id: 'tool', label: 'Tools' },
  { id: 'relic', label: 'Relics' },
]

const SLOTS: { id: EquipSlot; label: string }[] = [
  { id: 'mainHand', label: 'Main hand' },
  { id: 'offHand', label: 'Off hand' },
  { id: 'head', label: 'Head' },
  { id: 'chest', label: 'Chest' },
  { id: 'legs', label: 'Legs' },
  { id: 'hands', label: 'Hands' },
  { id: 'feet', label: 'Feet' },
  { id: 'ring1', label: 'Ring' },
  { id: 'ring2', label: 'Ring' },
  { id: 'neck', label: 'Neck' },
  { id: 'charm', label: 'Charm' },
  { id: 'tablet1', label: 'Tablet' },
  { id: 'tablet2', label: 'Tablet' },
]

function StackRow({ stack, onEquip }: { stack: ItemStack; onEquip?: () => void }) {
  const def = itemById(stack.item)
  if (!def) return null
  const stats = effectiveStats(stack)
  const bits: string[] = []
  if (stats.attack) bits.push(`${stats.attack} atk`)
  if (stats.armour) bits.push(`${stats.armour} arm`)
  if (stats.health) bits.push(`+${stats.health} hp`)
  if (stats.mana) bits.push(`+${stats.mana} mp`)

  return (
    <div className="item">
      <div className="nm">
        <span className={stack.quality ? `q-${stack.quality}` : def.tier >= 13 ? 'tier-relic' : ''}>
          {stack.quality && stack.quality !== 'common' ? `${stack.quality[0]!.toUpperCase()}${stack.quality.slice(1)} ` : ''}
          {def.name}
        </span>
        <small>T{def.tier} · {stackValue(stack)}c{bits.length ? ` · ${bits.join(' · ')}` : ''}</small>
      </div>
      {onEquip ? (
        <button className="btn tiny" onClick={onEquip}>Equip</button>
      ) : (
        <div className="qty">{stack.qty}</div>
      )}
    </div>
  )
}

export function InventoryPanel() {
  const state = useGame((s) => s.state)
  const revision = useGame((s) => s.revision)
  const equipItem = useGame((s) => s.equipItem)
  const unequipSlot = useGame((s) => s.unequipSlot)

  const [cat, setCat] = useState<ItemCategory | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('value')

  const stacks = useMemo(() => {
    if (!state) return []
    const filtered = cat === 'all'
      ? state.inventory
      : state.inventory.filter((s) => itemById(s.item)?.category === cat)
    return sortStacks(filtered, sort)
    // revision is the change signal for the mutable engine state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, cat, sort, revision])

  if (!state) return null

  const totalValue = state.inventory.reduce((n, s) => n + stackValue(s), 0)

  return (
    <div>
      <h1 className="page">Pack &amp; Loadout</h1>
      <p className="page-sub">{state.inventory.length} lines · {totalValue.toLocaleString()} coin of goods.</p>

      <div className="card" style={{ marginBottom: '0.85rem' }}>
        <header>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Loadout</div>
          <span className="eyebrow">13 slots</span>
        </header>
        <div className="inner">
          <div className="grid g3">
            {SLOTS.map((slot) => {
              const worn = state.equipment[slot.id]
              const def = worn ? itemById(worn.item) : undefined
              return (
                <div key={slot.id} className="item" style={{ background: worn ? 'var(--panel-2)' : 'transparent' }}>
                  <div className="nm">
                    <small style={{ marginBottom: 2 }}>{slot.label}</small>
                    {worn && def ? (
                      <span className={worn.quality ? `q-${worn.quality}` : ''} style={{ fontSize: '0.8125rem' }}>{def.name}</span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>empty</span>
                    )}
                  </div>
                  {worn && <button className="btn tiny" onClick={() => unequipSlot(slot.id)}>×</button>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <header>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
          <select className="field" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="value">Value</option>
            <option value="qty">Amount</option>
            <option value="tier">Tier</option>
            <option value="name">Name</option>
          </select>
        </header>
        <div className="inner">
          {stacks.length === 0 ? (
            <p className="empty">Nothing here yet.</p>
          ) : (
            <div className="grid g2">
              {stacks.map((s, i) => (
                <StackRow
                  key={s.uid ?? `${s.item}-${i}`}
                  stack={s}
                  onEquip={s.uid && itemById(s.item)?.slot ? () => equipItem(s.uid!) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
