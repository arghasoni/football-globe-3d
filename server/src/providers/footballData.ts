import type { MatchSide, MatchStatus, MatchSummary } from '../../../shared/types.ts'

export const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4'

interface FdTeam {
  id: number
  name: string
  shortName?: string
  tla?: string
  crest?: string
}

interface FdMatch {
  id: number
  utcDate: string
  status: string
  homeTeam: FdTeam
  awayTeam: FdTeam
  score: { fullTime: { home: number | null; away: number | null } }
}

function toStatus(s: string): MatchStatus {
  switch (s) {
    case 'IN_PLAY':
      return 'live'
    case 'PAUSED':
      return 'halftime'
    case 'FINISHED':
    case 'AWARDED':
      return 'finished'
    case 'POSTPONED':
    case 'SUSPENDED':
      return 'postponed'
    case 'CANCELLED':
      return 'cancelled'
    default:
      return 'scheduled'
  }
}

function toSide(t: FdTeam, score: number | null): MatchSide {
  return {
    id: `fd-${t.id}`,
    name: t.name,
    shortName: t.shortName ?? t.name,
    abbreviation: t.tla ?? t.name.slice(0, 3).toUpperCase(),
    logo: t.crest,
    score,
  }
}

/** Scores-only fallback: the free tier has no clock, events, stats or lineups. */
export function parseMatches(json: unknown, competitionId: string): MatchSummary[] {
  const matches = (json as { matches?: FdMatch[] }).matches ?? []
  return matches.map((m) => {
    const status = toStatus(m.status)
    return {
      id: `fd-${m.id}`,
      competitionId,
      kickoff: new Date(m.utcDate).toISOString(),
      status,
      clock: status === 'halftime' ? 'HT' : null,
      home: toSide(m.homeTeam, m.score.fullTime.home),
      away: toSide(m.awayTeam, m.score.fullTime.away),
      source: 'football-data',
    }
  })
}

/** Dates as YYYY-MM-DD, inclusive. */
export function footballDataMatchesUrl(code: string, from: string, to: string): string {
  return `${FOOTBALL_DATA_BASE}/competitions/${code}/matches?dateFrom=${from}&dateTo=${to}`
}
