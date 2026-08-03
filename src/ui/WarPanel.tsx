import { useState } from 'react'
import { useGame } from '@/state/store'
import { REGIONS, REGION_BY_ID } from '@/content/regions'
import { POWER_BY_ID } from '@/content/powers'
import { MATERIAL_TIERS } from '@/content/materials'
import { countItem } from '@/engine/inventory'
import {
  ROLES, STANCES, armsCost, armyPower, companyPower, garrisonStrength,
  levyCapacity, levyFree, levyInUse,
} from '@/engine/warfare'
import type { BattleCondition, BattleStance, CompanyRole } from '@/engine/types'

/**
 * The war screen.
 *
 * Three things live here and they are deliberately in this order: the companies
 * you have raised and armed, the plan that fights for you, and the war itself.
 * You should be able to answer "can I afford this fight" before you start it,
 * which is why the muster line and the enemy's strength are both on screen.
 */

const CONDITIONS: { label: string; value: BattleCondition }[] = [
  { label: 'Always', value: { kind: 'always' } },
  { label: 'We have lost 30%', value: { kind: 'ourLossesAbove', pct: 0.3 } },
  { label: 'We have lost 60%', value: { kind: 'ourLossesAbove', pct: 0.6 } },
  { label: 'They have lost 30%', value: { kind: 'theirLossesAbove', pct: 0.3 } },
  { label: 'They have lost 50%', value: { kind: 'theirLossesAbove', pct: 0.5 } },
  { label: 'Morale below 35', value: { kind: 'moraleBelow', pct: 35 } },
  { label: 'Outnumbered', value: { kind: 'outnumbered' } },
  { label: 'We have horse', value: { kind: 'haveRole', role: 'horse' } },
  { label: 'We have bows', value: { kind: 'haveRole', role: 'bow' } },
  { label: 'We have engines', value: { kind: 'haveRole', role: 'engine' } },
]

function conditionLabel(c: BattleCondition): string {
  return CONDITIONS.find((x) => JSON.stringify(x.value) === JSON.stringify(c))?.label ?? 'Always'
}

