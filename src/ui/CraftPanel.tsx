import { useMemo, useState } from 'react'
import { useGame } from '@/state/store'
import { allRecipes } from '@/content/recipes'
import { itemById } from '@/content/items'
import { SKILLS, SKILL_BY_ID } from '@/content/skills'
import { effectiveLevel } from '@/engine/skills'
import { countItem, hasInputs } from '@/engine/inventory'
import { QUALITY_ORDER, QUALITIES, rollQuality } from '@/engine/curves'

/**
 * Crafting. The quality forecast is the interesting piece of information design:
 * ballot VII-B only pays off if the player can *see* that pushing Smithing past
 * a recipe's requirement is what turns Steel into Masterwork Steel, so the odds
 * are shown rather than discovered.
 */

const PRODUCTION_SKILLS = SKILLS.filter((s) => s.kind === 'production').map((s) => s.id)

function qualityOdds(skillLevel: number, recipeLevel: number): { id: string; pct: number }[] {
  // Sample the same function the engine uses, rather than restating the maths.
  const counts: Record<string, number> = {}
  const N = 2000
  for (let i = 0; i < N; i++) {
    const q = rollQuality(skillLevel, recipeLevel, i / N)
    counts[q] = (counts[q] ?? 0) + 1
  }
  return QUALITY_ORDER
    .map((q) => ({ id: q, pct: ((counts[q] ?? 0) / N) * 100 }))
    .filter((q) => q.pct >= 0.5)
}

export function CraftPanel() {
  const state = useGame((s) => s.state)
  const revision = useGame((s) => s.revision)
  const setFocus = useGame((s) => s.setFocus)
  const [skill, setSkill] = useState('smithing')
  const [onlyMakeable, setOnlyMakeable] = useState(true)

  const recipes = useMemo(() => {
    if (!state) return []
    const lvl = effectiveLevel(state, skill)
    return allRecipes()
      .filter((r) => r.skill === skill)
      .filter((r) => r.levelReq <= lvl + 15)
      .filter((r) => (onlyMakeable ? hasInputs(state, r.inputs) && r.levelReq <= lvl : true))
      .sort((a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name))
      .slice(0, 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, skill, onlyMakeable, revision])

  if (!state) return null
  const lvl = effectiveLevel(state, skill)

  return (
    <div>
      <h1 className="page">Workshop</h1>
      <p className="page-sub">
        Tier decides what you may make; quality decides how well. Push a skill past a recipe's
        requirement and the odds shift up the ladder — which is why a Masterwork Steel blade
        stays worth forging long after you have found mithral.
      </p>

      <div className="card">
        <header>
          <div className="chips">
            {PRODUCTION_SKILLS.map((s) => (
              <button key={s} className={`chip ${skill === s ? 'on' : ''}`} onClick={() => setSkill(s)}>
                {SKILL_BY_ID[s]?.name} {effectiveLevel(state, s)}
              </button>
            ))}
          </div>
          <button className={`btn tiny ${onlyMakeable ? 'primary' : ''}`} onClick={() => setOnlyMakeable((v) => !v)}>
            {onlyMakeable ? 'Makeable only' : 'Showing all'}
          </button>
        </header>
        <div className="inner">
          {recipes.length === 0 ? (
            <p className="empty">Nothing you can make here yet. Gather the inputs, or raise {SKILL_BY_ID[skill]?.name}.</p>
          ) : (
            <div className="grid g2">
              {recipes.map((r) => {
                const canMake = hasInputs(state, r.inputs) && r.levelReq <= lvl
                const active = state.focus.kind === 'recipe' && state.focus.recipe === r.id
                const out = itemById(r.output.item)
                const odds = out && !out.stack ? qualityOdds(lvl, r.levelReq) : []
                return (
                  <div key={r.id} className="card" style={{ background: 'var(--panel-2)' }}>
                    <div className="inner">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                        <b style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem' }}>{r.name}</b>
                        <span className="eyebrow">lv {r.levelReq}</span>
                      </div>

                      <div style={{ margin: '0.45rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {r.inputs.map((i) => {
                          const have = countItem(state, i.item)
                          return (
                            <span
                              key={i.item}
                              className="chip"
                              style={{ cursor: 'default', color: have >= i.qty ? 'var(--text-2)' : 'var(--danger)' }}
                            >
                              {itemById(i.item)?.name ?? i.item} {have}/{i.qty}
                            </span>
                          )
                        })}
                      </div>

                      {odds.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                          {odds.map((o) => (
                            <span key={o.id} className={`q-${o.id}`} style={{ fontFamily: 'var(--mono)', fontSize: '0.6875rem' }}>
                              {QUALITIES[o.id as keyof typeof QUALITIES].name} {o.pct.toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        className={`btn ${active ? '' : 'primary'}`}
                        disabled={!canMake}
                        onClick={() => setFocus({ kind: 'recipe', recipe: r.id, progress: 0 })}
                      >
                        {r.levelReq > lvl ? `Needs level ${r.levelReq}` : !canMake ? 'Missing inputs' : active ? 'Working' : 'Set as focus'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
