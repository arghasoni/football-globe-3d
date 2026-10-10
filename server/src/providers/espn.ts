import type {
  MatchDetail,
  MatchEvent,
  MatchEventType,
  MatchInfo,
  MatchSide,
  MatchStatus,
  MatchSummary,
  Side,
  StandingRow,
  StandingsGroup,
  StatLine,
} from '../../../shared/types.ts'

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer'

/** ESPN rejects requests that don't look like a browser. */
export const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (FootGlobe personal project)',
  Accept: 'application/json',
}

export const espnUrl = {
  /** `date` as YYYYMMDD; omitted = ESPN's current matchday. */
  scoreboard: (league: string, date?: string) => `${SITE}/${league}/scoreboard${date ? `?dates=${date}` : ''}`,
  summary: (league: string, eventId: string) => `${SITE}/${league}/summary?event=${eventId}`,
  standings: (league: string) => `${STANDINGS}/${league}/standings`,
  team: (league: string, teamId: string) => `${SITE}/${league}/teams/${teamId}`,
  teamSchedule: (league: string, teamId: string) => `${SITE}/${league}/teams/${teamId}/schedule`,
}

// ---- Raw ESPN shapes (only the fields we read) ----

interface EspnStatus {
  displayClock?: string
  type: { name: string; state: 'pre' | 'in' | 'post'; completed: boolean }
}

interface EspnTeam {
  id: string
  displayName: string
  shortDisplayName?: string
  abbreviation?: string
  logo?: string
  logos?: { href: string }[]
  color?: string
}

interface EspnCompetitor {
  homeAway: 'home' | 'away'
  score?: string
  form?: string
  team: EspnTeam
}

interface EspnVenue {
  fullName?: string
  address?: { city?: string; country?: string }
}

interface EspnEvent {
  id: string
  date: string
  status: EspnStatus
  competitions: { competitors: EspnCompetitor[]; venue?: EspnVenue }[]
}

interface EspnKeyEvent {
  type?: { type?: string; text?: string }
  clock?: { displayValue?: string }
  team?: { id: string }
  text?: string
  shortText?: string
  scoringPlay?: boolean
  participants?: { athlete?: { displayName?: string } }[]
}

interface EspnRosterPlayer {
  starter: boolean
  jersey?: string
  athlete?: { displayName?: string }
  position?: { abbreviation?: string }
  formationPlace?: string
  subbedIn?: boolean | { didSub?: boolean }
  subbedOut?: boolean | { didSub?: boolean }
}

interface EspnSummary {
  header: {
    competitions: {
      date: string
      status: EspnStatus
      competitors: (EspnCompetitor & { linescores?: { displayValue?: string }[] })[]
      /** e.g. 'UEFA Champions League, Round of 16'. */
      altGameNote?: string
      notes?: { headline?: string }[]
    }[]
  }
  gameInfo?: {
    venue?: EspnVenue
    attendance?: number
    officials?: { displayName?: string; position?: { name?: string } }[]
  }
  keyEvents?: EspnKeyEvent[]
  rosters?: { homeAway: Side; formation?: string; roster?: EspnRosterPlayer[] }[]
  boxscore?: {
    teams?: {
      homeAway?: Side
      team: { id: string }
      statistics?: { name: string; label?: string; displayValue: string }[]
    }[]
  }
}

interface EspnStandingsNode {
  name?: string
  standings?: { entries?: { team: EspnTeam; stats: { name: string; value?: number }[] }[] }
  children?: EspnStandingsNode[]
}

export interface EspnTeamProfile {
  team?: { defaultLeague?: { slug?: string } }
}

export interface EspnTeamSchedule {
  events?: { competitions?: { venue?: EspnVenue; competitors?: { id: string; homeAway: Side }[] }[] }[]
}

/** Country name of the stadium where the team plays its home games, if its schedule shows one. */
export function homeVenueCountryFromSchedule(json: unknown, teamId: string): string | null {
  for (const e of (json as EspnTeamSchedule).events ?? []) {
    const comp = e.competitions?.[0]
    const home = comp?.competitors?.find((c) => c.id === teamId)?.homeAway === 'home'
    if (home && comp?.venue?.address?.country) return comp.venue.address.country
  }
  return null
}

