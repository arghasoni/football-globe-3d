import type { MatchSummary } from '../../../shared/types'
import { kickoffTime } from '../lib/format'

interface Props {
  name: string
  matches: MatchSummary[]
  onOpen: () => void
}

/** The pop-up card for a focused country in the non-league modes. */
export default function FixtureCard({ name, matches, onOpen }: Props) {
  const shown = matches.slice(0, 3)
  return (
    <button className="country-card" onClick={onOpen}>
      <div className="country-card__head">
        <span className="country-card__name">{name}</span>
      </div>
      <ul className="country-card__leagues">
        {shown.map((m) => (
          <li key={m.id}>
            <span className="tier">
              {m.status === 'live' ? (m.clock ?? 'LIVE') : m.status === 'finished' ? 'FT' : kickoffTime(m.kickoff)}
            </span>
            {m.home.shortName} {m.home.score !== null ? `${m.home.score}–${m.away.score}` : 'v'} {m.away.shortName}
          </li>
        ))}
      </ul>
      <div className="country-card__foot">
        <span className="muted">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </span>
        <span className="cta">Show →</span>
      </div>
    </button>
  )
}
