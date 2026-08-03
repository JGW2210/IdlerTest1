import type { RegionDef, RegionState, SiteDef, Terrain } from '@/engine/types'
import { mulberry32, hashString } from '@/engine/rng'

/**
 * The chart.
 *
 * This is not a viewport onto the world — it is a physical vellum sheet the
 * character is drawing. Nothing appears on it that nobody has walked to, and how
 * *well* a thing is drawn depends on two numbers: the region's own `surveyed`
 * value, and the character's Cartography level.
 *
 * That second dependency is the point. At Cartography 1 you get a shaky outline
 * and a name. By 60 you have hachured hills, tree stamps, roads, a compass rose
 * and marginalia. The map becoming beautiful is itself a progression track, and
 * it is the only one in the game the player watches rather than reads.
 *
 * Every wobble and blot is seeded off a stable id, so the hand is *inconsistent*
 * the way a real hand is but does not jitter between frames.
 */

export const INK = {
  vellum: '#DFD1AC',
  vellumDeep: '#D2C193',
  ink: '#3A2E20',
  inkSoft: '#6E5C42',
  inkFaint: '#8C7B5E',
  ochre: '#9A4B2E',
  green: '#4C6642',
  water: '#48626F',
  gold: '#A97F2E',
  /** A second ink, for another people's ground. Charts really were drawn in two. */
  foreign: '#3F4B6B',
} as const

/** What Cartography unlocks on the sheet, and at what level. */
export const CHART_TIERS = [
  { level: 1, label: 'Outlines and names' },
  { level: 10, label: 'Terrain symbols' },
  { level: 22, label: 'Hachured relief and site marks' },
  { level: 34, label: 'Roads between holdings' },
  { level: 46, label: 'Compass rose and scale' },
  { level: 58, label: 'Ruled border and marginalia' },
] as const

export function chartDetail(cartography: number) {
  return {
    names: true,
    symbols: cartography >= 10,
    relief: cartography >= 22,
    roads: cartography >= 34,
    compass: cartography >= 46,
    border: cartography >= 58,
  }
}

export interface HexCenter { id: string; x: number; y: number; size: number }

// ------------------------------------------------------------- pen behaviour

/** A stable per-subject random source, so the hand never jitters between frames. */
function pen(seed: string) {
  return mulberry32(hashString(seed))
}

/**
 * An inked polyline: slightly off-true, drawn twice at partial alpha so the
 * strokes build up the way a nib does.
 */
function inkPath(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  seed: string,
  opts: { amp?: number; width?: number; colour?: string; close?: boolean; alpha?: number } = {},
) {
  const amp = opts.amp ?? 1.1
  const rng = pen(seed)
  ctx.save()
  ctx.strokeStyle = opts.colour ?? INK.ink
  ctx.lineWidth = opts.width ?? 1.1
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.globalAlpha = opts.alpha ?? 0.55

  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath()
    pts.forEach(([x, y], i) => {
      const dx = (rng() - 0.5) * amp * 2
      const dy = (rng() - 0.5) * amp * 2
      if (i === 0) ctx.moveTo(x + dx, y + dy)
      else ctx.lineTo(x + dx, y + dy)
    })
    if (opts.close) ctx.closePath()
    ctx.stroke()
  }
  ctx.restore()
}

function hexPoints(cx: number, cy: number, size: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i)
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)])
  }
  return pts
}

export function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath()
  hexPoints(cx, cy, size).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
}

// ------------------------------------------------------------------ the sheet

let paperCache: { w: number; h: number; canvas: HTMLCanvasElement } | null = null

/**
 * The vellum itself: base wash, fibre flecks, and a few age stains. Cached,
 * because it never changes and redrawing several thousand flecks every frame
 * would be the most expensive thing on the page by a wide margin.
 */
