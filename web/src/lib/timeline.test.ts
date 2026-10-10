import { describe, expect, it } from 'vitest'
import type { MatchEvent, MatchStatus } from '../../../shared/types'
import { buildTimeline } from './timeline'

const period = (text: string, minute = ''): MatchEvent => ({ type: 'period', side: null, minute, text, players: [] })
const ev = (type: MatchEvent['type'], side: 'home' | 'away', minute: string, text = ''): MatchEvent => ({
  type,
  side,
  minute,
  text,
  players: ['P'],
})

// Kazakhstan 2–2 Faroe Islands, in ESPN's (chronological) order.
const events: MatchEvent[] = [
  period('Kickoff'),
  ev('goal', 'away', "22'", 'Goal! Kazakhstan 0, Faroe Islands 1. Petur Knudsen header.'),
  period('Halftime', "45'+4'"),
  ev('sub', 'home', "45'"),
  period('Start 2nd Half', "45'"),
  ev('goal', 'away', "63'", 'Goal! Kazakhstan 0, Faroe Islands 2. Turi shot.'),
  ev('goal', 'home', "68'", 'Goal! Kazakhstan 1, Faroe Islands 2. Maliy shot.'),
  ev('goal', 'home', "76'", 'Goal! Kazakhstan 2, Faroe Islands 2. Alip header.'),
  period('End Regular Time', "90'+5'"),
]

const build = (status: MatchStatus, list = events) => buildTimeline(list, status)

describe('buildTimeline', () => {
  it('lists newest first with period dividers carrying the score', () => {
    const items = build('finished')
    expect(items[0]).toEqual({ kind: 'divider', label: 'Full-time', score: '2–2' })
    expect(items.at(-1)).toEqual({ kind: 'divider', label: 'Kick-off' })
    expect(items).toContainEqual({ kind: 'divider', label: 'Half-time', score: '0–1' })
  })

  it('keeps ESPN order (half-time subs stay after the half-time divider) and drops "Start 2nd Half"', () => {
    const labels = build('finished').map((i) => (i.kind === 'divider' ? i.label : i.event.minute))
    expect(labels).toEqual(['Full-time', "76'", "68'", "63'", "45'", 'Half-time', "22'", 'Kick-off'])
  })

  it('shows the running score after each goal', () => {
    const goals = build('finished').flatMap((i) => (i.kind === 'event' && i.event.type === 'goal' ? [i.score] : []))
    expect(goals).toEqual(['2–2', '1–2', '0–2', '0–1'])
  })

  it('counts goals when the text has no score (an own goal counts for the side it is tagged with)', () => {
    const plain = [ev('goal', 'home', "10'"), ev('own-goal', 'home', "20'"), ev('penalty-goal', 'away', "30'")]
    const scores = build('live', plain).map((i) => (i.kind === 'event' ? i.score : null))
    expect(scores).toEqual(['2–1', '2–0', '1–0'])
  })

  it('calls the 90-minute mark "End of 90 minutes" while extra time is still to come', () => {
    expect(build('live')[0]).toEqual({ kind: 'divider', label: 'End of 90 minutes', score: '2–2' })
  })
})
