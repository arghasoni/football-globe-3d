import { Hono } from 'hono'
import { NotFoundError, type Service } from './service.ts'

const DATE = /^\d{8}$/

export function createApp(service: Service) {
  const app = new Hono().basePath('/api')

  app.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json({ error: err.message }, 404)
    console.error(err)
    return c.json({ error: 'Upstream data source unavailable' }, 502)
  })

  app.get('/health', (c) => c.json({ ok: true }))

  app.get('/competitions', (c) => c.json(service.competitions()))

  app.get('/competitions/:id/matches', async (c) => {
    const date = c.req.query('date')
    if (date && !DATE.test(date)) return c.json({ error: 'date must be YYYYMMDD' }, 400)
    return c.json(await service.matches(c.req.param('id'), date))
  })

  app.get('/competitions/:id/matches/:matchId', async (c) =>
    c.json(await service.match(c.req.param('id'), c.req.param('matchId'))),
  )

  app.get('/competitions/:id/standings', async (c) => c.json(await service.standings(c.req.param('id'))))

  app.get('/live', async (c) => c.json(await service.live()))

  return app
}
