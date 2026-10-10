import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { HttpError } from './http.ts'

const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url))

/** Fixture names to try for a provider URL, best first (see scripts/record-fixtures.ts). */
function fixturesFor(url: string): string[] {
  const u = new URL(url)
  const schedule = u.pathname.match(/\/soccer\/([^/]+)\/teams\/(\d+)\/schedule$/)
  if (schedule) return [`espn/schedule-${schedule[1]}-${schedule[2]}.json`]
  const team = u.pathname.match(/\/soccer\/([^/]+)\/teams\/(\d+)$/)
  if (team) return [`espn/team-${team[1]}-${team[2]}.json`]
  const espn = u.pathname.match(/\/soccer\/([^/]+)\/(scoreboard|summary|standings)$/)
  if (!espn) return []
  const [, league, kind] = espn
  if (kind === 'summary') return [`espn/summary-${league}-${u.searchParams.get('event')}.json`]
  if (kind === 'standings') return [`espn/standings-${league}.json`]
  // A day that wasn't recorded falls back to the recorded matchday; the window de-duplicates.
  const date = u.searchParams.get('dates')
  return date ? [`espn/scoreboard-${league}-${date}.json`, `espn/scoreboard-${league}.json`] : [`espn/scoreboard-${league}.json`]
}

export async function mockFetchJson(url: string): Promise<unknown> {
  const name = fixturesFor(url).find((n) => existsSync(FIXTURES + n))
  if (!name) throw new HttpError(404, `no fixture for ${url}`)
  return JSON.parse(readFileSync(FIXTURES + name, 'utf8'))
}

/** When the fixtures were recorded; mock mode pretends it is still that moment. */
export function mockNow(): Date {
  const meta = FIXTURES + 'meta.json'
  return existsSync(meta) ? new Date(JSON.parse(readFileSync(meta, 'utf8')).recordedAt) : new Date()
}
