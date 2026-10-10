// The normalised model the web app consumes. Providers translate into these shapes.

export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed' | 'cancelled'

export type Side = 'home' | 'away'

export interface Team {
  id: string
  name: string
  shortName: string
  abbreviation: string
  logo?: string
  /** Hex without '#', when the provider knows the kit colour. */
  color?: string
}

export interface MatchSide extends Team {
  score: number | null
  /** e.g. 'WWDLW', most recent last. */
  form?: string
  /** Club or national team's country, when known (drives the globe arcs). */
  country?: CountryRef
}

export interface MatchSummary {
  id: string
  competitionId: string
  /** ISO 8601 UTC. */
  kickoff: string
  status: MatchStatus
  /** Match clock while in play, e.g. "67'" or "90'+3'". */
  clock: string | null
  home: MatchSide
  away: MatchSide
  venue?: { name: string; city?: string; country?: string }
  source: 'espn' | 'football-data'
}

export type MatchEventType =
  | 'goal'
  | 'own-goal'
  | 'penalty-goal'
  | 'penalty-miss'
  | 'yellow'
  | 'second-yellow'
  | 'red'
  | 'sub'
  | 'var'
  | 'period'

export interface MatchEvent {
  /** Display minute, e.g. "45'+2'". */
  minute: string
  type: MatchEventType
  side: Side | null
  text: string
  /** Main player first; for subs: [player on, player off]. */
  players: string[]
}

export interface StatLine {
  key: string
  label: string
  home: string
  away: string
}

export interface LineupPlayer {
  name: string
  number?: string
  position?: string
  starter: boolean
  /** Provider slot index within the formation (1 = goalkeeper). */
  formationPlace?: number
  subbedIn: boolean
  subbedOut: boolean
}

export interface Lineup {
  formation?: string
  players: LineupPlayer[]
}

/** Extra facts for the match centre header; any of them can be missing. */
export interface MatchInfo {
  /** Stage within the competition, e.g. 'Round of 16' or 'Group C3'. */
  round?: string
  /** Tie or result note, e.g. '2nd Leg - Iraq win 3-2 on aggregate'. */
  note?: string
  referee?: string
  attendance?: number
  /** Score at half-time, once the first half is over. */
  halftime?: { home: number; away: number }
}

export interface MatchDetail extends MatchSummary {
  info: MatchInfo
  events: MatchEvent[]
  stats: StatLine[]
  lineups: { home?: Lineup; away?: Lineup }
}

export interface StandingRow {
  rank: number
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export interface StandingsGroup {
  /** Group/table name, e.g. 'League Phase' or 'Group A'. */
  name: string
  rows: StandingRow[]
}

/** API responses carry freshness so the UI can show a "may be delayed" badge. */
export interface Envelope<T> {
  data: T
  stale: boolean
  updatedAt: string
  source: 'espn' | 'football-data' | 'mock'
  /** 'nearest-matchday': nothing within ±48h, so this is the competition's closest matchday instead. */
  note?: 'nearest-matchday'
}

/** A country as used for teams: ISO numeric code (or 'gb-eng' style for home nations). */
export interface CountryRef {
  code: string
  name: string
}
