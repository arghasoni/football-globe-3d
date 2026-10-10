import type { StandingsGroup } from '../../../shared/types'
import { Crest } from './MatchList'

interface Props {
  groups: StandingsGroup[]
  titled: boolean
  /** Team id → which side of this match it is. */
  highlight: Map<string, 'home' | 'away'>
}

const gd = (n: number) => (n > 0 ? `+${n}` : String(n))

export default function LeagueTable({ groups, titled, highlight }: Props) {
  return (
    <div className="tables">
      {groups.map((g) => (
        <section key={g.name} className="table-group">
          {titled && <h4 className="match-section__title">{g.name}</h4>}
          <table className="table">
            <thead>
              <tr>
                <th className="table__rank">#</th>
                <th className="table__team">Team</th>
                <th>P</th>
                <th className="table__wdl">W</th>
                <th className="table__wdl">D</th>
                <th className="table__wdl">L</th>
                <th>GD</th>
                <th className="table__pts">Pts</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => {
                const side = highlight.get(r.team.id)
                return (
                  <tr key={r.team.id} className={side ? `is-${side}` : ''}>
                    <td className="table__rank">{r.rank}</td>
                    <td className="table__team">
                      <span>
                        <Crest src={r.team.logo} />
                        <span className="table__name">{r.team.shortName}</span>
                      </span>
                    </td>
                    <td>{r.played}</td>
                    <td className="table__wdl">{r.won}</td>
                    <td className="table__wdl">{r.drawn}</td>
                    <td className="table__wdl">{r.lost}</td>
                    <td>{gd(r.goalsFor - r.goalsAgainst)}</td>
                    <td className="table__pts">{r.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
