import { COMPETITIONS, COMPETITION_BY_ID, type Competition } from '../../shared/competitions.ts'
import { countryByLeagueSlug, countryByName } from '../../shared/countryLookup.ts'
import { TtlCache } from './cache.ts'
import {
  ESPN_HEADERS,
  espnUrl,
  parseScoreboard,
  parseStandings,
  parseSummary,
  homeVenueCountryFromSchedule,
  type EspnTeamProfile,
} from './providers/espn.ts'
import { footballDataMatchesUrl, parseMatches } from './providers/footballData.ts'
import type { CountryRef, Envelope, MatchDetail, MatchSide, MatchSummary, StandingsGroup } from '../../shared/types.ts'

export class NotFoundError extends Error {}

export interface ServiceDeps {
  fetchJson: (url: string, headers: Record<string, string>) => Promise<unknown>
  now: () => Date
  footballDataToken: string
  /** Reported as the envelope source instead of the provider (used by --mock). */
  sourceOverride?: 'mock'
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY_MS = 24 * HOUR

/** A "nearest matchday" further away than this is too old/far to be useful (e.g. last cycle's qualifiers). */
const NEAREST_LIMIT_MS = 30 * DAY_MS

/** How far either side of now a competition's match list reaches. */
const WINDOW_MS = 48 * HOUR

/** Max simultaneous upstream requests; ESPN stalls on bursts. */
const UPSTREAM_CONCURRENCY = 4

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    return fn()
  }
}

/** Like Promise.allSettled, but runs at most `limit` tasks at once. */
async function settleLimited<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

const isInPlay = (m: MatchSummary) => m.status === 'live' || m.status === 'halftime'

/** Live lists refresh fast; days that are over refresh slowly. */
function matchesTtl(matches: MatchSummary[], now: number): number {
  if (matches.some(isInPlay)) return 20 * SECOND
  const pending = matches.filter((m) => m.status === 'scheduled')
  if (pending.some((m) => Date.parse(m.kickoff) - now < 30 * MINUTE)) return 30 * SECOND
  if (pending.length) return 5 * MINUTE
  return 30 * MINUTE
}

function detailTtl(d: MatchDetail): number {
  if (isInPlay(d)) return 20 * SECOND
  if (d.status === 'finished') return DAY_MS
  return 5 * MINUTE
}

const yyyymmdd = (t: number) => new Date(t).toISOString().slice(0, 10).replaceAll('-', '')
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10)

/**
 * UTC days whose ESPN scoreboards cover kickoffs within ±48h of `now`.
 * ESPN buckets by US Eastern date, so start one day earlier.
 */
function windowDays(now: number): string[] {
  const days: string[] = []
  for (let t = now - WINDOW_MS - DAY_MS; t <= now + WINDOW_MS; t += DAY_MS) days.push(yyyymmdd(t))
  return days
}

type Sourced<T> = { data: T; source: 'espn' | 'football-data' }

