import { useGame } from '@/state/store'
import { TECHNIQUE_BY_ID, TECHNIQUES } from '@/content/foes'
import { FOE_BY_ID } from '@/content/foes'
import { derivedStats } from '@/engine/combat'
import { resolveSpell } from '@/engine/runes'
import type { GambitAction, GambitCondition, GambitRule } from '@/engine/types'

/**
 * The gambit editor (ballot IV-A).
 *
 * This screen is the combat system. The fight resolves itself; what the player
 * authors is the priority list, walked top to bottom every time the character is
 * free to act. Reordering these rows is the difference between a build that
 * works and one that does not — which is what makes techniques decisions rather
 * than decorations, and what keeps the whole thing idle-compatible.
 */

const CONDITIONS: { label: string; value: GambitCondition }[] = [
  { label: 'Always', value: { kind: 'always' } },
  { label: 'Foe below 30%', value: { kind: 'foeHealthBelow', pct: 0.3 } },
  { label: 'Foe below 50%', value: { kind: 'foeHealthBelow', pct: 0.5 } },
  { label: 'Foe above 60%', value: { kind: 'foeHealthAbove', pct: 0.6 } },
  { label: 'Self below 40%', value: { kind: 'selfHealthBelow', pct: 0.4 } },
  { label: 'Self below 25%', value: { kind: 'selfHealthBelow', pct: 0.25 } },
  { label: 'Stamina above 30', value: { kind: 'staminaAbove', value: 30 } },
  { label: 'Mana above 40', value: { kind: 'manaAbove', value: 40 } },
]

function conditionLabel(c: GambitCondition): string {
  return CONDITIONS.find((x) => JSON.stringify(x.value) === JSON.stringify(c))?.label ?? 'Always'
}

function actionKey(a: GambitAction): string {
  switch (a.kind) {
    case 'attack': return 'attack'
    case 'flee': return 'flee'
    case 'technique': return `t:${a.technique}`
    case 'spell': return `s:${a.spell}`
  }
}

export function CombatPanel() {
  const state = useGame((s) => s.state)
  useGame((s) => s.revision)
  const setGambits = useGame((s) => s.setGambits)
  const addRule = useGame((s) => s.addGambitRule)
  if (!state) return null

  const stats = derivedStats(state)
  const combat = state.combat
  const foe = combat ? FOE_BY_ID[combat.foe] : undefined

  const available = state.unlockedTechniques.map((id) => TECHNIQUE_BY_ID[id]).filter(Boolean)

  const update = (uid: string, patch: Partial<GambitRule>) => {
    setGambits(state.gambits.map((g) => (g.uid === uid ? { ...g, ...patch } : g)))
  }
  const move = (index: number, delta: number) => {
    const next = [...state.gambits]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    const [row] = next.splice(index, 1)
    if (row) next.splice(target, 0, row)
    setGambits(next)
  }

  return (
    <div>
      <h1 className="page">Gambits</h1>
      <p className="page-sub">
        Combat resolves on its own. Each time you are free to act the engine walks this list from
        the top and fires the first rule whose condition holds — so the list, not your reflexes,
        is the build. Rules are checked in order; put the specific ones above the general ones.
      </p>

      <div className="stat-strip" style={{ marginBottom: '0.85rem' }}>
        <div><b>{stats.attack}</b><span>Attack</span></div>
        <div><b>{stats.armour}</b><span>Armour</span></div>
        <div><b>{stats.maxHealth}</b><span>Max HP</span></div>
        <div><b>{(stats.crit * 100).toFixed(1)}%</b><span>Crit</span></div>
        <div><b>{stats.speed.toFixed(2)}s</b><span>Swing</span></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)' }}>
        <div className="card">
          <header>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Priority list</div>
            <button className="btn tiny" onClick={addRule}>Add rule</button>
          </header>
          <div className="inner grid" style={{ gap: '0.35rem' }}>
            {state.gambits.map((g, i) => (
              <div key={g.uid} className={`gambit ${g.enabled ? '' : 'off'}`}>
                <span className="n">{i + 1}</span>

                <select
                  value={conditionLabel(g.condition)}
                  onChange={(e) => {
                    const found = CONDITIONS.find((c) => c.label === e.target.value)
                    if (found) update(g.uid, { condition: found.value })
                  }}
                >
                  {CONDITIONS.map((c) => <option key={c.label}>{c.label}</option>)}
                </select>

                <select
                  value={actionKey(g.action)}
                  onChange={(e) => {
                    const v = e.target.value
                    const action: GambitAction =
                      v === 'attack' ? { kind: 'attack' }
                      : v === 'flee' ? { kind: 'flee' }
                      : v.startsWith('t:') ? { kind: 'technique', technique: v.slice(2) }
                      : { kind: 'spell', spell: v.slice(2) }
                    update(g.uid, { action })
                  }}
                >
                  <option value="attack">Attack</option>
                  <option value="flee">Disengage</option>
                  {available.map((t) => <option key={t!.id} value={`t:${t!.id}`}>{t!.name}</option>)}
                  {state.spells.map((s) => {
                    const r = resolveSpell(s)
                    return r ? <option key={s.uid} value={`s:${s.uid}`}>{r.name}</option> : null
                  })}
                </select>

                <button className="btn tiny" onClick={() => move(i, -1)} title="Move up">↑</button>
                <button className="btn tiny" onClick={() => update(g.uid, { enabled: !g.enabled })} title="Enable/disable">
                  {g.enabled ? '●' : '○'}
                </button>
              </div>
            ))}
            <p className="eyebrow" style={{ marginTop: '0.35rem' }}>
              The last rule should be an unconditional one, or you will stand there thinking.
            </p>
          </div>
        </div>

        <div className="card">
          <header>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>{foe ? foe.name : 'Not in combat'}</div>
            {combat && foe && <span className="eyebrow">{Math.max(0, Math.ceil(combat.foeHealth))}/{combat.foeMaxHealth}</span>}
          </header>
          <div className="inner">
            {combat && foe ? (
              <>
                <div className="meter hp" style={{ marginBottom: '0.6rem' }}>
                  <i style={{ width: `${Math.max(0, (combat.foeHealth / combat.foeMaxHealth) * 100)}%` }} />
                </div>
                <div style={{ maxHeight: '18rem', overflowY: 'auto' }}>
                  {[...combat.log].reverse().map((l, i) => (
                    <div key={i} className={`logline k-${l.kind}`}>{l.text}</div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty">Set a hunt or delve node as your focus from the map.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.85rem' }}>
        <header>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Techniques</div>
          <span className="eyebrow">{state.unlockedTechniques.length}/{TECHNIQUES.length} learned</span>
        </header>
        <div className="inner grid g2">
          {TECHNIQUES.map((t) => {
            const has = state.unlockedTechniques.includes(t.id)
            return (
              <div key={t.id} className="item" style={{ opacity: has ? 1 : 0.4 }}>
                <div className="nm">
                  <span>{t.name}</span>
                  <small>{t.skill} {t.levelReq} · ×{t.damageMult} · {t.staminaCost} sta · {t.cooldown}s</small>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
