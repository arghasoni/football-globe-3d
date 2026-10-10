import { useEffect, useState } from 'react'
import type { Envelope, StandingsGroup } from '../../../shared/types'

/** A competition's standings (null until loaded or if unavailable); refreshed each minute while a match is live. */
export function useStandings(competitionId: string, live: boolean): StandingsGroup[] | null {
  const [groups, setGroups] = useState<StandingsGroup[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/competitions/${encodeURIComponent(competitionId)}/standings`)
        if (!res.ok) return
        const envelope = (await res.json()) as Envelope<StandingsGroup[]>
        if (!cancelled) setGroups(envelope.data)
      } catch {
        // No table is fine; the tab just doesn't appear.
      }
    }
    void load()
    const timer = live ? window.setInterval(() => !document.hidden && load(), 60_000) : undefined
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [competitionId, live])

  return groups
}
