import type { MatchEvent, MatchStatus } from '../../../shared/types'
import { buildTimeline } from '../lib/timeline'

const GOAL_TAG: Partial<Record<MatchEvent['type'], string>> = { 'penalty-goal': ' (pen)', 'own-goal': ' (OG)' }

function EventBody({ e, score }: { e: MatchEvent; score?: string }) {
  const [main, second] = e.players
  switch (e.type) {
    case 'goal':
    case 'penalty-goal':
    case 'own-goal':
      return (
        <div className="tl-body">
          <span className="tl-icon tl-icon--goal" aria-label="Goal" />
          <div className="tl-text">
            <strong>
              {main}
              {GOAL_TAG[e.type]}
            </strong>
            {second && e.type !== 'own-goal' && <span className="tl-sub">Assist: {second}</span>}
          </div>
          {score && <span className="tl-score">{score}</span>}
        </div>
      )
    case 'sub':
      return (
        <div className="tl-body">
          <span className="tl-icon tl-icon--sub" aria-label="Substitution" />
          <div className="tl-text">
            <span className="tl-on">{main}</span>
            {second && <span className="tl-sub tl-off">{second}</span>}
          </div>
        </div>
      )
    case 'yellow':
    case 'second-yellow':
    case 'red':
      return (
        <div className="tl-body">
          <span className={`tl-icon tl-icon--${e.type}`} aria-label={e.type === 'yellow' ? 'Yellow card' : 'Red card'} />
          <div className="tl-text">
            <span>{main}</span>
            {e.type === 'second-yellow' && <span className="tl-sub">Second yellow</span>}
          </div>
        </div>
      )
    case 'penalty-miss':
      return (
        <div className="tl-body">
          <span className="tl-icon tl-icon--miss" aria-label="Penalty missed" />
          <div className="tl-text">
            <span>{main}</span>
            <span className="tl-sub">Penalty missed</span>
          </div>
        </div>
      )
    default:
      return (
        <div className="tl-body">
          <span className="tl-icon tl-icon--var">VAR</span>
          <div className="tl-text">
            <span className="tl-sub">{e.text}</span>
          </div>
        </div>
      )
  }
}

export default function Timeline({ events, status }: { events: MatchEvent[]; status: MatchStatus }) {
  const items = buildTimeline(events, status)
  if (!items.some((i) => i.kind === 'event')) {
    return (
      <p className="empty">
        {status === 'scheduled' ? 'The timeline starts at kick-off.' : 'No key events reported for this match yet.'}
      </p>
    )
  }
  return (
    <ol className="timeline">
      {items.map((item, i) =>
        item.kind === 'divider' ? (
          <li key={i} className="tl-divider">
            <span>
              {item.label}
              {item.score && <b> {item.score}</b>}
            </span>
          </li>
        ) : (
          <li key={i} className={`tl-row tl-row--${item.event.side ?? 'neutral'}`}>
            <div className="tl-side tl-side--home">
              {item.event.side !== 'away' && <EventBody e={item.event} score={item.score} />}
            </div>
            <span className="tl-minute">{item.event.minute}</span>
            <div className="tl-side tl-side--away">
              {item.event.side === 'away' && <EventBody e={item.event} score={item.score} />}
            </div>
          </li>
        ),
      )}
    </ol>
  )
}