export function WarPanel() {
  const state = useGame((s) => s.state)
  useGame((s) => s.revision)
  const raise = useGame((s) => s.raiseCompany)
  const disband = useGame((s) => s.disbandCompany)
  const arm = useGame((s) => s.armCompany)
  const setPlan = useGame((s) => s.setBattlePlan)
  const addRule = useGame((s) => s.addBattleRule)
  const assault = useGame((s) => s.beginAssault)

  const [role, setRole] = useState<CompanyRole>('foot')
  const [size, setSize] = useState(30)
  const [target, setTarget] = useState<string>('')
  const [chosen, setChosen] = useState<string[]>([])

  if (!state) return null

  const capacity = levyCapacity(state)
  const used = levyInUse(state)
  const free = levyFree(state)
  const held = REGIONS.filter((r) => state.regions[r.id]?.held)
  const battle = state.battle
  const targets = REGIONS.filter(
    (r) => r.kind === 'foreign' && state.regions[r.id]?.discovered && !state.regions[r.id]?.held,
  )
  const bars = MATERIAL_TIERS.filter((m) => countItem(state, m.id) > 0)

  const update = (uid: string, patch: Partial<{ condition: BattleCondition; stance: BattleStance; enabled: boolean }>) => {
    setPlan(state.battlePlan.map((r) => (r.uid === uid ? { ...r, ...patch } : r)))
  }
  const move = (i: number, delta: number) => {
    const next = [...state.battlePlan]
    const to = i + delta
    if (to < 0 || to >= next.length) return
    const [row] = next.splice(i, 1)
    if (row) next.splice(to, 0, row)
    setPlan(next)
  }

  return (
    <div>
      <h1 className="page">War</h1>
      <p className="page-sub">
        Companies are raised from what your held ground can bear and armed from your own forge.
        Battles fight themselves from the plan below — so write one that knows when to walk away.
      </p>

      {state.threats.length > 0 && (
        <div className="card" style={{ marginBottom: '0.85rem', borderColor: 'var(--danger)' }}>
          <header>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--danger)' }}>Mustering against you</div>
            <span className="eyebrow">defend or lose the ground</span>
          </header>
          <div className="inner grid" style={{ gap: '0.35rem' }}>
            {state.threats.map((t) => {
              const mins = Math.max(0, Math.ceil((t.arrivesAt - state.elapsed) / 60))
              const defenders = state.companies.filter((c) => c.home === t.region && c.strength > 0)
              return (
                <div key={t.uid} className="item">
                  <div className="nm">
                    <span>{POWER_BY_ID[t.power]?.name ?? 'Someone'} → {REGION_BY_ID[t.region]?.name}</span>
                    <small>
                      {t.strength} strong · arrives in {mins}m ·{' '}
                      {defenders.length
                        ? `${defenders.length} ${defenders.length === 1 ? 'company' : 'companies'} raised there`
                        : 'nobody raised there — it will fall unopposed'}
                    </small>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {battle && (
        <div className="card" style={{ marginBottom: '0.85rem', borderColor: 'var(--warn)' }}>
          <header>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>
              {battle.side === 'attack' ? 'Assaulting' : 'Defending'} {REGION_BY_ID[battle.region]?.name}
            </div>
            <span className="eyebrow">{STANCES[battle.stance].name}</span>
          </header>
          <div className="inner">
            <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>
              Them — {Math.max(0, Math.round(battle.enemyStrength))}/{battle.enemyMaxStrength}
            </p>
            <div className="meter hp" style={{ marginBottom: '0.6rem' }}>
              <i style={{ width: `${Math.max(0, (battle.enemyStrength / battle.enemyMaxStrength) * 100)}%` }} />
            </div>
            <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>
              Us — {armyPower(state, battle.committed)} power in the field
            </p>
            <div style={{ maxHeight: '14rem', overflowY: 'auto', marginTop: '0.5rem' }}>
              {[...battle.log].reverse().map((l, i) => (
                <div key={i} className={`logline k-${l.kind === 'win' ? 'reward' : l.kind === 'loss' ? 'death' : l.kind === 'rout' ? 'taken' : 'info'}`}>
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '0.85rem' }}>
        <header>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>The muster</div>
          <span className="eyebrow">{used} of {capacity} levy committed · {free} free</span>
        </header>
        <div className="inner">
          <div className="meter" style={{ marginBottom: '0.75rem' }}>
            <i style={{ width: `${capacity ? Math.min(100, (used / capacity) * 100) : 0}%`, background: 'linear-gradient(90deg, var(--glow-2), var(--gold))' }} />
          </div>

          {held.length === 0 ? (
            <p className="empty">You hold no ground, so there is nobody to raise.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
              <select className="field" style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value as CompanyRole)}>
                {(Object.keys(ROLES) as CompanyRole[]).map((r) => (
                  <option key={r} value={r}>{ROLES[r].name} — ×{ROLES[r].cost} levy</option>
                ))}
              </select>
              <input
                type="number"
                min={10}
                max={400}
                step={10}
                value={size}
                onChange={(e) => setSize(Math.max(10, Number(e.target.value) || 10))}
                style={{ width: '5rem', background: 'var(--bg-deep)', color: 'var(--text)', border: '1px solid var(--edge-hi)', borderRadius: 2, padding: '0.25rem 0.4rem' }}
              />
              <select className="field" style={{ width: 'auto' }} value={target || held[0]?.id} onChange={(e) => setTarget(e.target.value)}>
                {held.map((r) => <option key={r.id} value={r.id}>from {r.name}</option>)}
              </select>
              <button
                className="btn primary"
                onClick={() => raise(role, size, target || held[0]!.id)}
                disabled={Math.ceil(size * ROLES[role].cost) > free}
              >
                Raise — {Math.ceil(size * ROLES[role].cost)} levy
              </button>
              <span className="eyebrow">{ROLES[role].blurb}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '0.85rem' }}>
        <header>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Companies</div>
          <span className="eyebrow">{state.companies.length} standing</span>
        </header>
        <div className="inner">
          {state.companies.length === 0 ? (
            <p className="empty">Nobody is under arms.</p>
          ) : (
            <div className="grid g2">
              {state.companies.map((c) => {
                const armsName = c.arms ? MATERIAL_TIERS.find((m) => m.tier === c.arms)?.name ?? `T${c.arms}` : 'Farm tools'
                const inField = battle?.committed.includes(c.uid)
                const picked = chosen.includes(c.uid)
                return (
                  <div key={c.uid} className="hold" style={{ borderLeftColor: c.strength === 0 ? 'var(--danger)' : 'var(--gold)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', alignItems: 'baseline' }}>
                      <b style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem' }}>{c.name}</b>
                      <span className="eyebrow">{ROLES[c.role].name}</span>
                    </div>
                    <p className="eyebrow" style={{ marginTop: 2 }}>
                      {c.strength} men · {armsName} · morale {Math.round(c.morale)} · {c.veterancy} battles · power {companyPower(c)}
                    </p>
                    <p className="eyebrow">home: {REGION_BY_ID[c.home]?.name}</p>

                    <div className="chips" style={{ marginTop: '0.4rem' }}>
                      {bars.filter((m) => m.tier > c.arms).slice(0, 4).map((m) => {
                        const cost = armsCost(c.strength, m.tier)
                        return (
                          <button
                            key={m.id}
                            className="chip"
                            disabled={countItem(state, m.id) < cost}
                            title={`${cost} ${m.name} bars`}
                            onClick={() => arm(c.uid, m.id)}
                          >
                            {m.name} · {cost}
                          </button>
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.45rem' }}>
                      <button
                        className={`btn tiny ${picked ? 'primary' : ''}`}
                        disabled={!!battle || c.strength === 0}
                        onClick={() => setChosen((p) => (p.includes(c.uid) ? p.filter((x) => x !== c.uid) : [...p, c.uid]))}
                      >
                        {inField ? 'In the field' : picked ? 'Committed' : 'Commit'}
                      </button>
                      <button className="btn tiny danger" disabled={!!inField} onClick={() => disband(c.uid)}>Disband</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' }}>
        <div className="card">
          <header>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Battle plan</div>
            <button className="btn tiny" onClick={addRule}>Add rule</button>
          </header>
          <div className="inner grid" style={{ gap: '0.35rem' }}>
            {state.battlePlan.map((r, i) => (
              <div key={r.uid} className={`gambit ${r.enabled ? '' : 'off'}`}>
                <span className="n">{i + 1}</span>
                <select
                  value={conditionLabel(r.condition)}
                  onChange={(e) => {
                    const found = CONDITIONS.find((c) => c.label === e.target.value)
                    if (found) update(r.uid, { condition: found.value })
                  }}
                >
                  {CONDITIONS.map((c) => <option key={c.label}>{c.label}</option>)}
                </select>
                <select value={r.stance} onChange={(e) => update(r.uid, { stance: e.target.value as BattleStance })}>
                  {(Object.keys(STANCES) as BattleStance[]).map((s) => (
                    <option key={s} value={s}>{STANCES[s].name}</option>
                  ))}
                </select>
                <button className="btn tiny" onClick={() => move(i, -1)} title="Move up">↑</button>
                <button className="btn tiny" onClick={() => update(r.uid, { enabled: !r.enabled })}>{r.enabled ? '●' : '○'}</button>
              </div>
            ))}
            <p className="eyebrow" style={{ marginTop: '0.35rem' }}>
              Checked top to bottom, first match wins. A plan with no withdrawal in it is a plan
              that can get you killed.
            </p>
          </div>
        </div>

        <div className="card">
          <header>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>March</div>
            <span className="eyebrow">{chosen.length} committed</span>
          </header>
          <div className="inner">
            {targets.length === 0 ? (
              <p className="empty">No foreign hold found yet. Survey outward.</p>
            ) : (
              <>
                <select
                  className="field"
                  style={{ marginBottom: '0.6rem' }}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">Choose a hold…</option>
                  {targets.map((r) => {
                    const power = r.power ? POWER_BY_ID[r.power] : undefined
                    return (
                      <option key={r.id} value={r.id}>
                        {r.name} — {power?.name} ({garrisonStrength(state, r.id)} strong)
                      </option>
                    )
                  })}
                </select>

                {target && REGION_BY_ID[target] && (
                  <>
                    <div className="stat-strip" style={{ marginBottom: '0.6rem' }}>
                      <div><b>{garrisonStrength(state, target)}</b><span>Garrison</span></div>
                      <div><b>{armyPower(state, chosen)}</b><span>Your power</span></div>
                      <div><b>{state.regions[target]?.standing ?? 0}</b><span>Standing</span></div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', margin: '0 0 0.6rem' }}>
                      {(() => {
                        const p = REGION_BY_ID[target]?.power ? POWER_BY_ID[REGION_BY_ID[target]!.power!] : undefined
                        if (!p) return null
                        return p.disposition === 'implacable'
                          ? `${p.name} will never treat at any standing. This is the only way in.`
                          : `${p.name} would sell this at full standing. Taking it will cost you standing everywhere.`
                      })()}
                    </p>
                  </>
                )}

                <button
                  className="btn primary"
                  disabled={!target || chosen.length === 0 || !!battle}
                  onClick={() => { assault(target, chosen); setChosen([]) }}
                >
                  {battle ? 'Already engaged' : 'March'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
