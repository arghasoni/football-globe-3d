import { describe, expect, it } from 'vitest'
import { matchHref, parseRoute } from './route'

describe('match centre deep links', () => {
  it('round-trips a match route', () => {
    expect(matchHref('eng.1', '401879276')).toBe('#/match/eng.1/401879276')
    expect(parseRoute('#/match/eng.1/401879276')).toEqual({
      kind: 'match',
      competitionId: 'eng.1',
      matchId: '401879276',
    })
  })

  it('handles competition ids with several dots', () => {
    expect(parseRoute(matchHref('fifa.worldq.uefa', '7'))).toMatchObject({ competitionId: 'fifa.worldq.uefa' })
  })

  it('treats anything else as the globe', () => {
    for (const hash of ['', '#', '#/', '#/match/eng.1', '#/match//1', '#/other/eng.1/1']) {
      expect(parseRoute(hash)).toEqual({ kind: 'globe' })
    }
  })
})