function paper(w: number, h: number): HTMLCanvasElement {
  if (paperCache && paperCache.w === w && paperCache.h === h) return paperCache.canvas

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const rng = mulberry32(0x7a9d)

  g.fillStyle = INK.vellum
  g.fillRect(0, 0, w, h)

  // Age stains: broad, soft, mostly toward the edges where a sheet is handled.
  for (let i = 0; i < 26; i++) {
    const edge = rng() < 0.6
    const x = edge ? (rng() < 0.5 ? rng() * w * 0.22 : w - rng() * w * 0.22) : rng() * w
    const y = edge ? (rng() < 0.5 ? rng() * h * 0.22 : h - rng() * h * 0.22) : rng() * h
    const r = 40 + rng() * 150
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(122, 92, 46, ${0.05 + rng() * 0.05})`)
    grad.addColorStop(1, 'rgba(122, 92, 46, 0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // Fibre: short pale and dark strokes lying in the pulp.
  for (let i = 0; i < Math.round((w * h) / 420); i++) {
    const x = rng() * w
    const y = rng() * h
    const len = 1 + rng() * 4
    const a = rng() * Math.PI
    g.strokeStyle = rng() < 0.5 ? 'rgba(255,248,224,0.30)' : 'rgba(96,74,40,0.13)'
    g.lineWidth = 0.6
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    g.stroke()
  }

  // A vignette, as though the sheet is lit from above the table.
  const vig = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.78)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(72,52,24,0.26)')
  g.fillStyle = vig
  g.fillRect(0, 0, w, h)

  paperCache = { w, h, canvas: c }
  return c
}

// -------------------------------------------------------------- map symbols

function mountains(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string, relief: boolean) {
  const rng = pen(seed)
  const n = 3
  for (let i = 0; i < n; i++) {
    const bx = cx + (i - (n - 1) / 2) * s * 0.4 + (rng() - 0.5) * s * 0.08
    const by = cy + (rng() - 0.5) * s * 0.12
    const w = s * (0.22 + rng() * 0.06)
    const hgt = s * (0.26 + rng() * 0.1)
    inkPath(ctx, [[bx - w, by + hgt * 0.5], [bx, by - hgt * 0.5], [bx + w, by + hgt * 0.5]], `${seed}m${i}`, { amp: 0.8, alpha: 0.7 })
    if (relief) {
      // Hachures on the shaded flank — the cartographer's shorthand for slope.
      for (let h2 = 0; h2 < 4; h2++) {
        const t = 0.2 + h2 * 0.18
        inkPath(
          ctx,
          [[bx + w * t * 0.7, by - hgt * 0.5 + hgt * t], [bx + w * t * 1.0, by + hgt * 0.5]],
          `${seed}h${i}${h2}`,
          { amp: 0.4, width: 0.7, alpha: 0.32 },
        )
      }
    }
  }
}

function trees(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  const rng = pen(seed)
  for (let i = 0; i < 5; i++) {
    const x = cx + (rng() - 0.5) * s * 1.0
    const y = cy + (rng() - 0.5) * s * 0.55
    const r = s * (0.08 + rng() * 0.04)
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = INK.green
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y - r * 0.5, r, Math.PI * 0.15, Math.PI * 0.85, true)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y - r * 0.2)
    ctx.lineTo(x, y + r * 0.7)
    ctx.stroke()
    ctx.restore()
  }
}

function marshTufts(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  const rng = pen(seed)
  for (let i = 0; i < 4; i++) {
    const x = cx + (rng() - 0.5) * s * 0.95
    const y = cy + (rng() - 0.5) * s * 0.5
    for (let k = -1; k <= 1; k++) {
      inkPath(ctx, [[x + k * s * 0.05, y], [x + k * s * 0.09, y - s * 0.12]], `${seed}t${i}${k}`, {
        amp: 0.35, width: 0.8, colour: INK.water, alpha: 0.5,
      })
    }
    inkPath(ctx, [[x - s * 0.13, y + s * 0.03], [x + s * 0.13, y + s * 0.03]], `${seed}w${i}`, {
      amp: 0.3, width: 0.7, colour: INK.water, alpha: 0.35,
    })
  }
}

function waves(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  const rng = pen(seed)
  for (let i = 0; i < 4; i++) {
    const y = cy - s * 0.3 + i * s * 0.2 + (rng() - 0.5) * s * 0.05
    const x0 = cx - s * 0.45
    const pts: [number, number][] = []
    for (let k = 0; k <= 8; k++) {
      pts.push([x0 + (k / 8) * s * 0.9, y + Math.sin(k * 0.9 + i) * s * 0.035])
    }
    inkPath(ctx, pts, `${seed}v${i}`, { amp: 0.3, width: 0.8, colour: INK.water, alpha: 0.42 })
  }
}

function ruinMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  const base = cy + s * 0.2
  const cols = [-0.26, -0.06, 0.16]
  cols.forEach((off, i) => {
    const x = cx + off * s
    const h = s * (0.3 - i * 0.05)
    inkPath(ctx, [[x, base], [x, base - h]], `${seed}c${i}`, { amp: 0.5, width: 1.4, colour: INK.ochre, alpha: 0.6 })
  })
  inkPath(ctx, [[cx - s * 0.34, base], [cx + s * 0.3, base]], `${seed}base`, {
    amp: 0.5, width: 1.2, colour: INK.ochre, alpha: 0.55,
  })
}

function settlement(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string, big: boolean) {
  const n = big ? 4 : 2
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * s * 0.28
    const y = cy + (i % 2 === 0 ? 0 : s * 0.08)
    const w = s * 0.11
    const h = s * 0.13
    inkPath(ctx, [[x - w, y + h], [x - w, y - h * 0.2], [x, y - h], [x + w, y - h * 0.2], [x + w, y + h]], `${seed}b${i}`, {
      amp: 0.4, width: 1, alpha: 0.62, close: true,
    })
  }
  if (big) {
    // A tower, so a town reads differently from a village at a glance.
    inkPath(ctx, [[cx + s * 0.4, cy + s * 0.14], [cx + s * 0.4, cy - s * 0.24], [cx + s * 0.5, cy - s * 0.24], [cx + s * 0.5, cy + s * 0.14]],
      `${seed}tw`, { amp: 0.35, width: 1, alpha: 0.6, close: true })
  }
}

function caveMouth(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  const pts: [number, number][] = []
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI + (k / 10) * Math.PI
    pts.push([cx + Math.cos(a) * s * 0.26, cy + s * 0.16 + Math.sin(a) * s * 0.24])
  }
  inkPath(ctx, pts, `${seed}cave`, { amp: 0.5, width: 1.2, alpha: 0.6 })
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.fillStyle = INK.ink
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function wasteStipple(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  const rng = pen(seed)
  ctx.save()
  ctx.fillStyle = INK.inkSoft
  ctx.globalAlpha = 0.34
  for (let i = 0; i < 26; i++) {
    const x = cx + (rng() - 0.5) * s * 1.1
    const y = cy + (rng() - 0.5) * s * 0.7
    ctx.beginPath()
    ctx.arc(x, y, 0.7, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function moorTicks(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  const rng = pen(seed)
  for (let i = 0; i < 7; i++) {
    const x = cx + (rng() - 0.5) * s * 1.05
    const y = cy + (rng() - 0.5) * s * 0.62
    inkPath(ctx, [[x - s * 0.05, y], [x + s * 0.05, y]], `${seed}k${i}`, { amp: 0.3, width: 0.8, alpha: 0.34 })
  }
}

function fieldLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, seed: string) {
  for (let i = 0; i < 3; i++) {
    const y = cy - s * 0.16 + i * s * 0.17
    inkPath(ctx, [[cx - s * 0.42, y], [cx + s * 0.42, y]], `${seed}f${i}`, {
      amp: 0.35, width: 0.7, colour: INK.green, alpha: 0.36,
    })
  }
}

function terrainSymbol(ctx: CanvasRenderingContext2D, t: Terrain, cx: number, cy: number, s: number, seed: string, relief: boolean) {
  switch (t) {
    case 'mountain': return mountains(ctx, cx, cy - s * 0.06, s, seed, relief)
    case 'forest': return trees(ctx, cx, cy - s * 0.04, s, seed)
    case 'marsh': return marshTufts(ctx, cx, cy - s * 0.04, s, seed)
    case 'coast': return waves(ctx, cx, cy - s * 0.04, s, seed)
    case 'ruin': return ruinMark(ctx, cx, cy - s * 0.1, s, seed)
    case 'village': return settlement(ctx, cx, cy - s * 0.06, s, seed, false)
    case 'town': return settlement(ctx, cx, cy - s * 0.06, s, seed, true)
    case 'cavern': return caveMouth(ctx, cx, cy - s * 0.1, s, seed)
    case 'waste': return wasteStipple(ctx, cx, cy - s * 0.04, s, seed)
    case 'moor': return moorTicks(ctx, cx, cy - s * 0.04, s, seed)
    case 'plains': return fieldLines(ctx, cx, cy - s * 0.04, s, seed)
    default: return
  }
}

// ---------------------------------------------------------------- decoration

function compassRose(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = INK.ink
  ctx.fillStyle = INK.ochre
  ctx.lineWidth = 1

  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i - Math.PI / 2
    const tip: [number, number] = [cx + Math.cos(a) * s, cy + Math.sin(a) * s]
    const l: [number, number] = [cx + Math.cos(a + Math.PI / 2) * s * 0.17, cy + Math.sin(a + Math.PI / 2) * s * 0.17]
    const r: [number, number] = [cx + Math.cos(a - Math.PI / 2) * s * 0.17, cy + Math.sin(a - Math.PI / 2) * s * 0.17]
    ctx.beginPath()
    ctx.moveTo(...l); ctx.lineTo(...tip); ctx.lineTo(...r); ctx.closePath()
    ctx.globalAlpha = i === 0 ? 0.6 : 0.32
    ctx.fill()
    ctx.globalAlpha = 0.5
    ctx.stroke()
  }
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i - Math.PI / 4
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.55
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = INK.ink
  ctx.font = `600 ${Math.round(s * 0.34)}px Palatino, Georgia, serif`
  ctx.textAlign = 'center'
  ctx.fillText('N', cx, cy - s * 1.18)
  ctx.restore()
}

function ruledBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const m = 10
  ctx.save()
  ctx.globalAlpha = 0.42
  ctx.strokeStyle = INK.ink
  ctx.lineWidth = 2
  ctx.strokeRect(m, m, w - m * 2, h - m * 2)
  ctx.lineWidth = 0.8
  ctx.strokeRect(m + 5, m + 5, w - (m + 5) * 2, h - (m + 5) * 2)
  // Tick marks along the outer rule, as on a surveyed chart.
  ctx.globalAlpha = 0.3
  const step = 26
  for (let x = m + step; x < w - m; x += step) {
    ctx.beginPath(); ctx.moveTo(x, m); ctx.lineTo(x, m + 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, h - m); ctx.lineTo(x, h - m - 5); ctx.stroke()
  }
  for (let y = m + step; y < h - m; y += step) {
    ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(m + 5, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(w - m, y); ctx.lineTo(w - m - 5, y); ctx.stroke()
  }
  ctx.restore()
}

function marginalia(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // A sea-serpent in the corner, because every good chart has one.
  const x = w - 118
  const y = h - 52
  const body: [number, number][] = []
  for (let k = 0; k <= 22; k++) {
    body.push([x + k * 4.2, y + Math.sin(k * 0.55) * 8])
  }
  inkPath(ctx, body, 'serpent', { amp: 0.5, width: 1.4, colour: INK.ink, alpha: 0.34 })
  inkPath(ctx, [[x + 92, y - 4], [x + 101, y - 11], [x + 96, y - 1]], 'serpenthead', {
    amp: 0.4, width: 1.2, colour: INK.ink, alpha: 0.34, close: true,
  })
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.fillStyle = INK.ink
  ctx.font = 'italic 11px Palatino, Georgia, serif'
  ctx.textAlign = 'right'
  ctx.fillText('hic sunt dracones', w - 22, h - 22)
  ctx.restore()
}

function scaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = INK.ink
  ctx.fillStyle = INK.ink
  ctx.lineWidth = 1
  const seg = size * 0.5
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = i % 2 === 0 ? 0.5 : 0.14
    ctx.fillRect(x + i * seg, y, seg, 5)
  }
  ctx.globalAlpha = 0.5
  ctx.strokeRect(x, y, seg * 4, 5)
  ctx.font = '10px ui-monospace, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('0', x - 2, y + 17)
  ctx.fillText('4 leagues', x + seg * 4 - 8, y + 17)
  ctx.restore()
}

// -------------------------------------------------------------- the world map

export interface ChartOpts {
  regions: RegionDef[]
  states: Record<string, RegionState>
  selected: string | null
  cartography: number
  width: number
  height: number
}

export function drawChart(ctx: CanvasRenderingContext2D, o: ChartOpts): HexCenter[] {
  const { width: w, height: h } = o
  const detail = chartDetail(o.cartography)

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(paper(w, h), 0, 0)

  /**
   * The sheet fits what has actually been drawn, plus one ring of room to grow
   * — not the maximum extent of the world. Sizing for all ninety-one hexes
   * would make the opening cantref a postage stamp adrift in blank vellum.
   *
   * The side effect is the good kind: as you survey outward the view draws back,
   * so the world visibly widens. That is a progression signal you watch rather
   * than read.
   */
  const drawn = o.regions.filter((r) => o.states[r.id]?.discovered)
  const inView = new Set<string>()
  const pts: { q: number; r: number }[] = []
  for (const region of drawn.length ? drawn : o.regions.slice(0, 1)) {
    const { q, r } = region.coord
    for (const [dq, dr] of [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]] as const) {
      const key = `${q + dq},${r + dr}`
      if (inView.has(key)) continue
      inView.add(key)
      pts.push({ q: q + dq, r: r + dr })
    }
  }

  // Extents in unit space, where one hex has radius 1.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    const ux = 1.5 * p.q
    const uy = Math.sqrt(3) * (p.r + p.q / 2)
    minX = Math.min(minX, ux - 1); maxX = Math.max(maxX, ux + 1)
    minY = Math.min(minY, uy - 0.9); maxY = Math.max(maxY, uy + 0.9)
  }

  const margin = 46
  const size = Math.max(14, Math.min(86, (w - margin * 2) / (maxX - minX), (h - margin * 2) / (maxY - minY)))
  // Centre the drawn extent rather than the world origin, so the sheet stays
  // balanced as exploration pushes off in one direction.
  const ox = w / 2 - ((minX + maxX) / 2) * size
  const oy = h / 2 - ((minY + maxY) / 2) * size
  const centers: HexCenter[] = []

  const pos = (q: number, r: number): [number, number] => [
    ox + size * 1.5 * q,
    oy + size * Math.sqrt(3) * (r + q / 2),
  ]

  if (detail.border) ruledBorder(ctx, w, h)

  // Roads first, so they run under the settlements they connect.
  if (detail.roads) {
    const held = o.regions.filter((r) => o.states[r.id]?.held)
    for (const a of held) {
      for (const b of o.regions) {
        if (a.id === b.id) continue
        if (!o.states[b.id]?.discovered) continue
        const d = (Math.abs(a.coord.q - b.coord.q) + Math.abs(a.coord.r - b.coord.r) + Math.abs(a.coord.q + a.coord.r - b.coord.q - b.coord.r)) / 2
        if (d !== 1) continue
        const [ax, ay] = pos(a.coord.q, a.coord.r)
        const [bx, by] = pos(b.coord.q, b.coord.r)
        inkPath(ctx, [[ax, ay], [(ax + bx) / 2, (ay + by) / 2], [bx, by]], `road${a.id}${b.id}`, {
          amp: 1.6, width: 1.2, colour: INK.ochre, alpha: 0.3,
        })
      }
    }
  }

  for (const region of o.regions) {
    const rs = o.states[region.id]
    const [cx, cy] = pos(region.coord.q, region.coord.r)
    centers.push({ id: region.id, x: cx, y: cy, size })

    // Unsurveyed ground is blank vellum. Not fog, not a placeholder — the
    // cartographer simply has not been there, so there is nothing on the sheet.
    if (!rs?.discovered) continue

    const sure = rs.surveyed
    const sel = region.id === o.selected

    const foreign = region.kind === 'foreign'
    const lineColour = sel ? INK.ochre : foreign ? INK.foreign : INK.ink

    // The outline: hesitant and broken when barely surveyed, confident when done.
    const pts = hexPoints(cx, cy, size * 0.92)
    ctx.save()
    if (sure < 0.6) ctx.setLineDash([5, 4])
    inkPath(ctx, [...pts, pts[0]!], `hex${region.id}`, {
      amp: 2.4 - sure * 1.6,
      width: sel ? 2.1 : foreign ? 1.6 : 1.1,
      alpha: 0.28 + sure * 0.42,
      colour: lineColour,
    })
    // Another people's ground is ruled twice, in the second ink.
    if (foreign && sure >= 0.5) {
      const inner = hexPoints(cx, cy, size * 0.82)
      inkPath(ctx, [...inner, inner[0]!], `hexin${region.id}`, {
        amp: 1.2, width: 0.8, alpha: 0.3, colour: INK.foreign,
      })
    }
    ctx.restore()

    if (o.states[region.id]?.held) {
      // A held hex gets a light ochre wash — this land is yours.
      ctx.save()
      hexPath(ctx, cx, cy, size * 0.9)
      ctx.globalAlpha = 0.1
      ctx.fillStyle = INK.gold
      ctx.fill()
      ctx.restore()
    }

    if (detail.symbols && sure >= 0.5) {
      terrainSymbol(ctx, region.terrain, cx, cy, size, region.id, detail.relief)
    }

    if (detail.relief && sure >= 0.85) {
      // Site marks: a small cross per site, the surveyor's note that there is
      // something here worth walking to.
      region.sites.forEach((s, i) => {
        const a = -Math.PI / 2 + (i / Math.max(1, region.sites.length)) * Math.PI * 2
        const sx = cx + Math.cos(a) * size * 0.56
        const sy = cy + Math.sin(a) * size * 0.56
        inkPath(ctx, [[sx - 2.5, sy], [sx + 2.5, sy]], `sx${s.id}`, { amp: 0.3, width: 1, colour: INK.ochre, alpha: 0.55 })
        inkPath(ctx, [[sx, sy - 2.5], [sx, sy + 2.5]], `sy${s.id}`, { amp: 0.3, width: 1, colour: INK.ochre, alpha: 0.55 })
      })
    }

    // Labels. A place name is written to fit inside its own hex — a long name
    // spilling across the neighbouring ground would be illegible and is not
    // something a careful hand would do.
    ctx.save()
    ctx.textAlign = 'center'
    const label = sure < 0.35 ? '?' : region.name
    const style = `${sure < 0.6 ? 'italic ' : ''}600`
    const maxWidth = size * 1.55
    let nameSize = Math.max(8, Math.round(size * 0.26))
    ctx.font = `${style} ${nameSize}px Palatino, "Palatino Linotype", Georgia, serif`
    while (nameSize > 8 && ctx.measureText(label).width > maxWidth) {
      nameSize -= 1
      ctx.font = `${style} ${nameSize}px Palatino, "Palatino Linotype", Georgia, serif`
    }
    ctx.fillStyle = sel ? INK.ochre : foreign ? INK.foreign : INK.ink
    ctx.globalAlpha = 0.4 + sure * 0.5
    ctx.fillText(label, cx, cy + size * 0.62)

    // A banner marks a hold that is not yours, so the eye finds the settled
    // ground among the wilds without reading a single name.
    if (foreign && sure >= 0.5) {
      const bx = cx
      const by = cy - size * 0.52
      inkPath(ctx, [[bx, by + size * 0.16], [bx, by - size * 0.16]], `fl${region.id}`, {
        amp: 0.4, width: 1.2, colour: INK.foreign, alpha: 0.6,
      })
      inkPath(
        ctx,
        [[bx, by - size * 0.16], [bx + size * 0.19, by - size * 0.09], [bx, by - size * 0.02]],
        `fg${region.id}`,
        { amp: 0.4, width: 1, colour: INK.foreign, alpha: 0.55, close: true },
      )
    }

    if (sure >= 0.6 && region.danger >= 6) {
      ctx.fillStyle = INK.ochre
      ctx.globalAlpha = 0.55
      ctx.font = `italic ${Math.max(7, Math.round(size * 0.19))}px Palatino, Georgia, serif`
      ctx.fillText('perilous', cx, cy + size * 0.84)
    }
    ctx.restore()
  }

  if (detail.compass) compassRose(ctx, w - 62, 66, 24)
  if (detail.compass) scaleBar(ctx, 26, h - 34, 22)
  if (detail.border) marginalia(ctx, w, h)

  // The cartouche: whose chart this is. Always present — it is the title of the
  // object, and the object is the point.
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.fillStyle = INK.ink
  ctx.textAlign = 'left'
  ctx.font = 'italic 13px Palatino, Georgia, serif'
  ctx.fillText('A Chart of the Ashcombe Cantref', 26, 34)
  ctx.globalAlpha = 0.36
  ctx.font = '10px ui-monospace, monospace'
  ctx.fillText(`DRAWN BY HAND · CARTOGRAPHY ${o.cartography}`, 26, 50)
  ctx.restore()

  return centers
}

// ------------------------------------------------------------- the locale map

export interface LocaleOpts {
  region: RegionDef
  surveyed: number
  cartography: number
  selectedSite: string | null
  width: number
  height: number
}

export interface SiteMark { id: string; x: number; y: number; r: number }

/**
 * The inset: a plan of one region, drawn on the same vellum, with its sites
 * placed where they actually are rather than listed. This is the granular half
 * of the map — the hex tells you where in the world you are, the inset tells you
 * where in the valley.
 */
export function drawLocale(ctx: CanvasRenderingContext2D, o: LocaleOpts): SiteMark[] {
  const { width: w, height: h, region } = o
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(paper(w, h), 0, 0)

  const pad = 22
  const iw = w - pad * 2
  const ih = h - pad * 2
  const rng = pen(`locale${region.id}`)

  // An irregular boundary for the region, so it reads as ground rather than a box.
  const bound: [number, number][] = []
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2
    const rx = iw / 2 * (0.86 + rng() * 0.14)
    const ry = ih / 2 * (0.84 + rng() * 0.16)
    bound.push([pad + iw / 2 + Math.cos(a) * rx, pad + ih / 2 + Math.sin(a) * ry])
  }
  ctx.save()
  ctx.beginPath()
  bound.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
  ctx.globalAlpha = 0.07
  ctx.fillStyle = region.terrain === 'forest' ? INK.green : region.terrain === 'coast' || region.terrain === 'marsh' ? INK.water : INK.inkSoft
  ctx.fill()
  ctx.restore()
  inkPath(ctx, [...bound, bound[0]!], `bound${region.id}`, { amp: 1.6, width: 1.2, alpha: 0.4 })

  // Scattered terrain texture inside the boundary, at low density, so the plan
  // has ground under the site marks rather than empty paper.
  const detail = chartDetail(o.cartography)
  if (detail.symbols) {
    for (let i = 0; i < 7; i++) {
      const x = pad + iw * (0.16 + rng() * 0.68)
      const y = pad + ih * (0.16 + rng() * 0.68)
      terrainSymbol(ctx, region.terrain, x, y, Math.min(iw, ih) * 0.15, `${region.id}t${i}`, false)
    }
  }

  const marks: SiteMark[] = []
  const markR = Math.max(13, Math.min(iw, ih) * 0.055)

  for (const s of region.sites) {
    const x = pad + iw * s.pos.x
    const y = pad + ih * s.pos.y
    marks.push({ id: s.id, x, y, r: markR * 1.7 })
    const sel = s.id === o.selectedSite

    ctx.save()
    ctx.globalAlpha = sel ? 0.16 : 0.09
    ctx.fillStyle = sel ? INK.ochre : INK.ink
    ctx.beginPath()
    ctx.arc(x, y, markR * 1.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    siteGlyph(ctx, s, x, y, markR, sel)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = sel ? INK.ochre : INK.ink
    ctx.globalAlpha = 0.78
    ctx.font = `600 ${Math.max(10, Math.round(markR * 0.82))}px Palatino, Georgia, serif`
    ctx.fillText(s.name, x, y + markR * 1.95)
    ctx.globalAlpha = 0.45
    ctx.font = `${Math.max(8, Math.round(markR * 0.6))}px ui-monospace, monospace`
    ctx.fillText(`${s.layers.length} ${s.layers.length === 1 ? 'level' : 'levels'}`, x, y + markR * 2.72)
    ctx.restore()
  }

  // Paths between sites, drawn as the tracks someone actually wore between them.
  if (detail.roads && region.sites.length > 1) {
    for (let i = 0; i < region.sites.length - 1; i++) {
      const a = marks[i]!
      const b = marks[i + 1]!
      inkPath(ctx, [[a.x, a.y], [(a.x + b.x) / 2 + 10, (a.y + b.y) / 2 - 8], [b.x, b.y]], `path${region.id}${i}`, {
        amp: 1.4, width: 0.9, colour: INK.ochre, alpha: 0.22,
      })
    }
  }

  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.fillStyle = INK.ink
  ctx.textAlign = 'left'
  ctx.font = 'italic 12px Palatino, Georgia, serif'
  ctx.fillText(region.name, pad, 20)
  ctx.globalAlpha = 0.34
  ctx.font = '9px ui-monospace, monospace'
  ctx.fillText(`${region.terrain.toUpperCase()} · SURVEYED ${Math.round(o.surveyed * 100)}%`, pad, 33)
  ctx.restore()

  return marks
}

function siteGlyph(ctx: CanvasRenderingContext2D, s: SiteDef, x: number, y: number, r: number, sel: boolean) {
  const colour = sel ? INK.ochre : INK.ink
  const seed = `sg${s.id}`
  const opts = { amp: 0.5, width: 1.3, colour, alpha: 0.72 }

  switch (s.icon) {
    case 'mine':
      // Crossed tools.
      inkPath(ctx, [[x - r * 0.5, y + r * 0.5], [x + r * 0.5, y - r * 0.5]], `${seed}a`, opts)
      inkPath(ctx, [[x - r * 0.5, y - r * 0.5], [x + r * 0.5, y + r * 0.5]], `${seed}b`, opts)
      break
    case 'tree':
      trees(ctx, x, y, r * 2.2, seed)
      break
    case 'water':
      waves(ctx, x, y, r * 1.5, seed)
      break
    case 'ruin':
    case 'barrow':
      ruinMark(ctx, x, y, r * 1.5, seed)
      break
    case 'cave':
      caveMouth(ctx, x, y, r * 1.6, seed)
      break
    case 'market':
    case 'town':
      settlement(ctx, x, y, r * 1.6, seed, true)
      break
    case 'village':
      settlement(ctx, x, y, r * 1.6, seed, false)
      break
    case 'field':
      fieldLines(ctx, x, y, r * 1.8, seed)
      break
    case 'camp':
      // A tent.
      inkPath(ctx, [[x - r * 0.55, y + r * 0.4], [x, y - r * 0.5], [x + r * 0.55, y + r * 0.4]], `${seed}c`, { ...opts, close: true })
      break
    case 'shrine':
      inkPath(ctx, [[x, y - r * 0.55], [x, y + r * 0.5]], `${seed}s1`, opts)
      inkPath(ctx, [[x - r * 0.35, y - r * 0.15], [x + r * 0.35, y - r * 0.15]], `${seed}s2`, opts)
      break
    default:
      inkPath(ctx, [[x - r * 0.4, y], [x + r * 0.4, y]], `${seed}d`, opts)
  }
}
