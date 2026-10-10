import { describe, expect, it } from 'vitest'
import { TtlCache } from '../src/cache.ts'

describe('TtlCache', () => {
  it('remembers a failure briefly instead of retrying on every call', async () => {
    let now = 0
    const cache = new TtlCache(() => now, 500, 30_000)
    let calls = 0
    const failing = async () => {
      calls++
      throw new Error('down')
    }
    await expect(cache.get('k', failing, () => 1000)).rejects.toThrow('down')
    await expect(cache.get('k', failing, () => 1000)).rejects.toThrow('down')
    expect(calls).toBe(1)

    now += 31_000
    await expect(cache.get('k', failing, () => 1000)).rejects.toThrow('down')
    expect(calls).toBe(2)
  })

  it('still serves stale data during a failure window', async () => {
    let now = 0
    const cache = new TtlCache(() => now, 500, 30_000)
    await cache.get('k', async () => 'good', () => 1000)
    now += 2000
    const failing = async () => {
      throw new Error('down')
    }
    expect(await cache.get('k', failing, () => 1000)).toMatchObject({ value: 'good', stale: true })
    expect(await cache.get('k', failing, () => 1000)).toMatchObject({ value: 'good', stale: true })
  })
})
