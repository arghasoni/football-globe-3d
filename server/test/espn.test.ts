import { describe, expect, it } from 'vitest'
import { parseScoreboard, parseStandings, parseSummary } from '../src/providers/espn.ts'
import { loadFixture } from './helpers.ts'

describe('parseScoreboard', () => {
  const matches = parseScoreboard(loadFixture('espn/scoreboard-eng.1-20260920.json'), 'eng.1')

  it('normalises a finished match', () => {
    const m = matches.find((x) => x.id === '401879276')!
    expect(m).toMatchObject({
      competitionId: 'eng.1',
      status: 'finished',
      clock: null,
      source: 'espn',
      venue: { name: 'Vitality Stadium', city: 'Bournemouth' },
    })
    expect(m.home).toMatchObject({ name: 'AFC Bournemouth', score: 0 })
    expect(m.away).toMatchObject({ name: 'Liverpool', score: 1 })
    expect(m.home.logo).toMatch(/^https:/)
    expect(new Date(m.kickoff).toISOString()).toBe(m.kickoff)
  })

  it('marks in-play matches live with the match clock', () => {
    const live = parseScoreboard(loadFixture('espn/scoreboard-ger.1.json'), 'ger.1').filter((m) => m.status === 'live')
    expect(live.length).toBeGreaterThan(0)
    expect(live[0].clock).toMatch(/^\d+'/)
  })

  it('leaves scores null before kickoff', () => {
    const all = parseScoreboard(loadFixture('espn/scoreboard-usa.1.json'), 'usa.1')
    const scheduled = all.find((m) => m.status === 'scheduled')
    if (scheduled) expect(scheduled.home.score).toBeNull()
  })
})

describe('parseSummary', () => {
  const d = parseSummary(loadFixture('espn/summary-eng.1-401879276.json'), 'eng.1', '401879276')

  it('carries the scoreline and status', () => {
    expect(d.status).toBe('finished')
    expect([d.home.score, d.away.score]).toEqual([0, 1])
    expect(d.home.name).toBe('AFC Bournemouth')
  })

  it('carries header info: round, referee, attendance and half-time score', () => {
    expect(d.info).toEqual({ referee: 'Michael Oliver', attendance: 11316, halftime: { home: 0, away: 0 } })
  })

  it('omits the half-time score while the first half is still on', () => {
    const live = parseSummary(loadFixture('espn/summary-ger.1-401884781.json'), 'ger.1', '401884781')
    expect(live.info.halftime).toBeUndefined()
    expect(live.info.referee).toBeUndefined()
  })

  it('reads the round and tie note for cup matches', () => {
    const raw = structuredClone(loadFixture('espn/summary-eng.1-401879276.json')) as {
      header: { competitions: { altGameNote?: string; notes?: { headline: string }[] }[] }
    }
    raw.header.competitions[0].altGameNote = 'UEFA Champions League, Round of 16'
    raw.header.competitions[0].notes = [{ headline: '2nd Leg - Liverpool win 3-2 on aggregate' }]
    const cup = parseSummary(raw, 'uefa.champions', '401879276')
    expect(cup.info).toMatchObject({ round: 'Round of 16', note: '2nd Leg - Liverpool win 3-2 on aggregate' })
  })

  it("lists each team's last five results, oldest first, scored from that team's side", () => {
    const g = parseSummary(loadFixture('espn/summary-ger.1-401884781.json'), 'ger.1', '401884781')
    expect(g.form.home.map((f) => f.result).join('')).toBe('WWWWW')
    expect(g.form.away.map((f) => f.result).join('')).toBe('WLWDW')
    expect(g.form.away[1]).toEqual({
      result: 'L',
      date: '2026-08-30T13:30:00.000Z',
      opponent: 'SC Freiburg',
      opponentLogo: expect.stringMatching(/^https:/),
      home: false,
      goalsFor: 1,
      goalsAgainst: 4,
      competition: 'Bundesliga',
    })
    expect(g.form.home[0]).toMatchObject({ opponent: 'HEBC Hamburg', goalsFor: 5, goalsAgainst: 0, home: false })
  })

  it('tells a second yellow apart from a straight red, and keeps goal assists', () => {
    const nl = parseSummary(loadFixture('espn/summary-uefa.nations-401861135.json'), 'uefa.nations', '401861135')
    expect(nl.events.find((e) => e.minute === "65'")).toMatchObject({ type: 'second-yellow', side: 'away' })
    expect(nl.events.find((e) => e.minute === "85'")).toMatchObject({ type: 'red', players: ['Sergiy Malyi'] })
    expect(nl.events.find((e) => e.minute === "22'")?.players).toEqual(['Petur Knudsen', 'Joannes Bjartalid'])
  })

  it('builds a timeline of meaningful events only', () => {
    const goal = d.events.find((e) => e.type === 'goal')!
    expect(goal).toMatchObject({ minute: "57'", side: 'away', players: ['Alexander Isak'] })
    const sub = d.events.find((e) => e.type === 'sub')!
    expect(sub.players).toHaveLength(2)
    expect(d.events.filter((e) => e.type === 'yellow')).toHaveLength(3)
    expect(d.events.some((e) => /delay/i.test(e.text))).toBe(false)
  })

  it('maps lineups with formation and starters', () => {
    expect(d.lineups.home?.formation).toBe('4-2-3-1')
    expect(d.lineups.home?.players.filter((p) => p.starter)).toHaveLength(11)
    expect(d.lineups.away?.players.filter((p) => p.starter)).toHaveLength(11)
    const keeper = d.lineups.home!.players.find((p) => p.formationPlace === 1)!
    expect(keeper).toMatchObject({ name: 'Djordje Petrovic', number: '1', starter: true })
  })

  it('pairs team stats home vs away', () => {
    const poss = d.stats.find((s) => s.key === 'possessionPct')!
    expect(poss.label).toBe('Possession')
    expect(poss.home).toBe('46.2')
    expect(Number(poss.home) + Number(poss.away)).toBeCloseTo(100, 0)
  })
})

describe('parseStandings', () => {
  it('produces a ranked table', () => {
    const [table] = parseStandings(loadFixture('espn/standings-eng.1.json'))
    expect(table.rows).toHaveLength(20)
    expect(table.rows[0]).toMatchObject({
      rank: 1,
      team: { name: 'Manchester City' },
      played: 5,
      won: 5,
      drawn: 0,
      lost: 0,
      goalsFor: 13,
      goalsAgainst: 5,
      points: 15,
    })
  })

  it('handles the Champions League league phase', () => {
    const groups = parseStandings(loadFixture('espn/standings-uefa.champions.json'))
    expect(groups[0].name).toBe('League Phase')
    expect(groups[0].rows).toHaveLength(36)
  })
})
