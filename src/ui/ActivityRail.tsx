import { useGame } from '@/state/store'
import { findNode } from '@/content/regions'
import { recipeById } from '@/content/recipes'
import { currentActionTime } from '@/engine/tick'
import { TABLET_BY_ITEM } from '@/engine/archaeology'
import { RETINUE_RATE } from '@/engine/curves'
import type { Assignment, GameState } from '@/engine/types'

/**
 * The core loop, made visible (ballot I-B).
 *
 * One focused assignment runs at full rate and rolls rare yields; retinue
 * assignments run in the background at a reduced rate and roll only common ones.
 * The rail is always on screen because the number of slots *is* the master
 * progression currency — and hiring the villager who fills the next one is where
 * the civilisation layer begins.
 */

function describe(state: GameState, a: Assignment): { what: string; where: string } {
  if (a.kind === 'node' && a.node) {
    const found = findNode(a.node)
    if (found) return { what: found.layer.name, where: `${found.site.name}, ${found.region.name}` }
  }
  if (a.kind === 'recipe' && a.recipe) {
    const r = recipeById(a.recipe)
    if (r) return { what: r.name, where: 'Workshop' }
  }
  if (a.kind === 'survey') return { what: 'Surveying', where: 'The frontier' }
  if (a.kind === 'decipher' && a.tablet) {
    const def = TABLET_BY_ITEM[a.tablet]
    if (def) return { what: `Deciphering a ${def.name}`, where: 'The scriptorium' }
  }
  void state
  return { what: 'Idle', where: 'Nothing assigned' }
}

function Slot({ state, assignment, focused, name, rate }: {
  state: GameState
  assignment: Assignment
  focused: boolean
  name?: string
  rate: number
}) {
  const { what, where } = describe(state, assignment)
  const per = currentActionTime(state, assignment)
  const effective = per !== null ? per / rate : null
  const pct = effective && effective > 0 ? Math.min(1, assignment.progress / effective) : 0

  return (
    <div className={`assign ${focused ? 'focused' : ''}`}>
      <div className="top">
        <div style={{ minWidth: 0 }}>
          {name && <p className="eyebrow" style={{ marginBottom: 1 }}>{name}</p>}
          <div className="what">{what}</div>
          <div className="where">{where}</div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <p className="eyebrow">{focused ? 'Focus' : `${Math.round(rate * 100)}%`}</p>
          {effective && <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-2)' }}>{effective.toFixed(1)}s</div>}
        </div>
      </div>
      {assignment.kind !== 'idle' && (
        <div className="progress"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>
      )}
    </div>
  )
}

export function ActivityRail() {
  const state = useGame((s) => s.state)
  useGame((s) => s.revision)
  const hire = useGame((s) => s.hireRetinue)
  const setRetinue = useGame((s) => s.setRetinue)
  if (!state) return null

  const hireCost = 250 * Math.pow(3, state.retinue.length)

  return (
    <>
      <div>
        <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>Focused work — full rate, rare yields</p>
        <Slot state={state} assignment={state.focus} focused rate={1} />
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>
          Retinue — {Math.round(RETINUE_RATE * 100)}% rate, common yields only
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {state.retinue.length === 0 && (
            <p className="empty" style={{ border: '1px dashed var(--edge)', borderRadius: 'var(--r)' }}>
              No one works for you yet.
            </p>
          )}
          {state.retinue.map((m) => (
            <div key={m.uid}>
              <Slot state={state} assignment={m.assignment} focused={false} name={m.name} rate={RETINUE_RATE * m.skill} />
              <button
                className="btn tiny"
                style={{ marginTop: '0.3rem', width: '100%' }}
                onClick={() => setRetinue(m.uid, { ...state.focus, progress: 0 })}
                disabled={state.focus.kind === 'idle'}
                title="Copy your current focus onto this villager"
              >
                Set to my focus
              </button>
            </div>
          ))}
          <button className="btn" onClick={hire} disabled={state.coin < hireCost}>
            Hire villager — {hireCost.toLocaleString()}c
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '8rem', display: 'flex', flexDirection: 'column' }}>
        <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>Chronicle</p>
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--edge)', borderRadius: 'var(--r)', padding: '0.4rem 0.55rem', background: 'var(--bg-deep)' }}>
          {[...state.log].slice(-40).reverse().map((l, i) => (
            <div key={i} className="logline">
              <span className="t">{Math.floor(l.t / 60)}m</span>{l.text}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
