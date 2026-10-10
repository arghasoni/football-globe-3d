import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The football-data token lives in server/.env, or web/.env where it was first put.
// It is never sent to the browser.
for (const rel of ['../.env', '../../web/.env']) {
  const path = fileURLToPath(new URL(rel, import.meta.url))
  if (existsSync(path)) {
    process.loadEnvFile(path)
    break
  }
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  footballDataToken: process.env.FOOTBALL_DATA_TOKEN ?? process.env.API_TOKEN ?? '',
  mock: process.argv.includes('--mock') || process.env.MOCK === '1',
}
