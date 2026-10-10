import { describe, expect, it } from 'vitest'
import type { StatLine } from '../../../shared/types'
import { barColors, statRows } from './stats'

const line = (key: string, home: string, away: string): StatLine => ({ key, label: key, home, away })

const stats: StatLine[] = [
  line('foulsCommitted', '8', '9'),
  line('possessionPct', '67.3', '32.7'),
  line('totalShots', '24', '15'),
  line('shotsOnTarget', '4', '4'),
  line('accuratePasses', '482', '174'),
  line('totalPasses', '559', '268'),
  line('passPct', '0.9', '0.6'),
  line('redCards', '0', '0'),
  line('somethingNew', '1', '2'),
]

describe('statRows', () => {
  const rows = statRows(stats)

  it('picks the headline stats in a fixed order with friendly labels', () => {
    expect(rows.map((r) => r.label)).toEqual([
      'Possession',
      'Shots',
      'Shots on target',
      'Fouls',
      'Red cards',
      'Passes',
      'Pass accuracy',
    ])
  })

  it('formats possession and works out pass accuracy from the counts', () => {
    expect(rows[0]).toMatchObject({ home: '67%', away: '33%', leader: 'home' })
    expect(rows[0].homeShare).toBeCloseTo(0.673, 3)
    expect(rows.find((r) => r.label === 'Pass accuracy')).toMatchObject({ home: '86%', away: '65%' })
  })

  it('marks level stats and splits empty ones evenly', () => {
    expect(rows.find((r) => r.label === 'Shots on target')).toMatchObject({ leader: null, homeShare: 0.5 })
    expect(rows.find((r) => r.label === 'Red cards')).toMatchObject({ home: '0', away: '0', homeShare: 0.5, leader: null })
  })

  it('returns nothing when the provider has no stats', () => {
    expect(statRows([])).toEqual([])
  })
})

describe('barColors', () => {
  it('uses the kit colours when they are distinct and visible', () => {
    expect(barColors('f42727', '1e90ff')).toEqual({ home: '#f42727', away: '#1e90ff' })
  })

  it('lifts colours that would vanish on the dark background', () => {
    expect(barColors('000000', 'f42727').home).toBe('#d9e4de')
  })

  it('separates clashing colours and fills in missing ones', () => {
    const clash = barColors('ffee00', 'fff000')
    expect(clash.home).toBe('#ffee00')
    expect(clash.away).not.toBe('#fff000')
    expect(barColors(undefined, undefined).home).toMatch(/^#/)
    expect(barColors(undefined, undefined).home).not.toBe(barColors(undefined, undefined).away)
  })
})
