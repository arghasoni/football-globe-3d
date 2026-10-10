import type { MatchEvent, MatchStatus } from '../../../shared/types'

export type TimelineItem =
  | { kind: 'event'; event: MatchEvent; /** Score after this goal, e.g. "1–0". */ score?: string }
  | { kind: 'divider'; label: string; score?: string }

const SCORING = new Set<MatchEvent['type']>(['goal', 'own-goal', 'penalty-goal'])

/** ESPN goal texts end with the new score, e.g. "Goal! Fulham 1, Manchester United 0." */
function scoreFromText(text: string): [number, number] | null {
  const all = [...text.matchAll(/(\d+), [^,]+? (\d+)\./g)]
  const last = all.at(-1)
  return last ? [Number(last[1]), Number(last[2])] : null
}

function dividerLabel(text: string, isLastPeriod: boolean, status: MatchStatus): string | null {
  switch (text) {
    case 'Kickoff':
      return 'Kick-off'
    case 'Halftime':
      return 'Half-time'
    case 'Start 2nd Half':
      return null // Half-time already marks the break.
    case 'End Regular Time':
      return isLastPeriod && status === 'finished' ? 'Full-time' : 'End of 90 minutes'
    default:
      return text || null
  }
}

/**
 * The match story, newest first. ESPN's order is kept as-is: it is chronological,
 * while minutes are not (half-time subs are logged at 45' after "45'+4' Halftime").
 */
export function buildTimeline(events: MatchEvent[], status: MatchStatus): TimelineItem[] {
  const items: TimelineItem[] = []
  let home = 0
  let away = 0
  const lastPeriod = events.findLastIndex((e) => e.type === 'period')

  events.forEach((e, i) => {
    if (e.type === 'period') {
      const label = dividerLabel(e.text, i === lastPeriod, status)
      if (!label) return
      items.push(label === 'Kick-off' ? { kind: 'divider', label } : { kind: 'divider', label, score: `${home}–${away}` })
      return
    }
    if (SCORING.has(e.type) && e.side) {
      const parsed = scoreFromText(e.text)
      if (parsed) [home, away] = parsed
      else if (e.side === 'home') home++
      else away++
      items.push({ kind: 'event', event: e, score: `${home}–${away}` })
      return
    }
    items.push({ kind: 'event', event: e })
  })

  return items.reverse()
}
