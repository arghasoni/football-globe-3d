import { useEffect, useState } from 'react'
import type { Envelope, MatchSummary } from '../../../shared/types'

export interface CompetitionMatches {
  status: 'loading' | 'ok' | 'error'
  envelope?: Envelope<MatchSummary[]>
}

const LIVE_POLL_MS = 30_000
const QUIET_POLL_MS = 120_000

/**
 * The ±48h match list for each competition id, kept fresh while the tab is visible:
 * every 30s for competitions with a live match, every 2 min otherwise.
 */
export function useCompetitionMatches(ids: string[]): Record<string, CompetitionMatches> {
  const [state, setState] = useState<Record<string, CompetitionMatches>>({})
  const key = ids.join(',')

  useEffect(() => {
    const list = key ? key.split(',') : []
    const timers = new Map<string, number>()
    let cancelled = false
    setState(Object.fromEntries(list.map((id) => [id, { status: 'loading' } as CompetitionMatches])))

    const load = async (id: string) => {
      window.clearTimeout(timers.get(id))
      let live = false
      try {
        const res = await fetch(`/api/competitions/${encodeURIComponent(id)}/matches`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const envelope = (await res.json()) as Envelope<MatchSummary[]>
        live = envelope.data.some((m) => m.status === 'live' || m.status === 'halftime')
        if (!cancelled) setState((s) => ({ ...s, [id]: { status: 'ok', envelope } }))
      } catch {
        // Keep showing the last good list, if any.
        if (!cancelled) setState((s) => ({ ...s, [id]: { ...s[id], status: s[id]?.envelope ? 'ok' : 'error' } }))
      }
      if (!cancelled && !document.hidden) timers.set(id, window.setTimeout(() => load(id), live ? LIVE_POLL_MS : QUIET_POLL_MS))
    }

    const onVisibility = () => {
      if (document.hidden) timers.forEach((t) => window.clearTimeout(t))
      else list.forEach(load)
    }

    list.forEach(load)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [key])

  return state
}
