// Single source of truth for every competition the app covers.
// Used by the server (fetching) and the web app (globe, mode switch, panels).

export type Region =
  /** ISO 3166-1 numeric country code, matching world-atlas polygon ids. */
  | { kind: 'country'; countryId: string }
  /** Cross-border club competitions (Champions League, …). */
  | { kind: 'continental'; continent: 'Europe' }
  /** National-team competitions. */
  | { kind: 'international' }

/** The top-right mode switch. Each competition appears under exactly one mode. */
export type Mode = 'leagues' | 'europe' | 'world-cup' | 'internationals'

export const MODES: { id: Mode; label: string; short: string }[] = [
  { id: 'leagues', label: 'Leagues', short: 'Leagues' },
  { id: 'europe', label: 'Champions League', short: 'UCL' },
  { id: 'world-cup', label: 'World Cup', short: 'World Cup' },
  { id: 'internationals', label: 'Internationals', short: 'Intl' },
]

export interface Competition {
  /** ESPN league slug, also our public id, e.g. 'esp.1'. */
  id: string
  name: string
  /** Short tab label. */
  short: string
  /** 1 = top division. Cups and non-league competitions use 0. */
  tier: number
  mode: Mode
  region: Region
  /** football-data.org code, when that free tier covers it (scores-only fallback). */
  footballDataCode?: string
  /** Shown when there are no matches to list (e.g. between tournaments). */
  quietNote?: string
}

const country = (countryId: string): Region => ({ kind: 'country', countryId })
const europe: Region = { kind: 'continental', continent: 'Europe' }
const intl: Region = { kind: 'international' }

export const COMPETITIONS: Competition[] = [
  // Domestic leagues
  { id: 'eng.1', name: 'Premier League', short: 'Premier League', tier: 1, mode: 'leagues', region: country('826'), footballDataCode: 'PL' },
  { id: 'eng.2', name: 'Championship', short: 'Championship', tier: 2, mode: 'leagues', region: country('826'), footballDataCode: 'ELC' },
  { id: 'esp.1', name: 'LaLiga', short: 'LaLiga', tier: 1, mode: 'leagues', region: country('724'), footballDataCode: 'PD' },
  { id: 'esp.2', name: 'LaLiga 2', short: 'LaLiga 2', tier: 2, mode: 'leagues', region: country('724') },
  { id: 'fra.1', name: 'Ligue 1', short: 'Ligue 1', tier: 1, mode: 'leagues', region: country('250'), footballDataCode: 'FL1' },
  { id: 'fra.2', name: 'Ligue 2', short: 'Ligue 2', tier: 2, mode: 'leagues', region: country('250') },
  { id: 'ita.1', name: 'Serie A', short: 'Serie A', tier: 1, mode: 'leagues', region: country('380'), footballDataCode: 'SA' },
  { id: 'ita.2', name: 'Serie B', short: 'Serie B', tier: 2, mode: 'leagues', region: country('380') },
  { id: 'ger.1', name: 'Bundesliga', short: 'Bundesliga', tier: 1, mode: 'leagues', region: country('276'), footballDataCode: 'BL1' },
  { id: 'ger.2', name: '2. Bundesliga', short: '2. Bundesliga', tier: 2, mode: 'leagues', region: country('276') },
  { id: 'ind.1', name: 'Indian Super League', short: 'ISL', tier: 1, mode: 'leagues', region: country('356') },
  { id: 'usa.1', name: 'MLS', short: 'MLS', tier: 1, mode: 'leagues', region: country('840') },
  { id: 'ksa.1', name: 'Saudi Pro League', short: 'Saudi Pro League', tier: 1, mode: 'leagues', region: country('682') },
  // European club competitions
  { id: 'uefa.champions', name: 'Champions League', short: 'Champions League', tier: 0, mode: 'europe', region: europe, footballDataCode: 'CL' },
  { id: 'uefa.europa', name: 'Europa League', short: 'Europa League', tier: 0, mode: 'europe', region: europe },
  { id: 'uefa.europa.conf', name: 'Conference League', short: 'Conference League', tier: 0, mode: 'europe', region: europe },
  // World Cup and qualifying
  { id: 'fifa.world', name: 'FIFA World Cup', short: 'World Cup', tier: 0, mode: 'world-cup', region: intl, footballDataCode: 'WC', quietNote: 'No World Cup matches right now. The next FIFA World Cup is in 2030, hosted by Spain, Portugal and Morocco.' },
  { id: 'fifa.worldq.uefa', name: 'WC Qualifying · UEFA', short: 'Qual. UEFA', tier: 0, mode: 'world-cup', region: intl },
  { id: 'fifa.worldq.conmebol', name: 'WC Qualifying · CONMEBOL', short: 'Qual. CONMEBOL', tier: 0, mode: 'world-cup', region: intl },
  { id: 'fifa.worldq.afc', name: 'WC Qualifying · AFC', short: 'Qual. AFC', tier: 0, mode: 'world-cup', region: intl },
  { id: 'fifa.worldq.caf', name: 'WC Qualifying · CAF', short: 'Qual. CAF', tier: 0, mode: 'world-cup', region: intl },
  { id: 'fifa.worldq.concacaf', name: 'WC Qualifying · CONCACAF', short: 'Qual. CONCACAF', tier: 0, mode: 'world-cup', region: intl },
  // Other national-team football
  { id: 'uefa.nations', name: 'Nations League', short: 'Nations League', tier: 0, mode: 'internationals', region: intl },
  { id: 'fifa.friendly', name: 'International Friendlies', short: 'Friendlies', tier: 0, mode: 'internationals', region: intl },
  { id: 'uefa.euroq', name: 'Euro Qualifying', short: 'Euro Qual.', tier: 0, mode: 'internationals', region: intl, footballDataCode: 'EC' },
]

export const COMPETITION_BY_ID = new Map(COMPETITIONS.map((c) => [c.id, c]))

export function competitionsForCountry(countryId: string): Competition[] {
  return COMPETITIONS.filter((c) => c.region.kind === 'country' && c.region.countryId === countryId)
}

export function competitionsForMode(mode: Mode): Competition[] {
  return COMPETITIONS.filter((c) => c.mode === mode)
}