// ---- Normalisation ----

function toStatus(s: EspnStatus): MatchStatus {
  const name = s.type.name
  if (/POSTPONED|DELAYED|SUSPENDED/.test(name)) return 'postponed'
  if (/CANCELED|CANCELLED|ABANDONED/.test(name)) return 'cancelled'
  if (name === 'STATUS_HALFTIME') return 'halftime'
  if (s.type.state === 'in') return 'live'
  if (s.type.state === 'post') return 'finished'
  return 'scheduled'
}

function toSide(c: EspnCompetitor, status: MatchStatus): MatchSide {
  const t = c.team
  const started = status === 'live' || status === 'halftime' || status === 'finished'
  return {
    id: t.id,
    name: t.displayName,
    shortName: t.shortDisplayName ?? t.displayName,
    abbreviation: t.abbreviation ?? t.displayName.slice(0, 3).toUpperCase(),
    logo: t.logo ?? t.logos?.[0]?.href,
    color: t.color,
    score: started && c.score != null && c.score !== '' ? Number(c.score) : null,
    form: c.form,
  }
}

function buildSummary(
  id: string,
  competitionId: string,
  date: string,
  statusRaw: EspnStatus,
  competitors: EspnCompetitor[],
  venue?: EspnVenue,
): MatchSummary {
  const status = toStatus(statusRaw)
  const home = competitors.find((c) => c.homeAway === 'home')!
  const away = competitors.find((c) => c.homeAway === 'away')!
  return {
    id,
    competitionId,
    kickoff: new Date(date).toISOString(),
    status,
    clock: status === 'live' ? (statusRaw.displayClock ?? null) : status === 'halftime' ? 'HT' : null,
    home: toSide(home, status),
    away: toSide(away, status),
    venue: venue?.fullName
      ? { name: venue.fullName, city: venue.address?.city, country: venue.address?.country }
      : undefined,
    source: 'espn',
  }
}

export function parseScoreboard(json: unknown, competitionId: string): MatchSummary[] {
  const events = (json as { events?: EspnEvent[] }).events ?? []
  return events.map((e) => {
    const comp = e.competitions[0]
    return buildSummary(e.id, competitionId, e.date, e.status, comp.competitors, comp.venue)
  })
}

function toEventType(e: EspnKeyEvent): MatchEventType | null {
  const t = (e.type?.type ?? '').toLowerCase()
  const text = `${e.type?.text ?? ''} ${e.text ?? ''}`.toLowerCase()
  if (e.scoringPlay || t.startsWith('goal')) {
    if (t.includes('own') || text.includes('own goal')) return 'own-goal'
    if (t.includes('penalty') || text.includes('penalty')) return 'penalty-goal'
    return 'goal'
  }
  if (t.includes('penalty') && /miss|saved/.test(t + text)) return 'penalty-miss'
  if (t.includes('substitution')) return 'sub'
  if (/second-yellow|yellow-red/.test(t)) return 'second-yellow'
  if (t.includes('yellow')) return 'yellow'
  if (t.includes('red')) return 'red'
  if (t.includes('var')) return 'var'
  if (/kickoff|halftime|start-2nd-half|end-regular-time|full-?time|extra|shootout/.test(t)) return 'period'
  return null // delays, injuries and other noise
}

function didSub(v: EspnRosterPlayer['subbedIn']): boolean {
  return typeof v === 'object' ? !!v?.didSub : !!v
}

