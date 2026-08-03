import { useEffect, useState } from 'react'
import { useGame } from '@/state/store'
import { derivedStats } from '@/engine/combat'
import { formatDuration } from '@/engine/offline'
import { itemById } from '@/content/items'
import { SKILL_BY_ID } from '@/content/skills'
import { MapView } from '@/ui/MapView'
import { SkillsPanel } from '@/ui/SkillsPanel'
import { InventoryPanel } from '@/ui/InventoryPanel'
import { CraftPanel } from '@/ui/CraftPanel'
import { RunesPanel } from '@/ui/RunesPanel'
import { CombatPanel } from '@/ui/CombatPanel'
import { RealmPanel } from '@/ui/RealmPanel'
import { ActivityRail } from '@/ui/ActivityRail'

type Tab = 'map' | 'skills' | 'pack' | 'craft' | 'runes' | 'gambits' | 'realm'

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'map', label: 'Cantref', ico: '⬡' },
  { id: 'skills', label: 'Skills', ico: '◈' },
  { id: 'pack', label: 'Pack', ico: '▤' },
  { id: 'craft', label: 'Workshop', ico: '⚒' },
  { id: 'runes', label: 'Runic Arts', ico: '✦' },
  { id: 'gambits', label: 'Gambits', ico: '⚔' },
  { id: 'realm', label: 'Holding', ico: '⌂' },
]

function OfflineReport() {
  const offline = useGame((s) => s.offline)
  const dismiss = useGame((s) => s.dismissOffline)
  if (!offline) return null

  const gained = Object.entries(offline.report.gained).sort((a, b) => b[1] - a[1]).slice(0, 12)
  const xp = Object.entries(offline.report.xp).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="scrim" onClick={dismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="inner" style={{ padding: '1.25rem' }}>
          <p className="eyebrow">While you were away</p>
          <h2>{formatDuration(offline.credited)} of work</h2>
          <p style={{ color: 'var(--text-2)', margin: '0 0 1rem' }}>
            {offline.cappedBy > 0
              ? `You were gone ${formatDuration(offline.away)}; ${formatDuration(offline.credited)} was credited before the cap. Raise it through the holding.`
              : 'Everything that would have happened, happened.'}
          </p>

          {gained.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginBottom: '0.35rem' }}>Gained</p>
              <div className="grid g2" style={{ marginBottom: '1rem' }}>
                {gained.map(([id, qty]) => (
                  <div key={id} className="item">
                    <div className="nm">{itemById(id)?.name ?? id}</div>
                    <div className="qty">+{Math.round(qty).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {xp.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginBottom: '0.35rem' }}>Experience</p>
              <div className="grid g2" style={{ marginBottom: '1rem' }}>
                {xp.map(([id, amount]) => (
                  <div key={id} className="item">
                    <div className="nm">{SKILL_BY_ID[id]?.name ?? id}</div>
                    <div className="qty">+{Math.round(amount).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {gained.length === 0 && xp.length === 0 && (
            <p className="empty">Nothing was assigned, so nothing happened. Set a focus before you go.</p>
          )}

          <button className="btn primary" onClick={dismiss}>Continue</button>
        </div>
      </div>
    </div>
  )
}

function TopBar() {
  const state = useGame((s) => s.state)
  const running = useGame((s) => s.running)
  const setRunning = useGame((s) => s.setRunning)
  useGame((s) => s.revision)
  if (!state) return null

  const s = derivedStats(state)
  const c = state.character
  const meter = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`

  return (
    <header className="topbar">
      <div className="brand">Ash<span>combe</span></div>

      <div className="who">
        <b>{c.name}</b>
        <small>gen {state.legacy.generation} · age {Math.floor(c.age)}</small>
      </div>

      <div className="vitals">
        <div className="vital">
          <div className="lbl"><span>Health</span><b>{Math.round(c.health)}/{s.maxHealth}</b></div>
          <div className="meter hp"><i style={{ width: meter(c.health, s.maxHealth) }} /></div>
        </div>
        <div className="vital">
          <div className="lbl"><span>Stamina</span><b>{Math.round(c.stamina)}/{s.maxStamina}</b></div>
          <div className="meter sp"><i style={{ width: meter(c.stamina, s.maxStamina) }} /></div>
        </div>
        <div className="vital">
          <div className="lbl"><span>Mana</span><b>{Math.round(c.mana)}/{s.maxMana}</b></div>
          <div className="meter mp"><i style={{ width: meter(c.mana, s.maxMana) }} /></div>
        </div>
      </div>

      <div className="purse">
        <div className="coin"><span>Coin</span><b>{Math.floor(state.coin).toLocaleString()}</b></div>
        <div className="insight"><span>Insight</span><b>{Math.floor(state.insight).toLocaleString()}</b></div>
      </div>

      <button className="btn tiny" onClick={() => setRunning(!running)} title="Pause the simulation">
        {running ? '❙❙' : '▶'}
      </button>
    </header>
  )
}

export default function App() {
  const boot = useGame((s) => s.boot)
  const ready = useGame((s) => s.ready)
  const error = useGame((s) => s.error)
  const [tab, setTab] = useState<Tab>('map')

  useEffect(() => { void boot() }, [boot])

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', color: 'var(--text)' }}>Ashcombe</div>
          <p className="eyebrow">waking the holding</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <nav className="side">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <span className="ico">{t.ico}</span>
              <span className="txt">{t.label}</span>
            </button>
          ))}
        </nav>

        <main className="stage">
          {error && (
            <div className="card" style={{ marginBottom: '0.85rem', borderColor: 'var(--danger)' }}>
              <div className="inner" style={{ color: 'var(--danger)' }}>{error}</div>
            </div>
          )}
          {tab === 'map' && <MapView />}
          {tab === 'skills' && <SkillsPanel />}
          {tab === 'pack' && <InventoryPanel />}
          {tab === 'craft' && <CraftPanel />}
          {tab === 'runes' && <RunesPanel />}
          {tab === 'gambits' && <CombatPanel />}
          {tab === 'realm' && <RealmPanel />}
        </main>

        <aside className="rail"><ActivityRail /></aside>
      </div>
      <OfflineReport />
    </div>
  )
}
