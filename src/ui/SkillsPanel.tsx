import { useGame } from '@/state/store'
import { SKILLS, childrenOf } from '@/content/skills'
import { effectiveLevel, isCapped, levelOf } from '@/engine/skills'
import { xpProgress, CHILD_LEVEL_LEAD } from '@/engine/curves'
import type { GameState, SkillDef } from '@/engine/types'

/**
 * Ballot VI-B rendered: 40 tracks presented as 25 cards, children nested under
 * their parent. The capped tag is the important piece of information design here
 * — it tells the player *why* a skill has stopped paying out, and the answer is
 * always "go widen the parent", which is the behaviour the system wants.
 */

function Row({ state, skill, child }: { state: GameState; skill: SkillDef; child?: boolean }) {
  const raw = levelOf(state, skill.id)
  const eff = effectiveLevel(state, skill.id)
  const capped = isCapped(state, skill.id)
  const p = xpProgress(state.skills[skill.id]?.xp ?? 0)

  return (
    <div className={`skill-row ${child ? 'child' : ''}`}>
      <div style={{ minWidth: 0 }}>
        <div className="nm">
          {skill.name}
          {capped && <span className="tag" title={`Capped at parent + ${CHILD_LEVEL_LEAD}. Raise the parent to unlock.`}>capped</span>}
        </div>
        <div className="xpbar"><i style={{ width: `${Math.round(p.pct * 100)}%` }} /></div>
      </div>
      <div className={`lv ${capped ? 'capped' : ''}`} title={capped ? `${raw} banked, ${eff} effective` : undefined}>
        {capped ? eff : raw}
      </div>
    </div>
  )
}

export function SkillsPanel() {
  const state = useGame((s) => s.state)
  useGame((s) => s.revision)
  if (!state) return null

  const parents = SKILLS.filter((s) => s.kind === 'combat-parent')
  const groups: { title: string; skills: SkillDef[] }[] = [
    { title: 'Defence', skills: SKILLS.filter((s) => s.kind === 'defence') },
    { title: 'Gathering', skills: SKILLS.filter((s) => s.kind === 'gathering') },
    { title: 'Production', skills: SKILLS.filter((s) => s.kind === 'production') },
    { title: 'Civil', skills: SKILLS.filter((s) => s.kind === 'civil' && !s.hidden) },
  ]

  return (
    <div>
      <h1 className="page">Skills</h1>
      <p className="page-sub">
        A combat child earns its own experience in full and hands its parent a further 30% on
        top — created, never divided, so trying a second weapon costs you nothing. A child may
        not outrun its parent by more than {CHILD_LEVEL_LEAD} levels; when it does, the extra
        banks and the effective level holds until you widen.
      </p>

      <div className="grid g2">
        {parents.map((parent) => (
          <div key={parent.id} className="card">
            <header>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>{parent.name}</div>
              <span className="eyebrow">parent</span>
            </header>
            <div>
              <Row state={state} skill={parent} />
              {childrenOf(parent.id).map((c) => <Row key={c.id} state={state} skill={c} child />)}
            </div>
          </div>
        ))}

        {groups.map((g) => (
          <div key={g.title} className="card">
            <header>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 600 }}>{g.title}</div>
              <span className="eyebrow">{g.skills.length}</span>
            </header>
            <div>{g.skills.map((s) => <Row key={s.id} state={state} skill={s} />)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
