import { useMemo, type CSSProperties } from 'react'
import type { Lineup, LineupPlayer, MatchDetail, MatchSide, Side } from '../../../shared/types'
import { benchOrder, pitchRows, playerMarks, shortName, type PlayerMarks } from '../lib/lineup'
import { inkOn } from '../lib/stats'
import Ball from './Ball'
import { Crest } from './MatchList'

/** Pitch markings, drawn on a 68 × 105 m pitch. */
function PitchLines() {
  return (
    <svg className="pitch__lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="0.35">
        <rect x="0.6" y="0.6" width="66.8" height="103.8" />
        <line x1="0.6" y1="52.5" x2="67.4" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <rect x="13.84" y="0.6" width="40.32" height="16.5" />
        <rect x="24.84" y="0.6" width="18.32" height="5.5" />
        <rect x="13.84" y="87.9" width="40.32" height="16.5" />
        <rect x="24.84" y="98.9" width="18.32" height="5.5" />
        <path d="M26.7 17.1a9.15 9.15 0 0 0 14.6 0M26.7 87.9a9.15 9.15 0 0 1 14.6 0" />
      </g>
      <g fill="currentColor">
        <circle cx="34" cy="52.5" r="0.5" />
        <circle cx="34" cy="11.6" r="0.4" />
        <circle cx="34" cy="93.4" r="0.4" />
      </g>
    </svg>
  )
}

function Badges({ m }: { m?: PlayerMarks }) {
  if (!m) return null
  return (
    <>
      {m.goals > 0 && (
        <span className="pl__goals" title={`${m.goals} goal${m.goals > 1 ? 's' : ''}`}>
          <Ball size={11} />
          {m.goals > 1 && <b>{m.goals}</b>}
        </span>
      )}
      {m.card && <span className={`pl__card pl__card--${m.card}`} aria-label={`${m.card} card`} />}
      {m.subOff && (
        <span className="pl__off" title={`Substituted ${m.subOff}`}>
          {m.subOff}
        </span>
      )}
    </>
  )
}

/** One team's starters on its half: home attacks up from the bottom, away down from the top. */
function Half({ side, lineup, color, marks }: { side: Side; lineup: Lineup; color: string; marks: Map<string, PlayerMarks> }) {
  const rows = pitchRows(lineup)
  const [keeperY, frontY] = side === 'home' ? [93, 57] : [7, 43]
  const shirt = { background: color, color: inkOn(color) } as CSSProperties
  return (
    <>
      {rows.map((row, r) =>
        row.map((p, i) => {
          const across = ((i + 1) / (row.length + 1)) * 100
          const x = side === 'home' ? across : 100 - across
          const y = rows.length > 1 ? keeperY + ((frontY - keeperY) * r) / (rows.length - 1) : keeperY
          return (
            <div key={`${p.name}-${p.number}`} className="pl" style={{ left: `${x}%`, top: `${y}%` }} title={p.name}>
              <span className="pl__shirt" style={shirt}>
                {p.number ?? ''}
                <Badges m={marks.get(p.name)} />
              </span>
              <span className="pl__name">{shortName(p.name)}</span>
            </div>
          )
        }),
      )}
    </>
  )
}

function Bench({ team, players, marks }: { team: MatchSide; players: LineupPlayer[]; marks: Map<string, PlayerMarks> }) {
  return (
    <div className="bench__team">
      <h5>
        <Crest src={team.logo} /> {team.shortName}
      </h5>
      <ul>
        {benchOrder(players, marks).map((p) => {
          const m = marks.get(p.name)
          return (
            <li key={`${p.name}-${p.number}`} className={m?.subOn ? 'is-used' : ''}>
              <span className="bench__num">{p.number}</span>
              <span className="bench__name">{p.name}</span>
              {m?.goals ? <Ball size={11} /> : null}
              {m?.card && <span className={`pl__card pl__card--${m.card} bench__card`} />}
              {m?.subOn && <span className="bench__on">{m.subOn}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Lineups({ d, colors }: { d: MatchDetail; colors: Record<Side, string> }) {
  const marks = useMemo(() => playerMarks(d.events), [d.events])
  const sides = (['away', 'home'] as Side[]).filter((s) => d.lineups[s]?.players.some((p) => p.starter))

  return (
    <div className="lineups">
      <div className="pitch">
        <PitchLines />
        {sides.map((s) => (
          <div key={s} className={`pitch__team pitch__team--${s}`}>
            <Crest src={d[s].logo} />
            <span>{d[s].shortName}</span>
            {d.lineups[s]!.formation && <b>{d.lineups[s]!.formation}</b>}
          </div>
        ))}
        {sides.map((s) => (
          <Half key={s} side={s} lineup={d.lineups[s]!} color={colors[s]} marks={marks} />
        ))}
      </div>

      <h4 className="match-section__title">Substitutes</h4>
      <div className="bench">
        {(['home', 'away'] as Side[]).map((s) =>
          d.lineups[s] ? (
            <Bench key={s} team={d[s]} players={d.lineups[s]!.players.filter((p) => !p.starter)} marks={marks} />
          ) : null,
        )}
      </div>
    </div>
  )
}
