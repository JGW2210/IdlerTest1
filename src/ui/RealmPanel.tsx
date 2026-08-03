import { useState } from 'react'
import { useGame } from '@/state/store'
import { REGIONS } from '@/content/regions'
import { itemById } from '@/content/items'
import { CLAIM_STANDING } from '@/content/powers'
import { knownHolds } from '@/engine/diplomacy'
import { RETIREMENT_AGE, INHERITANCE_RATE, SECONDS_PER_YEAR } from '@/engine/curves'

/**
 * The realm and the bloodline (ballots X-A and III-A).
 *
 * There is no mode switch between "character game" and "strategy game" — the
 * holding widens out of the same systems. Succession is the long arc: the person
 * resets, the world does not, and the heir carries forward a share of everything
 * their forebear learned plus a trait earned by what they were actually best at.
 */
export function RealmPanel() {
  const state = useGame((s) => s.state)
  useGame((s) => s.revision)
  const succeedNow = useGame((s) => s.succeedNow)
  const exportToText = useGame((s) => s.exportToText)
  const importFromText = useGame((s) => s.importFromText)
  const hardReset = useGame((s) => s.hardReset)
  const learnFrom = useGame((s) => s.learnFromTutor)
  const claim = useGame((s) => s.claimHold)

  const [heir, setHeir] = useState('')
  const [payload, setPayload] = useState('')

  if (!state) return null

  const age = Math.floor(state.character.age)
  const canSucceed = age >= RETIREMENT_AGE
  const yearsLeft = Math.max(0, RETIREMENT_AGE - state.character.age)
  const held = REGIONS.filter((r) => state.regions[r.id]?.held)
  const known = REGIONS.filter((r) => state.regions[r.id]?.discovered)
  const holds = knownHolds(state)
  const foreignTotal = REGIONS.filter((r) => r.kind === 'foreign').length

  return (
    <div>
      <h1 className="page">The Holding</h1>
      <p className="page-sub">
        Generation {state.legacy.generation}. {held.length} of {REGIONS.length} regions held,
        {' '}{known.length} known.
      </p>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <header><div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Bloodline</div></header>
          <div className="inner">
            <div className="stat-strip" style={{ marginBottom: '0.75rem' }}>
              <div><b>{state.legacy.generation}</b><span>Generation</span></div>
              <div><b>{age}</b><span>Age</span></div>
              <div><b>×{state.legacy.xpBonus.toFixed(2)}</b><span>XP bonus</span></div>
              <div><b>{state.legacy.traits.length}</b><span>Traits</span></div>
            </div>

            {state.legacy.traits.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <p className="eyebrow" style={{ marginBottom: '0.3rem' }}>Inherited</p>
                {state.legacy.traits.map((t, i) => (
                  <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--gold)' }}>{t}</div>
                ))}
              </div>
            )}

            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
              {canSucceed
                ? `Your character is ${age} and may pass the holding on. The heir inherits ${Math.round(INHERITANCE_RATE * 100)}% of every skill's experience, a permanent trait earned from whatever this life was best at, and a compounding bonus to all future experience. The map, the realm, your glyphs and your spells persist.`
                : `Succession opens at ${RETIREMENT_AGE}. About ${Math.ceil((yearsLeft * SECONDS_PER_YEAR) / 60)} minutes of play away.`}
            </p>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                className="field"
                style={{ flex: 1, background: 'var(--bg-deep)', color: 'var(--text)', border: '1px solid var(--edge-hi)', borderRadius: 2, padding: '0.25rem 0.4rem' }}
                placeholder="Heir's name"
                value={heir}
                onChange={(e) => setHeir(e.target.value)}
              />
              <button
                className="btn primary"
                disabled={!canSucceed || heir.trim().length === 0}
                onClick={() => succeedNow(heir.trim())}
              >
                Pass the holding on
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <header>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Foreign holds</div>
            <span className="eyebrow">{holds.length} found of {foreignTotal}</span>
          </header>
          <div className="inner" style={{ maxHeight: '30rem', overflowY: 'auto' }}>
            {holds.length === 0 ? (
              <p className="empty">
                None reached. The six powers keep holds out past ring three — each teaches words
                nobody else will, and trades a metal nobody else has.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {holds.map((h) => (
                  <div key={h.region.id} className="hold">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ fontFamily: 'var(--serif)', fontSize: '0.98rem' }}>{h.region.name}</b>
                        <p className="eyebrow" style={{ marginTop: 1 }}>{h.power.name}{h.held ? ' · yours' : ''}</p>
                      </div>
                      <span className="eyebrow" style={{ color: 'var(--gold)' }}>{h.tier.name}</span>
                    </div>

                    <div className="meter" style={{ margin: '0.4rem 0' }}>
                      <i style={{ width: `${Math.min(100, h.standing)}%`, background: 'linear-gradient(90deg, var(--glow-2), var(--gold))' }} />
                    </div>
                    <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>
                      standing {Math.floor(h.standing)}/100 · trades {itemById(h.power.material.id)?.name}
                    </p>

                    {h.offers.length > 0 && (
                      <div className="chips" style={{ marginBottom: '0.35rem' }}>
                        {h.offers.map((o) => (
                          <button
                            key={o.glyph}
                            className="chip"
                            disabled={o.known || state.insight < o.price}
                            title={o.known ? 'Already known' : `${o.price} insight`}
                            onClick={() => learnFrom(h.region.id, o.glyph)}
                          >
                            {o.name} {o.known ? '✓' : `· ${o.price}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="eyebrow">
                      {h.offers.length === 0
                        ? `${h.power.greeting} They teach nothing yet — work their ground.`
                        : h.withheld > 0
                          ? `${h.withheld} more ${h.withheld === 1 ? 'word' : 'words'} held back until your standing rises.`
                          : 'They have taught you everything they will.'}
                    </p>

                    {!h.held && (
                      <button
                        className={`btn tiny ${h.claimable ? 'primary' : ''}`}
                        style={{ marginTop: '0.45rem' }}
                        disabled={!h.claimable}
                        onClick={() => claim(h.region.id)}
                      >
                        {h.claimable ? 'Treat for the hold' : `Treat at standing ${CLAIM_STANDING}`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <header><div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Regions</div></header>
          <div className="inner grid" style={{ gap: '0.35rem', maxHeight: '30rem', overflowY: 'auto' }}>
            {REGIONS.map((r) => {
              const rs = state.regions[r.id]
              return (
                <div key={r.id} className="item" style={{ opacity: rs?.discovered ? 1 : 0.35 }}>
                  <div className="nm">
                    <span>{rs?.discovered ? r.name : 'Unscouted'}</span>
                    <small>
                      {rs?.discovered
                        ? `${r.kind} · ${r.terrain} · danger ${r.danger} · ${rs.held ? `held · loyalty ${rs.loyalty}` : 'unclaimed'}`
                        : `reach ${r.scoutLevelReq ?? '?'}`}
                    </small>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.85rem' }}>
        <header><div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>Save</div></header>
        <div className="inner">
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', margin: '0 0 0.6rem' }}>
            The save lives in this browser. Export produces something you can keep.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            <button className="btn" onClick={() => setPayload(exportToText())}>Export</button>
            <button className="btn" disabled={!payload.trim()} onClick={() => importFromText(payload)}>Import</button>
            <button className="btn danger" onClick={() => void hardReset()}>Erase and begin again</button>
          </div>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Save data appears here on export; paste one here to import."
            style={{
              width: '100%', minHeight: '5rem', background: 'var(--bg-deep)', color: 'var(--text-2)',
              border: '1px solid var(--edge)', borderRadius: 'var(--r)', padding: '0.5rem',
              fontFamily: 'var(--mono)', fontSize: '0.7rem', resize: 'vertical',
            }}
          />
        </div>
      </div>
    </div>
  )
}
