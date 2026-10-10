import { serve } from '@hono/node-server'
import { env } from './env.ts'
import { createApp } from './app.ts'
import { createService } from './service.ts'
import { fetchJson } from './http.ts'
import { mockFetchJson, mockNow } from './mockFetch.ts'

const service = createService({
  fetchJson: env.mock ? mockFetchJson : fetchJson,
  now: env.mock ? mockNow : () => new Date(),
  footballDataToken: env.footballDataToken,
  sourceOverride: env.mock ? 'mock' : undefined,
})

serve({ fetch: createApp(service).fetch, port: env.port, hostname: '127.0.0.1' }, (info) => {
  console.log(`FootGlobe API on http://127.0.0.1:${info.port}/api ${env.mock ? '(MOCK data)' : ''}`)
  if (!env.mock && !env.footballDataToken) console.warn('No football-data token found; ESPN only.')
  if (!env.mock) void service.warm().then(() => console.log('Cache warmed (European club countries).'))
})
