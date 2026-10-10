import { describe, expect, it } from 'vitest'
import { parseMatches } from '../src/providers/footballData.ts'
import { loadFixture } from './helpers.ts'

describe('football-data parseMatches', () => {
  const matches = parseMatches(loadFixture('football-data/PL-20260919.json'), 'eng.1')

  it('normalises scores-only matches', () => {
    expect(matches).toHaveLength(9)
    const spurs = matches.find((m) => m.home.shortName === 'Tottenham')!
    expect(spurs).toMatchObject({
      competitionId: 'eng.1',
      status: 'finished',
      source: 'football-data',
      home: { score: 2, abbreviation: 'TOT' },
      away: { score: 3 },
    })
    expect(spurs.home.logo).toMatch(/^https:/)
  })
})
