import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/state/store'
import { REGIONS, ringOf } from '@/content/regions'
import { SKILL_BY_ID } from '@/content/skills'
import { itemById } from '@/content/items'
import { effectiveLevel, levelOf } from '@/engine/skills'
import { surveyTargets, unfinishedRegions } from '@/engine/survey'
import { drawChart, drawLocale, CHART_TIERS, chartDetail, type HexCenter, type SiteMark } from './chart'
import type { SiteDef } from '@/engine/types'

/**
 * Three levels of zoom, which is what "granular" needed to mean:
 *
 *   the chart   — where in the world (hexes, rings 0–5)
 *   the locale  — where in the valley (an inset plan with sites placed on it)
 *   the site    — how deep (layers you descend through)
 *
 * The first two are drawn on vellum; the third is a list, because depth is a
 * ladder and a ladder is not a place.
 */
export function MapView() {
  const state = useGame((s) => s.state)
  const revision = useGame((s) => s.revision)
  const setFocus = useGame((s) => s.setFocus)

  const worldRef = useRef<HTMLCanvasElement>(null)
  const localeRef = useRef<HTMLCanvasElement>(null)
  const hexes = useRef<HexCenter[]>([])
  const marks = useRef<SiteMark[]>([])

  const [selected, setSelected] = useState('ashcombe')
  const [openSite, setOpenSite] = useState<string | null>(null)

  const carto = state ? levelOf(state, 'cartography') : 1

  // ------------------------------------------------------------ world chart
  useEffect(() => {
    const canvas = worldRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    hexes.current = drawChart(ctx, {
      regions: REGIONS,
      states: state.regions,
      selected,
      cartography: carto,
      width: w,
      height: h,
    })
  }, [state, revision, selected, carto])

  // ------------------------------------------------------------ locale inset
  const region = REGIONS.find((r) => r.id === selected)
  const regionState = region ? state?.regions[region.id] : undefined

  useEffect(() => {
    const canvas = localeRef.current
    if (!canvas || !region || !regionState?.discovered) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    marks.current = drawLocale(ctx, {
      region,
      surveyed: regionState.surveyed,
      cartography: carto,
      selectedSite: openSite,
      width: w,
      height: h,
    })
  }, [region, regionState, revision, openSite, carto])

  if (!state) return null

  const known = REGIONS.filter((r) => state.regions[r.id]?.discovered)
  const unfinished = unfinishedRegions(state)
  const targets = surveyTargets(state)
  const nextTarget = targets[0]
  const surveying = state.focus.kind === 'survey'

  const clickWorld = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: string | null = null
    let bestD = Infinity
    for (const c of hexes.current) {
      const d = Math.hypot(c.x - x, c.y - y)
      if (d < c.size * 0.92 && d < bestD) { bestD = d; best = c.id }
    }
    if (best && state.regions[best]?.discovered) {
      setSelected(best)
      setOpenSite(null)
    }
  }

  const clickLocale = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    for (const m of marks.current) {
      if (Math.hypot(m.x - x, m.y - y) < m.r) {
        setOpenSite((cur) => (cur === m.id ? null : m.id))
        return
      }
    }
    setOpenSite(null)
  }

  const site: SiteDef | undefined = region?.sites.find((s) => s.id === openSite)
  const detail = chartDetail(carto)
  const nextTier = CHART_TIERS.find((t) => t.level > carto)

  return (
    <div>
      <h1 className="page">The Chart</h1>
      <p className="page-sub">
        Not a view of the world — a sheet of vellum you are drawing on. Ground nobody has
        walked is simply blank. {known.length} of {REGIONS.length} regions inked.
        {nextTier && ` Cartography ${nextTier.level} adds ${nextTier.label.toLowerCase()}.`}
      </p>

      <div className="chart-frame">
        <canvas ref={worldRef} onClick={clickWorld} className="chart-world" />
      </div>

      <div className="survey-bar">
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="eyebrow">Survey — Cartography {carto}</p>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
            {unfinished.length > 0
              ? `${unfinished.length} ${unfinished.length === 1 ? 'sheet' : 'sheets'} unfinished. Surveying fills them in before pushing outward.`
              : nextTarget
                ? nextTarget.reachable
                  ? `Ready to push on toward ${nextTarget.region.name}.`
                  : `The way on to ${nextTarget.region.name} needs Cartography ${nextTarget.region.scoutLevelReq}.`
                : 'Nothing left within reach to survey.'}
          </div>
        </div>
        <button
          className={`btn ${surveying ? '' : 'primary'}`}
          onClick={() => setFocus({ kind: 'survey', progress: 0 })}
        >
          {surveying ? 'Surveying' : 'Survey the frontier'}
        </button>
      </div>

      {region && regionState?.discovered && (
        <div className="locale-grid">
          <div className="chart-frame">
            <canvas ref={localeRef} onClick={clickLocale} className="chart-locale" />
          </div>

          <div className="card">
            <header>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 600 }}>{region.name}</div>
                <p className="eyebrow">
                  ring {ringOf(region)} · {region.terrain} · danger {region.danger}
                  {region.outland ? ' · outland' : ''}
                </p>
              </div>
              <span className="eyebrow">{Math.round(regionState.surveyed * 100)}% drawn</span>
            </header>
            <div className="inner">
              {region.province && <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>{region.province}</p>}
              {region.blurb && (
                <p style={{ margin: '0 0 0.85rem', color: 'var(--text-2)', fontSize: '0.85rem' }}>{region.blurb}</p>
              )}

              {/* The plan is clickable, but a canvas cannot be reached by
                  keyboard, so the sites are also listed as real buttons. */}
              <div className="chips" style={{ marginBottom: '0.75rem' }}>
                {region.sites.map((s) => (
                  <button
                    key={s.id}
                    className={`chip ${openSite === s.id ? 'on' : ''}`}
                    onClick={() => setOpenSite((cur) => (cur === s.id ? null : s.id))}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {!site && (
                <p className="empty" style={{ padding: '0.5rem 0' }}>
                  {detail.symbols
                    ? 'Choose a site, on the plan or above.'
                    : 'The plan is crude. Cartography 10 will start marking terrain.'}
                </p>
              )}

              {site && (
                <>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: '1rem' }}>{site.name}</div>
                  <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>
                    {site.activity} · {SKILL_BY_ID[site.skill]?.name}
                  </p>
                  {site.blurb && (
                    <p style={{ margin: '0 0 0.75rem', color: 'var(--text-2)', fontSize: '0.82rem' }}>{site.blurb}</p>
                  )}

                  <div className="layers">
                    {site.layers.map((l, i) => {
                      const lvl = effectiveLevel(state, site.skill)
                      const locked = lvl < l.levelReq
                      const active = state.focus.kind === 'node' && state.focus.node === l.id
                      return (
                        <div key={l.id} className={`layer ${locked ? 'locked' : ''} ${active ? 'active' : ''}`}>
                          <div className="depth">{'—'.repeat(i + 1)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                              <b style={{ fontSize: '0.875rem' }}>{l.name}</b>
                              <span className="eyebrow">
                                lv {l.levelReq}
                                {l.strata !== undefined ? ` · age ${l.strata}` : ''}
                              </span>
                            </div>
                            {l.blurb && (
                              <p style={{ margin: '0.15rem 0 0.3rem', color: 'var(--muted)', fontSize: '0.78rem' }}>{l.blurb}</p>
                            )}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', margin: '0.3rem 0' }}>
                              {l.yields.slice(0, 5).map((y) => (
                                <span key={y.item} className="chip" style={{ cursor: 'default', fontSize: '0.68rem' }}>
                                  {itemById(y.item)?.name ?? y.item}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            className={`btn tiny ${active || locked ? '' : 'primary'}`}
                            disabled={locked}
                            onClick={() => setFocus({ kind: 'node', node: l.id, region: region.id, progress: 0 })}
                          >
                            {locked ? `${SKILL_BY_ID[site.skill]?.name} ${l.levelReq}` : active ? 'Working' : 'Work'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
