// Records real provider responses into fixtures/ for parser tests and --mock mode.
// Usage: npm run record            (today's scoreboards + a known finished match)
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { env } from '../src/env.ts'
import { COMPETITIONS } from '../../shared/competitions.ts'
import { ESPN_HEADERS, espnUrl } from '../src/providers/espn.ts'
import { FOOTBALL_DATA_BASE } from '../src/providers/footballData.ts'
import { fetchJson } from '../src/http.ts'

const root = fileURLToPath(new URL('../fixtures/', import.meta.url))
mkdirSync(root + 'espn', { recursive: true })
mkdirSync(root + 'football-data', { recursive: true })

const save = (name: string, data: unknown) => {
  writeFileSync(root + name, JSON.stringify(data, null, 1))
  console.log('saved', name)
}

type Scoreboard = { events?: { id: string; status: { type: { state: string; completed: boolean } } }[] }

for (const c of COMPETITIONS) {
  const sb = await fetchJson<Scoreboard>(espnUrl.scoreboard(c.id), ESPN_HEADERS)
  save(`espn/scoreboard-${c.id}.json`, sb)
  // Keep any in-play match so mock mode has a live example.
  const live = sb.events?.find((e) => e.status.type.state === 'in')
  if (live) save(`espn/summary-${c.id}-${live.id}.json`, await fetchJson(espnUrl.summary(c.id, live.id), ESPN_HEADERS))
}

// A known finished Premier League matchday with full lineups, timeline and stats.
const past = await fetchJson<Scoreboard>(espnUrl.scoreboard('eng.1', '20260920'), ESPN_HEADERS)
save('espn/scoreboard-eng.1-20260920.json', past)
for (const e of (past.events ?? []).filter((e) => e.status.type.completed).slice(0, 2)) {
  save(`espn/summary-eng.1-${e.id}.json`, await fetchJson(espnUrl.summary('eng.1', e.id), ESPN_HEADERS))
}

// Club profiles (their home league tells us the club's country) for one European matchday.
type TeamRef = { competitions: { competitors: { team: { id: string } }[] }[] }
const cl = (await fetchJson<{ events?: TeamRef[] }>(espnUrl.scoreboard('uefa.champions'), ESPN_HEADERS)).events ?? []
for (const id of new Set(cl.flatMap((e) => e.competitions[0].competitors.map((c) => c.team.id)))) {
  save(`espn/team-uefa.champions-${id}.json`, await fetchJson(espnUrl.team('uefa.champions', id), ESPN_HEADERS))
  save(
    `espn/schedule-uefa.champions-${id}.json`,
    await fetchJson(espnUrl.teamSchedule('uefa.champions', id), ESPN_HEADERS),
  )
}

// Mock mode replays fixtures as if it were still this moment.
save('meta.json', { recordedAt: new Date().toISOString() })

for (const id of ['eng.1', 'uefa.champions']) {
  save(`espn/standings-${id}.json`, await fetchJson(espnUrl.standings(id), ESPN_HEADERS))
}

if (env.footballDataToken) {
  save(
    'football-data/PL-20260919.json',
    await fetchJson(`${FOOTBALL_DATA_BASE}/competitions/PL/matches?dateFrom=2026-09-19&dateTo=2026-09-21`, {
      'X-Auth-Token': env.footballDataToken,
    }),
  )
}
