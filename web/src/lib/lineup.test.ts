import { describe, expect, it } from 'vitest'
import type { Lineup, LineupPlayer, MatchEvent } from '../../../shared/types'
import { benchOrder, pitchRows, playerMarks, shortName } from './lineup'

const p = (formationPlace: number, position: string, name = position): LineupPlayer => ({
  name,
  position,
  formationPlace,
  starter: true,
  subbedIn: false,
  subbedOut: false,
})

const lineup = (formation: string, players: string): Lineup => ({
  formation,
  players: players.split(' ').map((s) => {
    const [place, pos] = s.split(':')
    return p(Number(place), pos)
  }),
})

const rows = (l: Lineup) => pitchRows(l).map((r) => r.map((x) => x.position).join(' '))

// Real ESPN starting XIs (formationPlace:position).
describe('pitchRows', () => {
  it('lays out a 4-2-3-1, where ESPN labels the holding pair LM/RM', () => {
    const l = lineup('4-2-3-1', '1:G 2:RB 3:LB 4:LM 5:CD-R 6:CD-L 7:AM-R 8:RM 9:F 10:AM 11:AM-L')
    expect(rows(l)).toEqual(['G', 'LB CD-L CD-R RB', 'LM RM', 'AM-L AM AM-R', 'F'])
  })

  it('separates the two No. 10s from the striker in a 3-4-2-1', () => {
    const l = lineup('3-4-2-1', '1:G 2:RM 3:LM 4:CD-L 5:CD 6:CD-R 7:CM-R 8:CM-L 9:F 10:CF-R 11:CF-L')
    expect(rows(l)).toEqual(['G', 'CD-L CD CD-R', 'LM CM-L CM-R RM', 'CF-L CF-R', 'F'])
  })

  it('handles back fives and front threes', () => {
    expect(rows(lineup('5-3-2', '1:G 2:RB 3:LB 4:CD-L 5:CD 6:CD-R 7:CM-R 8:CM 9:CF-L 10:CF-R 11:CM-L'))).toEqual([
      'G',
      'LB CD-L CD CD-R RB',
      'CM-L CM CM-R',
      'CF-L CF-R',
    ])
    expect(rows(lineup('4-3-3', '1:G 2:RB 3:LB 4:CM 5:CD-R 6:CD-L 7:RM 8:LM 9:F 10:RF 11:LF'))).toEqual([
      'G',
      'LB CD-L CD-R RB',
      'LM CM RM',
      'LF F RF',
    ])
  })

  it('falls back to lines by position when the formation is missing or does not add up', () => {
    const l = lineup('', '1:G 2:RB 3:LB 5:CD-R 6:CD-L 7:RM 4:CM-R 8:CM-L 11:LM 9:CF-L 10:CF-R')
    expect(rows(l)).toEqual(['G', 'LB CD-L CD-R RB', 'LM CM-L CM-R RM', 'CF-L CF-R'])
  })

  it('ignores substitutes', () => {
    const l = lineup('4-4-2', '1:G 2:RB 3:LB 4:CM-R 5:CD-R 6:CD-L 7:RM 8:CM-L 9:CF-L 10:CF-R 11:LM')
    l.players.push({ ...p(0, 'G', 'Bench keeper'), starter: false })
    expect(pitchRows(l).flat()).toHaveLength(11)
  })
})

describe('playerMarks', () => {
  const ev = (type: MatchEvent['type'], minute: string, players: string[]): MatchEvent => ({
    type,
    minute,
    players,
    side: 'home',
    text: '',
  })
  const marks = playerMarks([
    ev('goal', "10'", ['Haaland', 'De Bruyne']),
    ev('penalty-goal', "50'", ['Haaland']),
    ev('own-goal', "60'", ['Unlucky']),
    ev('yellow', "20'", ['Rodri']),
    ev('second-yellow', "70'", ['Rodri']),
    ev('sub', "75'", ['Foden', 'De Bruyne']),
  ])

  it('counts goals, cards and substitutions per player', () => {
    expect(marks.get('Haaland')).toMatchObject({ goals: 2 })
    expect(marks.get('Unlucky')).toMatchObject({ ownGoals: 1 })
    expect(marks.get('Rodri')).toMatchObject({ card: 'red' })
    expect(marks.get('Foden')).toMatchObject({ subOn: "75'" })
    expect(marks.get('De Bruyne')).toMatchObject({ subOff: "75'", goals: 0 })
  })
})

describe('benchOrder', () => {
  it('lists substitutes who came on first, in the order they came on', () => {
    const bench = [
      { ...p(0, 'G', 'Keeper'), starter: false },
      { ...p(0, 'M', 'Late'), starter: false, subbedIn: true },
      { ...p(0, 'F', 'Early'), starter: false, subbedIn: true },
    ]
    const marks = new Map([
      ['Late', { goals: 0, ownGoals: 0, subOn: "80'" }],
      ['Early', { goals: 0, ownGoals: 0, subOn: "60'" }],
    ])
    expect(benchOrder(bench, marks).map((x) => x.name)).toEqual(['Early', 'Late', 'Keeper'])
  })
})

describe('shortName', () => {
  it('uses the surname, keeping particles and suffixes readable', () => {
    expect(shortName('Erling Haaland')).toBe('Haaland')
    expect(shortName('Virgil van Dijk')).toBe('van Dijk')
    expect(shortName('Vinícius Júnior')).toBe('Vinícius Júnior')
    expect(shortName('Rodri')).toBe('Rodri')
  })
})
