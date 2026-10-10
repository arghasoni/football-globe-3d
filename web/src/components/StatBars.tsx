import type { MatchSide } from '../../../shared/types'
import type { StatRow } from '../lib/stats'
import { Crest } from './MatchList'

interface Props {
  rows: StatRow[]
  home: MatchSide
  away: MatchSide
  colors: { home: string; away: string }
}

export default function StatBars({ rows, home, away, colors }: Props) {
  return (
    <div className="stats">
      <div className="stats__teams">
        <span>
          <Crest src={home.logo} /> {home.abbreviation}
        </span>
        <span>
          {away.abbreviation} <Crest src={away.logo} />
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="stat">
          <div className="stat__nums">
            <span className={r.leader === 'home' ? 'is-lead' : ''}>{r.home}</span>
            <span className="stat__label">{r.label}</span>
            <span className={r.leader === 'away' ? 'is-lead' : ''}>{r.away}</span>
          </div>
          <div className="stat__bar" role="presentation">
            <i
              className={r.leader === 'away' ? 'is-trail' : ''}
              style={{ flexGrow: r.homeShare, background: colors.home }}
            />
            <i
              className={r.leader === 'home' ? 'is-trail' : ''}
              style={{ flexGrow: 1 - r.homeShare, background: colors.away }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
