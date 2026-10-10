import type { MatchEvent, MatchSummary, Side } from '../../../shared/types'

export interface HeaderMark {
  kind: 'goal' | 'red'
  player: string
  minute: string
  tag?: 'pen' | 'OG'
}

/** Minute strings like "45'+2'" in match order. */
export function minuteValue(minute: string): number {
  const [base, extra] = minute.split('+').map((p) => parseInt(p, 10) || 0)
  return base + (extra ?? 0) / 100
}

/** Goals and sendings-off shown under each team in the score header. */
export function headerMarks(events: MatchEvent[]): Record<Side, HeaderMark[]> {
  const marks: Record<Side, HeaderMark[]> = { home: [], away: [] }
  const sorted = [...events].sort((a, b) => minuteValue(a.minute) - minuteValue(b.minute))
  for (const e of sorted) {
    if (!e.side) continue
    const base = { player: e.players[0] ?? '', minute: e.minute }
    if (e.type === 'goal') marks[e.side].push({ kind: 'goal', ...base })
    else if (e.type === 'penalty-goal') marks[e.side].push({ kind: 'goal', ...base, tag: 'pen' })
    else if (e.type === 'own-goal') marks[e.side].push({ kind: 'goal', ...base, tag: 'OG' })
    else if (e.type === 'red' || e.type === 'second-yellow') marks[e.side].push({ kind: 'red', ...base })
  }
  return marks
}

export function statusText(m: Pick<MatchSummary, 'status' | 'clock'>): string {
  switch (m.status) {
    case 'live':
      return m.clock ?? 'Live'
    case 'halftime':
      return 'Half-time'
    case 'finished':
      return 'Full-time'
    case 'postponed':
      return 'Postponed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Upcoming'
  }
}

export function kickoffCountdown(kickoff: string, now: Date): string {
  const mins = Math.round((Date.parse(kickoff) - now.getTime()) / 60_000)
  if (mins <= 0) return 'Kick-off soon'
  if (mins < 60) return `Kick-off in ${mins}m`
  if (mins < 24 * 60) return `Kick-off in ${Math.floor(mins / 60)}h ${mins % 60}m`
  const days = Math.floor(mins / (24 * 60))
  return `Kick-off in ${days} day${days === 1 ? '' : 's'}`
}

const FULL_DATE = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/** e.g. "Saturday 10 October, 20:00" in the viewer's time zone. */
export const kickoffLong = (iso: string) => FULL_DATE.format(new Date(iso))
