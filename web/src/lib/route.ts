import { useEffect, useState } from 'react'

// Hash routes, so a match centre can be linked to and reloaded without server routing.
export type Route = { kind: 'globe' } | { kind: 'match'; competitionId: string; matchId: string }

const MATCH = /^#\/match\/([^/]+)\/([^/]+)$/

export const matchHref = (competitionId: string, matchId: string) =>
  `#/match/${encodeURIComponent(competitionId)}/${encodeURIComponent(matchId)}`

export function parseRoute(hash: string): Route {
  const m = hash.match(MATCH)
  return m ? { kind: 'match', competitionId: decodeURIComponent(m[1]), matchId: decodeURIComponent(m[2]) } : { kind: 'globe' }
}

/** Whether the app itself navigated since the page loaded (so "back" stays inside the app). */
let navigatedInApp = false

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      navigatedInApp = true
      setRoute(parseRoute(window.location.hash))
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

/** Leave the match centre: step back if we came from the globe, else go to it. */
export function closeMatch() {
  if (navigatedInApp && window.history.length > 1) window.history.back()
  else window.location.hash = '#/'
}
