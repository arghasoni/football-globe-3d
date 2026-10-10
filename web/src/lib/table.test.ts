import { describe, expect, it } from 'vitest'
import type { StandingsGroup } from '../../../shared/types'
import { tablesFor } from './table'

const group = (name: string, ids: string[]): StandingsGroup => ({
  name,
  rows: ids.map((id, i) => ({
    rank: i + 1,
    team: { id, name: id, shortName: id, abbreviation: id },
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  })),
})

describe('tablesFor', () => {
  it('shows a single league table untitled', () => {
    const league = [group('2026-27 German Bundesliga', ['124', '137', '132'])]
    expect(tablesFor(league, '124', '137')).toEqual({ groups: league, titled: false })
  })

  it("picks the match's group out of many, titled", () => {
    const groups = [group('Group A1', ['1', '2']), group('Group C3', ['468', '479']), group('Group D1', ['9'])]
    expect(tablesFor(groups, '479', '468')).toEqual({ groups: [groups[1]], titled: true })
  })

  it('shows both conferences when the teams are in different ones', () => {
    const groups = [group('Eastern Conference', ['a', 'b']), group('Western Conference', ['c', 'd'])]
    expect(tablesFor(groups, 'a', 'd').groups).toHaveLength(2)
  })

  it('shows nothing when neither team is in the standings (e.g. a friendly)', () => {
    expect(tablesFor([group('Table', ['x'])], 'a', 'b').groups).toEqual([])
    expect(tablesFor([], 'a', 'b').groups).toEqual([])
  })
})
