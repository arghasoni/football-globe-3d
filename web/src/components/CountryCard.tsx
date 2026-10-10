import Flag from './Flag'
import type { LeagueCountry } from '../data/countries'

interface Props {
  country: LeagueCountry
  liveCount: number
  onOpen: () => void
}

export default function CountryCard({ country, liveCount: live, onOpen }: Props) {
  return (
    <button className="country-card" onClick={onOpen} key={country.id}>
      <div className="country-card__head">
        <Flag code={country.flag} size={20} />
        <span className="country-card__name">{country.name}</span>
      </div>
      <ul className="country-card__leagues">
        {country.leagues.map((l) => (
          <li key={l.id}>
            <span className="tier">D{l.tier}</span>
            {l.name}
          </li>
        ))}
      </ul>
      <div className="country-card__foot">
        {live > 0 ? (
          <span className="live-pill">
            <span className="live-dot" /> {live} live now
          </span>
        ) : (
          <span className="muted">No live matches</span>
        )}
        <span className="cta">Open →</span>
      </div>
    </button>
  )
}
