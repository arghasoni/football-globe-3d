interface Entry<T> {
  value: T
  storedAt: number
  expiresAt: number
}

export interface CacheResult<T> {
  value: T
  stale: boolean
  storedAt: number
}

/**
 * TTL cache that de-duplicates concurrent loads and, when a reload fails,
 * falls back to the last good value (flagged stale) instead of erroring.
 */
export class TtlCache {
  private entries = new Map<string, Entry<unknown>>()
  private inflight = new Map<string, Promise<CacheResult<unknown>>>()
  private failures = new Map<string, { error: unknown; until: number }>()

  constructor(
    private now: () => number,
    private maxEntries = 500,
    /** How long a failed load is remembered before the source is tried again. */
    private failureTtlMs = 30_000,
  ) {}

  get<T>(key: string, load: () => Promise<T>, ttlFor: (value: T) => number): Promise<CacheResult<T>> {
    const hit = this.entries.get(key) as Entry<T> | undefined
    if (hit && hit.expiresAt > this.now()) {
      return Promise.resolve({ value: hit.value, stale: false, storedAt: hit.storedAt })
    }
    const failure = this.failures.get(key)
    if (failure && failure.until > this.now()) {
      if (hit) return Promise.resolve({ value: hit.value, stale: true, storedAt: hit.storedAt })
      return Promise.reject(failure.error)
    }
    const pending = this.inflight.get(key) as Promise<CacheResult<T>> | undefined
    if (pending) return pending

    const run = (async (): Promise<CacheResult<T>> => {
      try {
        const value = await load()
        const storedAt = this.now()
        this.set(key, { value, storedAt, expiresAt: storedAt + ttlFor(value) })
        this.failures.delete(key)
        return { value, stale: false, storedAt }
      } catch (err) {
        this.failures.set(key, { error: err, until: this.now() + this.failureTtlMs })
        if (hit) return { value: hit.value, stale: true, storedAt: hit.storedAt }
        throw err
      } finally {
        this.inflight.delete(key)
      }
    })()
    this.inflight.set(key, run)
    return run
  }

  private set(key: string, entry: Entry<unknown>) {
    this.entries.delete(key)
    this.entries.set(key, entry)
    // Evict oldest insertions beyond the cap.
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!)
    }
  }
}
