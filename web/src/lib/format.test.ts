import { describe, expect, it } from 'vitest'
import type { MatchStatus, MatchSummary } from '../../../shared/types'
import { dayLabel, groupMatches } from './format'

// Local-time dates keep these tests independent of the machine's time zone.
const now = new Date(2026, 9, 10, 15, 0) // Sat 10 Oct 2026, 15:00 local
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString()
const m = (id: string, status: MatchStatus, kickoff: string) => ({ id, status, kickoff }) as MatchSummary

describe('dayLabel', () => {
  it('names nearby days and formats the rest', () => {
    expect(dayLabel(new Date(2026, 9, 10, 20), now)).toBe('Today')
    expect(dayLabel(new Date(2026, 9, 11, 1), now)).toBe('Tomorrow')
    expect(dayLabel(new Date(2026, 9, 9, 23), now)).toBe('Yesterday')
    expect(dayLabel(new Date(2026, 9, 12, 12), now)).toMatch(/Mon.*12.*Oct/)
  })
})

describe('groupMatches', () => {
  const groups = groupMatches(
    [
      m('done-old', 'finished', at(9, 18)),
      m('done-new', 'finished', at(10, 12)),
      m('live', 'live', at(10, 14)),
      m('ht', 'halftime', at(10, 14)),
      m('later', 'scheduled', at(10, 20)),
      m('tomorrow', 'scheduled', at(11, 16)),
      m('pp', 'postponed', at(11, 18)),
    ],
    now,
  )

  it('puts in-play matches first', () => {
    expect(groups.live.map((x) => x.id)).toEqual(['live', 'ht'])
  })

  it('groups upcoming fixtures by day, soonest first, including postponed ones', () => {
    expect(groups.upcoming.map((g) => g.label)).toEqual(['Today', 'Tomorrow'])
    expect(groups.upcoming[1].matches.map((x) => x.id)).toEqual(['tomorrow', 'pp'])
  })

  it('groups results by day, most recent first', () => {
    expect(groups.results.map((g) => g.label)).toEqual(['Today', 'Yesterday'])
    expect(groups.results[0].matches.map((x) => x.id)).toEqual(['done-new'])
  })
})
