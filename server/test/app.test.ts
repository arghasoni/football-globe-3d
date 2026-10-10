import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.ts'
import { createService } from '../src/service.ts'
import { mockFetchJson } from '../src/mockFetch.ts'

const app = createApp(
  createService({ fetchJson: mockFetchJson, now: () => new Date(), footballDataToken: '', sourceOverride: 'mock' }),
)

describe('HTTP API (mock data)', () => {
  it('lists competitions including Champions League and Nations League', async () => {
    const res = await app.request('/api/competitions')
    const body = (await res.json()) as { id: string }[]
    expect(body.map((c) => c.id)).toEqual(expect.arrayContaining(['uefa.champions', 'uefa.nations', 'ind.1']))
  })

  it('serves a dated matchday and a match centre', async () => {
    const list = (await (await app.request('/api/competitions/eng.1/matches?date=20260920')).json()) as {
      data: { id: string }[]
      source: string
    }
    expect(list.source).toBe('mock')
    expect(list.data.length).toBeGreaterThan(0)
    const detail = await app.request('/api/competitions/eng.1/matches/401879276')
    expect(detail.status).toBe(200)
  })

  it('validates input and maps errors', async () => {
    expect((await app.request('/api/competitions/eng.1/matches?date=yesterday')).status).toBe(400)
    expect((await app.request('/api/competitions/nope/matches')).status).toBe(404)
    expect((await app.request('/api/competitions/eng.1/matches/999')).status).toBe(502)
  })
})