export function createService(deps: ServiceDeps) {
  const nowMs = () => deps.now().getTime()
  const cache = new TtlCache(nowMs)
  /** Clubs' countries learned from the stadiums they host matches in. */
  const homeVenueCountry = new Map<string, CountryRef>()

  const competition = (id: string): Competition => {
    const c = COMPETITION_BY_ID.get(id)
    if (!c) throw new NotFoundError(`Unknown competition ${id}`)
    return c
  }

  const envelope = <T>(
    r: { value: T; stale: boolean; storedAt: number },
    source: Envelope<T>['source'],
  ): Envelope<T> => ({
    data: r.value,
    stale: r.stale,
    updatedAt: new Date(r.storedAt).toISOString(),
    source: deps.sourceOverride ?? source,
  })

  async function clubCountry(comp: Competition, team: MatchSide): Promise<CountryRef | null> {
    try {
      const profile = await cache.get(
        `team:${team.id}`,
        () => withRetry(() => deps.fetchJson(espnUrl.team(comp.id, team.id), ESPN_HEADERS)) as Promise<EspnTeamProfile>,
        () => 7 * DAY_MS,
      )
      const slug = profile.value.team?.defaultLeague?.slug
      const fromLeague = slug ? countryByLeagueSlug(slug) : null
      if (fromLeague) return fromLeague
    } catch {
      // Fall through to the stadium-based guesses.
    }
    const learned = homeVenueCountry.get(team.id)
    if (learned) return learned
    // Clubs from smaller leagues list the European competition as their league:
    // find a home game in their schedule and use that stadium's country.
    try {
      const schedule = await cache.get(
        `schedule:${team.id}`,
        () => withRetry(() => deps.fetchJson(espnUrl.teamSchedule(comp.id, team.id), ESPN_HEADERS)),
        () => 7 * DAY_MS,
      )
      const venueCountry = homeVenueCountryFromSchedule(schedule.value, team.id)
      return venueCountry ? countryByName(venueCountry) : null
    } catch {
      return null
    }
  }

  /** Attach each team's country: league country, national-team name, or club profile. */
  async function withCountries(comp: Competition, matches: MatchSummary[]): Promise<MatchSummary[]> {
    for (const m of matches) {
      const venueCountry = m.venue?.country ? countryByName(m.venue.country) : null
      if (venueCountry) homeVenueCountry.set(m.home.id, venueCountry)
    }
    const sides = matches.flatMap((m) => [m.home, m.away])
    if (comp.region.kind === 'country') {
      const country = countryByLeagueSlug(comp.id)
      for (const s of sides) s.country = country ?? undefined
    } else if (comp.region.kind === 'international') {
      for (const s of sides) s.country = countryByName(s.name) ?? undefined
    } else {
      await settleLimited(
        sides.map((s) => async () => {
          s.country = (await clubCountry(comp, s)) ?? undefined
        }),
        UPSTREAM_CONCURRENCY,
      )
    }
    return matches
  }

  /** One ESPN scoreboard (a given day, or ESPN's "current" matchday), with fallback. */
  function scoreboard(comp: Competition, date?: string) {
    return cache.get<Sourced<MatchSummary[]>>(
      `matches:${comp.id}:${date ?? 'current'}`,
      async () => {
        try {
          const json = await withRetry(() => deps.fetchJson(espnUrl.scoreboard(comp.id, date), ESPN_HEADERS))
          return { data: await withCountries(comp, parseScoreboard(json, comp.id)), source: 'espn' }
        } catch (espnErr) {
          if (!comp.footballDataCode || !deps.footballDataToken) throw espnErr
          const day = date ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : isoDay(nowMs())
          const json = await deps.fetchJson(footballDataMatchesUrl(comp.footballDataCode, day, day), {
            'X-Auth-Token': deps.footballDataToken,
          })
          return { data: await withCountries(comp, parseMatches(json, comp.id)), source: 'football-data' }
        }
      },
      (v) => matchesTtl(v.data, nowMs()),
    )
  }

  /** Everything from 48h ago to 48h ahead, plus anything still in play. */
  async function windowMatches(comp: Competition): Promise<Envelope<MatchSummary[]>> {
    const now = nowMs()
    const results = await settleLimited(
      windowDays(now).map((d) => () => scoreboard(comp, d)),
      UPSTREAM_CONCURRENCY,
    )
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    if (ok.length === 0) throw (results[0] as PromiseRejectedResult).reason

    const byId = new Map<string, MatchSummary>()
    for (const r of ok) for (const m of r.value.data) byId.set(m.id, m)
    const data = [...byId.values()]
      .filter((m) => isInPlay(m) || Math.abs(Date.parse(m.kickoff) - now) <= WINDOW_MS)
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

    if (data.length === 0) {
      // Quiet spell (e.g. between European matchdays): show ESPN's nearest matchday instead.
      try {
        const nearest = await scoreboard(comp)
        const close = nearest.value.data.some((m) => Math.abs(Date.parse(m.kickoff) - now) <= NEAREST_LIMIT_MS)
        if (close) {
          return { ...envelope({ ...nearest, value: nearest.value.data }, nearest.value.source), note: 'nearest-matchday' }
        }
      } catch {
        // Keep the empty window.
      }
    }

    return {
      data,
      stale: ok.length < results.length || ok.some((r) => r.stale),
      updatedAt: new Date(Math.min(...ok.map((r) => r.storedAt))).toISOString(),
      source: deps.sourceOverride ?? (ok.every((r) => r.value.source === 'espn') ? 'espn' : 'football-data'),
    }
  }

  /** A single day (YYYYMMDD) when `date` is given, otherwise the ±48h window. */
  async function matches(competitionId: string, date?: string): Promise<Envelope<MatchSummary[]>> {
    const comp = competition(competitionId)
    if (!date) return windowMatches(comp)
    const res = await scoreboard(comp, date)
    return envelope({ ...res, value: res.value.data }, res.value.source)
  }

  async function match(competitionId: string, matchId: string): Promise<Envelope<MatchDetail>> {
    const comp = competition(competitionId)
    if (!/^\d+$/.test(matchId)) throw new NotFoundError('Match detail is only available for ESPN matches')
    try {
      const res = await cache.get(
        `match:${comp.id}:${matchId}`,
        async () =>
          parseSummary(
            await withRetry(() => deps.fetchJson(espnUrl.summary(comp.id, matchId), ESPN_HEADERS)),
            comp.id,
            matchId,
          ),
        detailTtl,
      )
      return envelope(res, 'espn')
    } catch (err) {
      // No summary (ESPN hiccup, or no recording in mock mode): the scoreboard still has the header.
      const list = await windowMatches(comp).catch(() => null)
      const m = list?.data.find((x) => x.id === matchId)
      if (!list || !m) throw err
      return {
        data: { ...m, info: {}, events: [], stats: [], lineups: {} },
        stale: true,
        updatedAt: list.updatedAt,
        source: list.source,
      }
    }
  }

  async function standings(competitionId: string): Promise<Envelope<StandingsGroup[]>> {
    const comp = competition(competitionId)
    const res = await cache.get(
      `standings:${comp.id}`,
      async () => parseStandings(await withRetry(() => deps.fetchJson(espnUrl.standings(comp.id), ESPN_HEADERS))),
      () => 10 * MINUTE,
    )
    return envelope(res, 'espn')
  }

  /** Every in-play match across all competitions; failing competitions are skipped. */
  async function live(): Promise<Envelope<MatchSummary[]>> {
    const results = await settleLimited(
      COMPETITIONS.map((c) => () => scoreboard(c)),
      UPSTREAM_CONCURRENCY,
    )
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
    return {
      data: ok.flatMap((r) => r.value.data.filter(isInPlay)),
      stale: ok.some((r) => r.stale) || ok.length < results.length,
      updatedAt: deps.now().toISOString(),
      source: deps.sourceOverride ?? 'espn',
    }
  }

  /** Pre-fetches the slow paths (European club countries) so the first visitor doesn't wait. */
  async function warm(): Promise<void> {
    const europe = COMPETITIONS.filter((c) => c.region.kind === 'continental')
    await settleLimited(
      europe.map((c) => () => matches(c.id)),
      1,
    )
  }

  return { competitions: () => COMPETITIONS, matches, match, standings, live, warm }
}

export type Service = ReturnType<typeof createService>
