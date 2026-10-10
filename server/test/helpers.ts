import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8'))
}