function toInfo(s: EspnSummary): MatchInfo {
  const comp = s.header.competitions[0]
  const info: MatchInfo = {}
  // The part after the competition name, when there is one.
  const round = comp.altGameNote?.split(', ').slice(1).join(', ')
  if (round) info.round = round
  const note = comp.notes?.find((n) => n.headline)?.headline
  if (note) info.note = note
  const referee = s.gameInfo?.officials?.find((o) => o.position?.name === 'Referee') ?? s.gameInfo?.officials?.[0]
  if (referee?.displayName) info.referee = referee.displayName
  if (s.gameInfo?.attendance) info.attendance = s.gameInfo.attendance
  // A second period score only appears once the first half is over.
  const firstHalf = (side: Side) => {
    const ls = comp.competitors.find((c) => c.homeAway === side)?.linescores
    return ls && ls.length >= 2 ? Number(ls[0].displayValue) : NaN
  }
  const [home, away] = [firstHalf('home'), firstHalf('away')]
  if (Number.isFinite(home) && Number.isFinite(away)) info.halftime = { home, away }
  return info
}

export function parseSummary(json: unknown, competitionId: string, eventId: string): MatchDetail {
  const s = json as EspnSummary
  const comp = s.header.competitions[0]
  const base = buildSummary(eventId, competitionId, comp.date, comp.status, comp.competitors, s.gameInfo?.venue)
  const info = toInfo(s)
  const sideOfTeam = (teamId?: string): Side | null =>
    teamId === base.home.id ? 'home' : teamId === base.away.id ? 'away' : null

  const events: MatchEvent[] = []
  for (const e of s.keyEvents ?? []) {
    const type = toEventType(e)
    if (!type) continue
    events.push({
      minute: e.clock?.displayValue ?? '',
      type,
      side: sideOfTeam(e.team?.id),
      text: type === 'period' ? (e.type?.text ?? '') : (e.text ?? e.shortText ?? ''),
      players: (e.participants ?? []).map((p) => p.athlete?.displayName ?? '').filter(Boolean),
    })
  }

  const lineups: MatchDetail['lineups'] = {}
  for (const r of s.rosters ?? []) {
    if (!r.roster?.length) continue
    lineups[r.homeAway] = {
      formation: r.formation,
      players: r.roster.map((p) => ({
        name: p.athlete?.displayName ?? '',
        number: p.jersey,
        position: p.position?.abbreviation,
        starter: p.starter,
        formationPlace: p.formationPlace ? Number(p.formationPlace) : undefined,
        subbedIn: didSub(p.subbedIn),
        subbedOut: didSub(p.subbedOut),
      })),
    }
  }

  const teams = s.boxscore?.teams ?? []
  const statsFor = (side: Side) => teams.find((t) => (t.homeAway ?? sideOfTeam(t.team.id)) === side)?.statistics ?? []
  const awayStats = statsFor('away')
  const stats: StatLine[] = statsFor('home').map((h) => ({
    key: h.name,
    label: h.label ?? h.name,
    home: h.displayValue,
    away: awayStats.find((a) => a.name === h.name)?.displayValue ?? '',
  }))

  return { ...base, info, events, stats, lineups }
}

function collectTables(node: EspnStandingsNode, out: StandingsGroup[]) {
  const entries = node.standings?.entries
  if (entries?.length) {
    const rows: StandingRow[] = entries.map((e) => {
      const stat = (n: string) => e.stats.find((s) => s.name === n)?.value ?? 0
      return {
        rank: stat('rank'),
        team: {
          id: e.team.id,
          name: e.team.displayName,
          shortName: e.team.shortDisplayName ?? e.team.displayName,
          abbreviation: e.team.abbreviation ?? '',
          logo: e.team.logos?.[0]?.href ?? e.team.logo,
        },
        played: stat('gamesPlayed'),
        won: stat('wins'),
        drawn: stat('ties'),
        lost: stat('losses'),
        goalsFor: stat('pointsFor'),
        goalsAgainst: stat('pointsAgainst'),
        points: stat('points'),
      }
    })
    rows.sort((a, b) => a.rank - b.rank)
    out.push({ name: node.name ?? 'Table', rows })
  }
  for (const child of node.children ?? []) collectTables(child, out)
}

export function parseStandings(json: unknown): StandingsGroup[] {
  const out: StandingsGroup[] = []
  collectTables(json as EspnStandingsNode, out)
  return out
}
