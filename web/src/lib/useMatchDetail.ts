import { useEffect, useState } from 'react'
import type { Envelope, MatchDetail } from '../../../shared/types'

export interface MatchDetailState {
  status: 'loading' | 'ok' | 'not-found' | 'error'
  envelope?: Envelope<MatchDetail>
}

/** How long until the next refresh, or null to stop (the match is over). */
function nextPollMs(d: MatchDetail, now: number): number | null {
  if (d.status === 'live' || d.status === 'halftime') return 20_000
  if (d.status === 'scheduled') return Date.parse(d.kickoff) - now < 2 * 3_600_000 ? 60_000 : 300_000
  return null
}

/** One match's detail, refreshed while it is live and the tab is visible. Key the caller by match id. */
export function useMatchDetail(competitionId: string, matchId: string): MatchDetailState {
  const [state, setState] = useState<MatchDetailState>({ status: 'loading' })

  useEffect(() => {
    let timer: number | undefined
    let cancelled = false
    let last: MatchDetail | undefined

    const schedule = () => {
      const wait = last ? nextPollMs(last, Date.now()) : 15_000
      if (!cancelled && !document.hidden && wait !== null) timer = window.setTimeout(load, wait)
    }

    const load = async () => {
      window.clearTimeout(timer)
      try {
        const res = await fetch(`/api/competitions/${encodeURIComponent(competitionId)}/matches/${encodeURIComponent(matchId)}`)
        if (res.status === 404) {
          if (!cancelled) setState({ status: 'not-found' })
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const envelope = (await res.json()) as Envelope<MatchDetail>
        last = envelope.data
        if (!cancelled) setState({ status: 'ok', envelope })
      } catch {
        // Keep showing the last good detail, if any.
        if (!cancelled) setState((s) => (s.envelope ? { ...s, status: 'ok' } : { status: 'error' }))
      }
      schedule()
    }

    const onVisibility = () => {
      if (document.hidden) window.clearTimeout(timer)
      else void load()
    }

    void load()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [competitionId, matchId])

  return state
}
