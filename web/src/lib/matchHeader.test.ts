import { describe, expect, it } from 'vitest'
import type { MatchEvent, MatchStatus } from '../../../shared/types'
import { headerMarks, kickoffCountdown, statusText } from './matchHeader'

const ev = (type: MatchEvent['type'], side: MatchEvent['side'], minute: string, player = 'P'): MatchEvent => ({
  type,
  side,
  minute,
  text: '',
  players: [player],
})

describe('headerMarks', () => {
  it('lists goals and red cards per side, in minute order, tagging penalties and own goals', () => {
    const marks = headerMarks([
      ev('yellow', 'home', "10'"),
      ev('goal', 'away', "57'", 'Alexander Isak'),
      ev('penalty-goal', 'home', "23'", 'Bruno'),
      ev('own-goal', 'home', "80'", 'Van Dijk'),
      ev('red', 'away', "88'", 'Konaté'),
      ev('sub', 'home', "60'"),
      ev('period', null, "45'"),
    ])
    expect(marks.home).toEqual([
      { kind: 'goal', player: 'Bruno', minute: "23'", tag: 'pen' },
      { kind: 'goal', player: 'Van Dijk', minute: "80'", tag: 'OG' },
    ])
    expect(marks.away).toEqual([
      { kind: 'goal', player: 'Alexander Isak', minute: "57'" },
      { kind: 'red', player: 'Konaté', minute: "88'" },
    ])
  })

  it('counts a second yellow as a red', () => {
    expect(headerMarks([ev('second-yellow', 'home', "70'")]).home[0].kind).toBe('red')
  })
})

describe('statusText', () => {
  const s = (status: MatchStatus, clock: string | null = null) => statusText({ status, clock })
  it('describes each match state', () => {
    expect(s('live', "67'")).toBe("67'")
    expect(s('live')).toBe('Live')
    expect(s('halftime', 'HT')).toBe('Half-time')
    expect(s('finished')).toBe('Full-time')
    expect(s('postponed')).toBe('Postponed')
    expect(s('cancelled')).toBe('Cancelled')
    expect(s('scheduled')).toBe('Upcoming')
  })
})

describe('kickoffCountdown', () => {
  const now = new Date('2026-10-10T12:00:00Z')
  const at = (iso: string) => kickoffCountdown(iso, now)
  it('counts down to kick-off', () => {
    expect(at('2026-10-10T12:40:00Z')).toBe('Kick-off in 40m')
    expect(at('2026-10-10T15:05:00Z')).toBe('Kick-off in 3h 5m')
    expect(at('2026-10-12T13:00:00Z')).toBe('Kick-off in 2 days')
    expect(at('2026-10-10T11:59:00Z')).toBe('Kick-off soon')
  })
})
