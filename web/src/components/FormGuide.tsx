import type { FormGame, MatchSide, Side } from '../../../shared/types'
import { Crest } from './MatchList'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

function Game({ g }: { g: FormGame }) {
  const where = g.home ? 'vs' : 'at'
  const title = `${g.result} ${g.goalsFor}–${g.goalsAgainst} ${where} ${g.opponent} · ${g.competition ?? ''} · ${DATE.format(new Date(g.date))}`
  return (
    <li className={`form-game form-game--${g.result}`} title={title}>
      <span className="form-game__result">{g.result}</span>
      <Crest src={g.opponentLogo} />
      <span className="form-game__score">
        {g.goalsFor}–{g.goalsAgainst}
      </span>
    </li>
  )
}

/** Each team's last five results, oldest to newest (left to right). */
export default function FormGuide({ form, teams }: { form: Record<Side, FormGame[]>; teams: Record<Side, MatchSide> }) {
  const sides = (['home', 'away'] as Side[]).filter((s) => form[s].length > 0)
  if (sides.length === 0) return null
  return (
    <section className="form-guide">
      <h4 className="match-section__title">Recent form</h4>
      {sides.map((s) => (
        <div key={s} className="form-guide__team">
          <span className="form-guide__name">
            <Crest src={teams[s].logo} /> {teams[s].shortName}
          </span>
          <ol className="form-guide__games">
            {form[s].map((g) => (
              <Game key={`${g.date}-${g.opponent}`} g={g} />
            ))}
          </ol>
        </div>
      ))}
    </section>
  )
}
