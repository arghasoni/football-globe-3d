import type { MatchSummary } from '../../../shared/types'
import { groupMatches, kickoffTime, type DayGroup } from '../lib/format'
import { matchHref } from '../lib/route'

export function Crest({ src, size }: { src?: string; size?: 'lg' }) {
  const cls = `crest${size ? ` crest--${size}` : ''}`
  return src ? <img className={cls} src={src} alt="" loading="lazy" /> : <span className={`${cls} crest--blank`} />
}

function StatusCell({ m }: { m: MatchSummary }) {
  switch (m.status) {
    case 'live':
      return <span className="status status--live">{m.clock ?? 'LIVE'}</span>
    case 'halftime':
      return <span className="status status--live">HT</span>
    case 'finished':
      return <span className="status">FT</span>
    case 'postponed':
      return <span className="status status--warn">PP</span>
    case 'cancelled':
      return <span className="status status--warn">CAN</span>
    default:
      return <span className="status">{kickoffTime(m.kickoff)}</span>
  }
}

export function MatchRow({ m }: { m: MatchSummary }) {
  const started = m.home.score !== null && m.away.score !== null
  const homeWon = m.status === 'finished' && started && m.home.score! > m.away.score!
  const awayWon = m.status === 'finished' && started && m.away.score! > m.home.score!
  return (
    <a
      className={`match-row match-row--${m.status}`}
      href={matchHref(m.competitionId, m.id)}
      title={`${m.home.name} v ${m.away.name} · open match centre`}
    >
      <StatusCell m={m} />
      <span className={`match-row__team${homeWon ? ' is-winner' : ''}`}>
        <Crest src={m.home.logo} />
        <span className="match-row__name">{m.home.shortName}</span>
      </span>
      <span className="match-row__score">{started ? `${m.home.score} – ${m.away.score}` : 'vs'}</span>
      <span className={`match-row__team match-row__team--away${awayWon ? ' is-winner' : ''}`}>
        <span className="match-row__name">{m.away.shortName}</span>
        <Crest src={m.away.logo} />
      </span>
    </a>
  )
}

function Days({ groups }: { groups: DayGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.key} className="day-group">
          <div className="day-group__label">{g.label}</div>
          {g.matches.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </div>
      ))}
    </>
  )
}

interface Props {
  matches: MatchSummary[]
  /** The list is the competition's nearest matchday rather than the ±48h window. */
  nearest?: boolean
  /** Shown instead of the default when there is nothing to list. */
  emptyText?: string
}

export default function MatchList({ matches, nearest, emptyText }: Props) {
  if (matches.length === 0) {
    return <p className="empty">{emptyText ?? 'No matches in the last or next 48 hours.'}</p>
  }
  const { live, upcoming, results } = groupMatches(matches, new Date())
  return (
    <div className="match-list">
      {nearest && <p className="notice">Nothing within 48 hours — showing the nearest matchday.</p>}
      {live.length > 0 && (
        <section className="match-section">
          <h4 className="match-section__title match-section__title--live">
            <span className="live-dot" /> Live now
          </h4>
          {live.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="match-section">
          <h4 className="match-section__title">{nearest ? 'Upcoming' : 'Upcoming · next 48h'}</h4>
          <Days groups={upcoming} />
        </section>
      )}
      {results.length > 0 && (
        <section className="match-section">
          <h4 className="match-section__title">{nearest ? 'Results' : 'Results · last 48h'}</h4>
          <Days groups={results} />
        </section>
      )}
    </div>
  )
}
