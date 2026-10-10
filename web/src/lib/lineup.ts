import type { Lineup, LineupPlayer, MatchDetail, MatchEvent } from '../../../shared/types'
import { minuteValue } from './matchHeader'

/** Whether either team's starting XI is known. */
export const hasLineups = (d: Pick<MatchDetail, 'lineups'>) =>
  [d.lineups.home, d.lineups.away].some((l) => l?.players.some((p) => p.starter))

/** How far up the pitch a position label sits (ESPN labels, e.g. 'CD-L', 'AM', 'CF-R'). */
function depth(position = ''): number {
  const p = position.toUpperCase()
  if (p === 'G' || p === 'GK') return 0
  if (/^(CD|CB|RB|LB|D)(-|$)/.test(p)) return 1
  if (/^(RWB|LWB|WB)$/.test(p)) return 1.5
  if (/^(DM|CDM)(-|$)/.test(p)) return 2
  if (/^(AM|CAM)(-|$)/.test(p)) return 4
  if (/^(LF|RF|LW|RW)$/.test(p) || /^CF-/.test(p)) return 5
  if (/^(F|CF|ST|S)$/.test(p)) return 6
  return 3 // CM, M, LM, RM and anything unknown
}

/** Left (negative) to right (positive), from the team's own point of view. */
function lateral(position = ''): number {
  const p = position.toUpperCase()
  if (p.endsWith('-L')) return -1
  if (p.endsWith('-R')) return 1
  if (/^L(B|M|F|W|WB)$/.test(p)) return -2
  if (/^R(B|M|F|W|WB)$/.test(p)) return 2
  return 0
}

const byDepth = (a: LineupPlayer, b: LineupPlayer) =>
  depth(a.position) - depth(b.position) || (a.formationPlace ?? 99) - (b.formationPlace ?? 99)
const byLateral = (a: LineupPlayer, b: LineupPlayer) =>
  lateral(a.position) - lateral(b.position) || (a.formationPlace ?? 99) - (b.formationPlace ?? 99)

/**
 * Starters in lines from goalkeeper to attack, each line left to right (team's view).
 * Players are ranked by how advanced their position is, then cut into the formation's
 * lines; ESPN's position labels alone are not reliable enough to name the lines.
 */
export function pitchRows(lineup: Lineup): LineupPlayer[][] {
  const starters = lineup.players.filter((p) => p.starter).sort(byDepth)
  const [keeper, ...outfield] = starters
  if (!keeper) return []
  const lines = (lineup.formation ?? '').split('-').map(Number)
  const valid = lines.length > 1 && lines.every((n) => n > 0) && lines.reduce((a, b) => a + b, 0) === outfield.length

  const rows: LineupPlayer[][] = []
  if (valid) {
    let i = 0
    for (const n of lines) {
      rows.push(outfield.slice(i, i + n))
      i += n
    }
  } else {
    // No usable formation: one line per position depth.
    for (const p of outfield) {
      const last = rows.at(-1)
      if (last && depth(last[0].position) === depth(p.position)) last.push(p)
      else rows.push([p])
    }
  }
  return [[keeper], ...rows.map((r) => r.sort(byLateral))]
}

export interface PlayerMarks {
  goals: number
  ownGoals: number
  card?: 'yellow' | 'red'
  subOn?: string
  subOff?: string
}

/** What each player did, keyed by name, for the badges on the pitch and bench. */
export function playerMarks(events: MatchEvent[]): Map<string, PlayerMarks> {
  const marks = new Map<string, PlayerMarks>()
  const of = (name: string) => {
    if (!marks.has(name)) marks.set(name, { goals: 0, ownGoals: 0 })
    return marks.get(name)!
  }
  for (const e of events) {
    const [first, second] = e.players
    if (!first) continue
    if (e.type === 'goal' || e.type === 'penalty-goal') of(first).goals++
    else if (e.type === 'own-goal') of(first).ownGoals++
    else if (e.type === 'yellow') of(first).card ??= 'yellow'
    else if (e.type === 'red' || e.type === 'second-yellow') of(first).card = 'red'
    else if (e.type === 'sub') {
      of(first).subOn = e.minute
      if (second) of(second).subOff = e.minute
    }
  }
  return marks
}

/** Substitutes who came on first (in the order they did), then the unused ones. */
export function benchOrder(bench: LineupPlayer[], marks: Map<string, PlayerMarks>): LineupPlayer[] {
  const on = (p: LineupPlayer) => marks.get(p.name)?.subOn
  const used = bench.filter((p) => p.subbedIn || on(p))
  used.sort((a, b) => minuteValue(on(a) ?? '999') - minuteValue(on(b) ?? '999'))
  return [...used, ...bench.filter((p) => !used.includes(p))]
}

const PARTICLES = new Set(['van', 'von', 'de', 'da', 'di', 'del', 'der', 'den', 'le', 'la', 'dos', 'das', 'do', 'ten', 'ter', 'mac'])
const SUFFIXES = new Set(['júnior', 'junior', 'jr', 'jr.', 'filho', 'neto', 'ii', 'iii'])

/** A name that fits under a shirt: surname with its particles, e.g. "van Dijk". */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  let start = parts.length - 1
  if (SUFFIXES.has(parts[start].toLowerCase())) start--
  while (start > 0 && PARTICLES.has(parts[start - 1].toLowerCase())) start--
  return start === 0 ? name : parts.slice(start).join(' ')
}
