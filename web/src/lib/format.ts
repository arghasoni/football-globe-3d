import type { MatchSummary } from '../../../shared/types'

export interface DayGroup {
  key: string
  label: string
  matches: MatchSummary[]
}

export interface MatchGroups {
  live: MatchSummary[]
  /** Scheduled (and postponed/cancelled) fixtures by local day, soonest first. */
  upcoming: DayGroup[]
  /** Finished matches by local day, most recent first. */
  results: DayGroup[]
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

function daysBetween(a: Date, b: Date): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((start(a) - start(b)) / 86_400_000)
}

const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

export function dayLabel(date: Date, now: Date): string {
  const diff = daysBetween(date, now)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return DAY_FORMAT.format(date)
}

/** Kickoff in the viewer's time zone, e.g. "20:00". */
export function kickoffTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso))
}

function byDay(matches: MatchSummary[], now: Date): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const m of matches) {
    const d = new Date(m.kickoff)
    const key = dayKey(d)
    if (!groups.has(key)) groups.set(key, { key, label: dayLabel(d, now), matches: [] })
    groups.get(key)!.matches.push(m)
  }
  return [...groups.values()]
}

export function groupMatches(matches: MatchSummary[], now: Date): MatchGroups {
  const asc = [...matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  return {
    live: asc.filter((m) => m.status === 'live' || m.status === 'halftime'),
    upcoming: byDay(
      asc.filter((m) => m.status === 'scheduled' || m.status === 'postponed' || m.status === 'cancelled'),
      now,
    ),
    results: byDay(
      asc.filter((m) => m.status === 'finished').reverse(),
      now,
    ),
  }
}
