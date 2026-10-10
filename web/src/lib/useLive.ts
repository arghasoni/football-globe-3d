import { useEffect, useState } from 'react'
import type { Envelope, MatchSummary } from '../../../shared/types'

const POLL_MS = 30_000

export type LiveStatus = 'loading' | 'ok' | 'stale' | 'offline'

/** Polls /api/live while the tab is visible. Keeps the last good list if a poll fails. */
export function useLive(): { matches: MatchSummary[]; status: LiveStatus } {
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [status, setStatus] = useState<LiveStatus>('loading')

  useEffect(() => {
    let timer: number | undefined
    let cancelled = false

    const poll = async () => {
      window.clearTimeout(timer)
      try {
        const res = await fetch('/api/live')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = (await res.json()) as Envelope<MatchSummary[]>
        if (cancelled) return
        setMatches(body.data)
        setStatus(body.stale ? 'stale' : 'ok')
      } catch {
        if (!cancelled) setStatus('offline')
      }
      if (!cancelled && !document.hidden) timer = window.setTimeout(poll, POLL_MS)
    }

    const onVisibility = () => {
      if (!document.hidden) poll()
      else window.clearTimeout(timer)
    }

    poll()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return { matches, status }
}
