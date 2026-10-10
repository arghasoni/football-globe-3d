import { describe, expect, it } from 'vitest'
import type { MatchSummary } from '../../../shared/types'
import { liveCountByCountry, toBeacons } from './beacons'

const match = (id: string, competitionId: string): MatchSummary =>
  ({ id, competitionId, status: 'live' }) as MatchSummary

describe('toBeacons', () => {
  const live = [match('1', 'esp.1'), match('2', 'esp.2'), match('3', 'uefa.champions')]

  it('places one beacon per domestic live match near its country', () => {
    const beacons = toBeacons(live)
    expect(beacons).toHaveLength(2)
    for (const b of beacons) {
      expect(Math.abs(b.lat - 40.2)).toBeLessThan(4)
      expect(Math.abs(b.lng - -3.6)).toBeLessThan(4)
    }
  })

  it('spreads matches apart deterministically', () => {
    const [a, b] = toBeacons(live)
    expect([a.lat, a.lng]).not.toEqual([b.lat, b.lng])
    expect(toBeacons(live)).toEqual(toBeacons(live))
  })
})

describe('liveCountByCountry', () => {
  it('counts domestic live matches per country', () => {
    const counts = liveCountByCountry([match('1', 'esp.1'), match('2', 'esp.2'), match('3', 'ger.1')])
    expect(counts.get('724')).toBe(2)
    expect(counts.get('276')).toBe(1)
  })
})
