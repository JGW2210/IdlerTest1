import { useState } from 'react'
import { useGame } from '@/state/store'
import { GLYPHS, glyphsOfKind } from '@/content/glyphs'
import { MAX_MODIFIERS, canInscribe, glyphCapacity, resolveSpell, tabletCapacity } from '@/engine/runes'
import { levelOf } from '@/engine/skills'
import type { GlyphDef, Spell } from '@/engine/types'

/**
 * The rune composer (ballot V-A).
 *
 * Nothing here is a spell list. The player assembles a sentence and the engine
 * derives the name, cost, cast time and effect from the parts — so the ceiling
 * on what magic can do is set by which glyphs have been *found*, and by how
 * cleverly they are combined.
 */

function GlyphRow({
  label, kind, known, selected, onPick, disabledIds,
}: {
  label: string
  kind: GlyphDef['kind']
  known: Set<string>
  selected: string[]
  onPick: (id: string) => void
  disabledIds: Set<string>
}) {
  const glyphs = glyphsOfKind(kind)
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <p className="eyebrow" style={{ marginBottom: '0.35rem' }}>{label}</p>
      <div className="chips">
        {glyphs.map((g) => {
          const isKnown = known.has(g.id)
          return (
            <button
              key={g.id}
              className={`chip ${selected.includes(g.id) ? 'on' : ''}`}
              disabled={!isKnown || disabledIds.has(g.id)}
              title={isKnown ? g.clause : `Undiscovered — found through excavation, depths or tutors.`}
              onClick={() => onPick(g.id)}
            >
              {isKnown ? g.name : '???'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function RunesPanel() {
  const state = useGame((s) => s.state)
  useGame((s) => s.revision)
  const inscribe = useGame((s) => s.inscribeSpell)
  const removeSpell = useGame((s) => s.removeSpell)

  const [element, setElement] = useState('fire')
  const [form, setForm] = useState('bolt')
  const [mods, setMods] = useState<string[]>([])
  const [trigger, setTrigger] = useState('onCast')

  if (!state) return null

  const known = new Set(state.knownGlyphs)
  const draft: Spell = { uid: 'draft', name: '', element, form, modifiers: mods, trigger }
  const resolved = resolveSpell(draft)
  const check = canInscribe(state, draft)
  const capacity = glyphCapacity(state)
  const tablets = tabletCapacity(state)

  const toggleMod = (id: string) => {
    setMods((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.length < MAX_MODIFIERS ? [...m, id] : m))
  }

  const modDisabled = new Set(mods.length >= MAX_MODIFIERS ? GLYPHS.filter((g) => g.kind === 'modifier' && !mods.includes(g.id)).map((g) => g.id) : [])

  return (
    <div>
      <h1 className="page">Runic Arts</h1>
      <p className="page-sub">
        A spell is a sentence: an element, the form it takes, up to {MAX_MODIFIERS} modifiers, and
        the trigger that fires it. Your tablets hold {capacity} glyphs each and you may carry {tablets}.
        Glyphs are found, not bought — excavation, dungeon depths, and tutors in Aldermarch.
        Inscription is level {levelOf(state, 'inscription')}.
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)' }}>
        <div className="card">
          <header><div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Compose</div></header>
          <div className="inner">
            <GlyphRow label="Element — one" kind="element" known={known} selected={[element]} onPick={setElement} disabledIds={new Set()} />
            <GlyphRow label="Form — one" kind="form" known={known} selected={[form]} onPick={setForm} disabledIds={new Set()} />
            <GlyphRow label={`Modifiers — up to ${MAX_MODIFIERS}`} kind="modifier" known={known} selected={mods} onPick={toggleMod} disabledIds={modDisabled} />
            <GlyphRow label="Trigger — one" kind="trigger" known={known} selected={[trigger]} onPick={setTrigger} disabledIds={new Set()} />
          </div>
        </div>

        <div className="card">
          <header><div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Inscribed spell</div></header>
          <div className="inner">
            {resolved ? (
              <>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 600, lineHeight: 1.2 }}>{resolved.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--glow)', margin: '0.15rem 0 0.7rem' }}>
                  {resolved.trueName}
                </div>
                <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', minHeight: '4.5em', margin: '0 0 0.75rem' }}>{resolved.description}</p>

                <div className="stat-strip" style={{ marginBottom: '0.75rem' }}>
                  <div><b>{resolved.power}</b><span>Power</span></div>
                  <div><b>{resolved.manaCost}</b><span>Mana</span></div>
                  <div><b>{resolved.castTime ? `${resolved.castTime}s` : '—'}</b><span>Cast</span></div>
                  <div><b style={{ color: resolved.glyphCount > capacity ? 'var(--danger)' : undefined }}>{resolved.glyphCount}/{capacity}</b><span>Glyphs</span></div>
                </div>

                {!check.ok && <p style={{ color: 'var(--warn)', fontSize: '0.8rem', margin: '0 0 0.6rem' }}>{check.reason}</p>}

                <button
                  className="btn primary"
                  disabled={!check.ok || state.spells.length >= tablets}
                  onClick={() => inscribe({ name: '', element, form, modifiers: mods, trigger })}
                >
                  {state.spells.length >= tablets ? 'No free tablet' : 'Inscribe'}
                </button>
              </>
            ) : (
              <p className="empty">Select an element and a form.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.85rem' }}>
        <header>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Carried spells</div>
          <span className="eyebrow">{state.spells.length}/{tablets} tablets</span>
        </header>
        <div className="inner">
          {state.spells.length === 0 ? (
            <p className="empty">Nothing inscribed. A spell must be carried on a tablet to be cast.</p>
          ) : (
            <div className="grid g2">
              {state.spells.map((s) => {
                const r = resolveSpell(s)
                if (!r) return null
                return (
                  <div key={s.uid} className="item">
                    <div className="nm">
                      <span style={{ color: 'var(--glow)' }}>{r.name}</span>
                      <small>{r.power} power · {r.manaCost} mana · {r.castTime ? `${r.castTime}s` : 'triggered'}</small>
                    </div>
                    <button className="btn tiny danger" onClick={() => removeSpell(s.uid)}>Erase</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.85rem' }}>
        <header>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Glyphs known</div>
          <span className="eyebrow">{state.knownGlyphs.length}/{GLYPHS.length}</span>
        </header>
        <div className="inner chips">
          {GLYPHS.map((g) => (
            <span key={g.id} className="chip" style={{ cursor: 'default', opacity: known.has(g.id) ? 1 : 0.35 }}>
              {known.has(g.id) ? g.name : '???'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
