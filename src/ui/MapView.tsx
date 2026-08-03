import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/state/store'
import { REGIONS } from '@/content/regions'
import { effectiveLevel } from '@/engine/skills'
import { SKILL_BY_ID } from '@/content/skills'
import { itemById } from '@/content/items'
import type { RegionDef } from '@/engine/types'

/**
 * The map (ballot VIII-A). Hexes carry terrain, ownership and danger for the
 * realm layer; each holds one to four activity nodes, which is where the
 * character layer actually plays. Ring 2 stays under fog until Cartography
 * lifts it, so the map is a progression track rather than a backdrop.
 */

const TERRAIN_TINT: Record<RegionDef['terrain'], string> = {
  village: '#1E3038',
  forest: '#1B2A20',
  mountain: '#262A31',
  plains: '#2B2C1F',
  cavern: '#20191F',
  town: '#2A2620',
  ruin: '#241F2E',
  unknown: '#14181D',
}

export function MapView() {
  const state = useGame((s) => s.state)
  const revision = useGame((s) => s.revision)
  const setFocus = useGame((s) => s.setFocus)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<string>('ashcombe')
  const centersRef = useRef<{ id: string; x: number; y: number; size: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const size = Math.max(30, Math.min(w / 8.4, h / 9.1))
    const ox = w / 2
    const oy = h / 2
    const centers: typeof centersRef.current = []

    const hexPath = (cx: number, cy: number, s: number) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i)
        const x = cx + s * Math.cos(a)
        const y = cy + s * Math.sin(a)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
    }

    // Unexplored ring: everything within radius 2 that no region occupies.
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        const dist = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2
        if (dist > 2) continue
        if (REGIONS.some((rg) => rg.coord.q === q && rg.coord.r === r)) continue
        const cx = ox + size * 1.5 * q
        const cy = oy + size * Math.sqrt(3) * (r + q / 2)
        hexPath(cx, cy, size * 0.94)
        ctx.fillStyle = '#0C0F13'
        ctx.fill()
        ctx.setLineDash([3, 4])
        ctx.strokeStyle = '#1E252D'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    for (const region of REGIONS) {
      const rs = state.regions[region.id]
      const cx = ox + size * 1.5 * region.coord.q
      const cy = oy + size * Math.sqrt(3) * (region.coord.r + region.coord.q / 2)
      centers.push({ id: region.id, x: cx, y: cy, size })

      const known = rs?.discovered ?? false
      hexPath(cx, cy, size * 0.94)

      if (!known) {
        ctx.fillStyle = '#0C0F13'
        ctx.fill()
        ctx.setLineDash([3, 4])
        ctx.strokeStyle = '#242C35'
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#3A454F'
        ctx.textAlign = 'center'
        ctx.font = `${Math.round(size * 0.2)}px var(--mono), monospace`
        ctx.fillText('?', cx, cy + size * 0.08)
        continue
      }

      ctx.fillStyle = TERRAIN_TINT[region.terrain]
      ctx.fill()

      const isSel = region.id === selected
      const held = rs?.held ?? false
      ctx.strokeStyle = isSel ? '#5FD3E8' : held ? '#2A94AC' : '#35424F'
      ctx.lineWidth = isSel ? 2.5 : held ? 2 : 1
      ctx.stroke()

      if (isSel) {
        ctx.save()
        ctx.shadowColor = '#5FD3E8'
        ctx.shadowBlur = 18
        ctx.stroke()
        ctx.restore()
      }

      // Activity nodes as a row above the label.
      const pips = region.nodes.length
      ctx.fillStyle = held ? '#5FD3E8' : '#6C7885'
      const gap = size * 0.17
      for (let p = 0; p < pips; p++) {
        ctx.beginPath()
        ctx.arc(cx + (p - (pips - 1) / 2) * gap, cy - size * 0.42, size * 0.045, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.textAlign = 'center'
      ctx.fillStyle = '#E6EAEE'
      ctx.font = `600 ${Math.round(size * 0.215)}px Palatino, Georgia, serif`
      ctx.fillText(region.name, cx, cy + size * 0.08)

      ctx.fillStyle = '#6C7885'
      ctx.font = `${Math.round(size * 0.15)}px ui-monospace, monospace`
      ctx.fillText(region.terrain.toUpperCase(), cx, cy + size * 0.32)

      if (region.danger > 0) {
        ctx.fillStyle = region.danger >= 5 ? '#D6604A' : '#6C7885'
        ctx.font = `${Math.round(size * 0.14)}px ui-monospace, monospace`
        ctx.fillText('◆'.repeat(Math.min(4, Math.ceil(region.danger / 2))), cx, cy + size * 0.52)
      }
    }

    centersRef.current = centers
  }, [state, revision, selected])

  if (!state) return null

  const region = REGIONS.find((r) => r.id === selected)
  const regionState = region ? state.regions[region.id] : undefined

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: string | null = null
    let bestD = Infinity
    for (const c of centersRef.current) {
      const d = Math.hypot(c.x - x, c.y - y)
      if (d < c.size * 0.94 && d < bestD) { bestD = d; best = c.id }
    }
    if (best && state.regions[best]?.discovered) setSelected(best)
  }

  return (
    <div>
      <h1 className="page">The Cantref</h1>
      <p className="page-sub">
        Seven hexes known of nineteen. Ring two lifts as Cartography rises — the fog is a
        progression track, not decoration.
      </p>

      <div className="mapwrap">
        <canvas ref={canvasRef} onClick={onClick} />
      </div>

      {region && (
        <div className="card" style={{ marginTop: '0.85rem' }}>
          <header>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 600 }}>{region.name}</div>
              <p className="eyebrow">
                {region.terrain} · danger {region.danger} · {regionState?.held ? 'held' : 'unclaimed'}
              </p>
            </div>
          </header>
          <div className="inner">
            {region.blurb && <p style={{ margin: '0 0 0.85rem', color: 'var(--text-2)', maxWidth: '64ch' }}>{region.blurb}</p>}

            <div className="grid g2">
              {region.nodes.map((node) => {
                const skill = SKILL_BY_ID[node.skill]
                const lvl = effectiveLevel(state, node.skill)
                const locked = lvl < node.levelReq
                const active = state.focus.kind === 'node' && state.focus.node === node.id
                return (
                  <div key={node.id} className="card" style={{ background: 'var(--panel-2)' }}>
                    <div className="inner">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                        <b style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem' }}>{node.name}</b>
                        <span className="eyebrow">{node.activity}</span>
                      </div>
                      <p className="eyebrow" style={{ marginTop: '0.2rem' }}>
                        {skill?.name} {node.levelReq} · {node.xp} xp
                      </p>
                      <div style={{ margin: '0.5rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {node.yields.slice(0, 4).map((y) => (
                          <span key={y.item} className="chip" style={{ cursor: 'default' }}>
                            {itemById(y.item)?.name ?? y.item}
                          </span>
                        ))}
                      </div>
                      <button
                        className={`btn ${active ? '' : 'primary'}`}
                        disabled={locked}
                        onClick={() => setFocus({ kind: 'node', node: node.id, region: region.id, progress: 0 })}
                      >
                        {locked ? `Needs ${skill?.name} ${node.levelReq}` : active ? 'Focused' : 'Set as focus'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
