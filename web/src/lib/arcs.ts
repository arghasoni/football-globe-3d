import { COUNTRY_POINTS } from '../../../shared/countryPoints'
import type { MatchStatus, MatchSummary } from '../../../shared/types'

/**
 * A "place" is what the globe can highlight: the 110m polygon id when the country is drawn
 * (England, Scotland… share the UK polygon '826'), otherwise the country code itself.
 */
export function placeOf(code: string): string {
  return COUNTRY_POINTS[code]?.polygon ?? code
}

export interface MatchArc {
  id: string
  status: MatchStatus
  startLat: number
  startLng: number
  endLat: number
  endLng: number
}

/** One arc per match, from the away team's country to the home team's (where the game is played). */
export function toArcs(matches: MatchSummary[]): MatchArc[] {
  const arcs: MatchArc[] = []
  for (const m of matches) {
    const from = m.away.country && COUNTRY_POINTS[m.away.country.code]
    const to = m.home.country && COUNTRY_POINTS[m.home.country.code]
    if (!from || !to || (from.lat === to.lat && from.lng === to.lng)) continue
    arcs.push({ id: m.id, status: m.status, startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng })
  }
  return arcs
}

export interface FocusPlace {
  id: string
  name: string
  lat: number
  lng: number
}

/** Every place with a team in these matches, once, with a point to centre the camera on. */
export function focusPlaces(matches: MatchSummary[]): FocusPlace[] {
  const places = new Map<string, FocusPlace>()
  for (const m of matches) {
    for (const side of [m.home, m.away]) {
      const code = side.country?.code
      const point = code ? COUNTRY_POINTS[code] : undefined
      if (!code || !point) continue
      const id = placeOf(code)
      if (!places.has(id)) places.set(id, { id, name: point.name, lat: point.lat, lng: point.lng })
    }
  }
  return [...places.values()]
}

export function matchesInPlace(matches: MatchSummary[], place: string): MatchSummary[] {
  return matches.filter((m) =>
    [m.home, m.away].some((s) => s.country && placeOf(s.country.code) === place),
  )
}
