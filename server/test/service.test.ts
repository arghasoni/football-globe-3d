import { describe, expect, it } from 'vitest'
import { createService, NotFoundError } from '../src/service.ts'
import { HttpError } from '../src/http.ts'
import { readdirSync } from 'node:fs'
import { loadFixture } from './helpers.ts'

function setup(routes: Record<string, () => unknown>, start = '2026-10-09T18:00:00Z') {
  let clock = Date.parse(start)
  const calls: string[] = []
  const service = createService({
    footballDataToken: 'test-token',
    now: () => new Date(clock),
    fetchJson: async (url: string) => {
      calls.push(url)
      // Most specific (longest) matching pattern wins, so teams/228 never answers teams/2283.
      const hit = Object.entries(routes)
        .filter(([pattern]) => url.includes(pattern))
        .sort((x, y) => y[0].length - x[0].length)[0]
      if (!hit) throw new HttpError(404, url)
      return hit[1]()
    },
  })
  return { service, calls, advance: (ms: number) => (clock += ms) }
}

const DAY = '20260920'
const espnFinished = () => loadFixture('espn/scoreboard-eng.1-20260920.json')
const espnDown = () => {
  throw new HttpError(503, 'espn')
}

describe('service.matches', () => {
  it('returns ESPN matches and serves repeats from cache', async () => {
    const { service, calls } = setup({ 'eng.1/scoreboard': espnFinished })
    const first = await service.matches('eng.1', DAY)
    const second = await service.matches('eng.1', DAY)
    expect(first.source).toBe('espn')
    expect(first.stale).toBe(false)
    expect(first.data.length).toBeGreaterThan(0)
    expect(second.data).toBe(first.data)
    expect(calls).toHaveLength(1)
  })

  it('falls back to football-data when ESPN fails', async () => {
    const { service, calls } = setup({
      'eng.1/scoreboard': espnDown,
      'football-data.org/v4/competitions/PL/matches': () => loadFixture('football-data/PL-20260919.json'),
    })
    const res = await service.matches('eng.1', DAY)
    expect(res.source).toBe('football-data')
    expect(res.data[0].source).toBe('football-data')
    expect(calls.some((u) => u.includes('dateFrom=2026-09-20&dateTo=2026-09-20'))).toBe(true)
  })

  it('retries a flaky ESPN request once before falling back', async () => {
    let attempts = 0
    const { service } = setup({
      'eng.1/scoreboard': () => (++attempts === 1 ? espnDown() : espnFinished()),
      'football-data.org': () => loadFixture('football-data/PL-20260919.json'),
    })
    const res = await service.matches('eng.1', DAY)
    expect(res.source).toBe('espn')
    expect(attempts).toBe(2)
  })

  it('serves the last good data marked stale when every source fails', async () => {
    let up = true
    const { service, advance } = setup({
      'ind.1/scoreboard': () => (up ? loadFixture('espn/scoreboard-ind.1.json') : espnDown()),
    })
    await service.matches('ind.1', DAY)
    up = false
    advance(60 * 60 * 1000)
    const res = await service.matches('ind.1', DAY)
    expect(res.stale).toBe(true)
    expect(res.data.length).toBeGreaterThan(0)
  })

  it('shares one upstream request between concurrent callers', async () => {
    const { service, calls } = setup({ 'eng.1/scoreboard': espnFinished })
    await Promise.all([service.matches('eng.1', DAY), service.matches('eng.1', DAY), service.matches('eng.1', DAY)])
    expect(calls).toHaveLength(1)
  })

  it('rejects unknown competitions', async () => {
    const { service } = setup({})
    await expect(service.matches('xyz.9')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('service.match', () => {
  it('returns full match detail', async () => {
    const { service } = setup({ 'eng.1/summary?event=401879276': () => loadFixture('espn/summary-eng.1-401879276.json') })
    const res = await service.match('eng.1', '401879276')
    expect(res.data.lineups.home?.formation).toBe('4-2-3-1')
  })

  it('falls back to the scoreboard entry, marked stale, when the summary is unavailable', async () => {
    const { service } = setup(
      { 'eng.1/summary': espnDown, 'eng.1/scoreboard': espnFinished },
      '2026-09-21T12:00:00Z',
    )
    const res = await service.match('eng.1', '401879276')
    expect(res.stale).toBe(true)
    expect(res.data).toMatchObject({ id: '401879276', status: 'finished', info: {}, events: [], stats: [], lineups: {} })
    expect(res.data.away).toMatchObject({ name: 'Liverpool', score: 1 })
  })

  it('still fails when the match is in neither the summary nor the scoreboards', async () => {
    const { service } = setup({ 'eng.1/summary': espnDown, 'eng.1/scoreboard': espnFinished }, '2026-09-21T12:00:00Z')
    await expect(service.match('eng.1', '999')).rejects.toThrow()
  })
})

describe('service.live', () => {
  it('collects in-play matches across competitions and skips failing ones', async () => {
    const { service } = setup({
      'ger.1/scoreboard': () => loadFixture('espn/scoreboard-ger.1.json'),
      'eng.1/scoreboard': espnFinished,
    })
    const res = await service.live()
    expect(res.data.length).toBeGreaterThan(0)
    expect(res.data.every((m) => m.status === 'live' || m.status === 'halftime')).toBe(true)
    expect(res.data.every((m) => m.competitionId === 'ger.1')).toBe(true)
  })
})

describe('service.matches without a date (the ±48h window)', () => {
  // The eng.1 fixture's matches kicked off on 20 Sept between 13:00 and 15:30 UTC.
  it('merges each day of the window, de-duplicates and sorts by kickoff', async () => {
    const { service, calls } = setup({ 'eng.1/scoreboard?dates=': espnFinished }, '2026-09-21T12:00:00Z')
    const res = await service.matches('eng.1')
    expect(calls).toHaveLength(6) // 19–24 Sept, one request per day
    expect(new Set(res.data.map((m) => m.id)).size).toBe(res.data.length)
    expect(res.data.length).toBe(4)
    const kickoffs = res.data.map((m) => m.kickoff)
    expect([...kickoffs].sort()).toEqual(kickoffs)
  })

  it('drops matches that kicked off more than 48 hours ago', async () => {
    const { service } = setup({ 'eng.1/scoreboard?dates=': espnFinished }, '2026-09-23T00:00:00Z')
    expect((await service.matches('eng.1')).data).toHaveLength(0)
  })

  it('serves the days it has, marked stale, when some days fail', async () => {
    const { service } = setup(
      { 'eng.1/scoreboard?dates=20260920': espnFinished, 'eng.1/scoreboard?dates=20260921': espnDown },
      '2026-09-21T12:00:00Z',
    )
    const res = await service.matches('eng.1')
    expect(res.stale).toBe(true)
    expect(res.data.length).toBe(4)
  })
  it('ignores a "nearest" matchday that is more than 30 days away', async () => {
    const { service } = setup(
      { 'eng.1/scoreboard?dates=': () => ({ events: [] }), 'eng.1/scoreboard': espnFinished },
      '2026-11-30T12:00:00Z',
    )
    const res = await service.matches('eng.1')
    expect(res.note).toBeUndefined()
    expect(res.data).toHaveLength(0)
  })

  it('falls back to the nearest matchday, flagged, when the window is empty', async () => {
    const { service } = setup(
      { 'eng.1/scoreboard?dates=': () => ({ events: [] }), 'eng.1/scoreboard': espnFinished },
      '2026-09-28T12:00:00Z',
    )
    const res = await service.matches('eng.1')
    expect(res.note).toBe('nearest-matchday')
    expect(res.data).toHaveLength(4)
  })
})

describe('team countries', () => {
  it('tags domestic teams with the league country', async () => {
    const { service } = setup({ 'eng.1/scoreboard': espnFinished })
    const [m] = (await service.matches('eng.1', DAY)).data
    expect(m.home.country).toEqual({ code: 'gb-eng', name: 'England' })
  })

  it('tags national teams by name', async () => {
    const { service } = setup({ 'uefa.nations/scoreboard': () => loadFixture('espn/scoreboard-uefa.nations.json') })
    const res = await service.matches('uefa.nations', '20261009')
    const croatia = res.data.flatMap((m) => [m.home, m.away]).find((t) => t.name === 'Croatia')!
    expect(croatia.country?.code).toBe('191')
  })

  it("tags clubs in European competitions from their home league, else their stadium's country", async () => {
    const { service } = setup({
      'uefa.champions/scoreboard': () => loadFixture('espn/scoreboard-uefa.champions.json'),
      ...teamFixtureRoutes(),
      'uefa.champions/teams/': () => {
        throw new HttpError(404, 'team')
      },
    })
    const teams = (await service.matches('uefa.champions', '20261020')).data.flatMap((m) => [m.home, m.away])
    expect(teams.find((t) => t.name === 'Arsenal')?.country?.code).toBe('gb-eng')
    expect(teams.find((t) => t.name === 'Sporting CP')?.country?.code).toBe('620')
    // Sabah FK's ESPN profile only says "uefa", but they host in Baku.
    expect(teams.find((t) => t.name === 'Sabah FK')?.country?.code).toBe('031')
    // Slavia Prague are away and their profile only says "uefa": their schedule shows a home game in Prague.
    expect(teams.find((t) => t.name === 'Slavia Prague')?.country?.code).toBe('203')
  })
})

function teamFixtureRoutes(): Record<string, () => unknown> {
  const routes: Record<string, () => unknown> = {}
  for (const file of readdirSync(new URL('../fixtures/espn/', import.meta.url))) {
    const m = file.match(/^team-uefa\.champions-(\d+)\.json$/)
    if (m) routes[`uefa.champions/teams/${m[1]}`] = () => loadFixture(`espn/${file}`)
    const sched = file.match(/^schedule-uefa\.champions-(\d+)\.json$/)
    if (sched) routes[`uefa.champions/teams/${sched[1]}/schedule`] = () => loadFixture(`espn/${file}`)
  }
  return routes
}
