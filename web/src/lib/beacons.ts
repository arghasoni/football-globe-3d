import { COMPETITION_BY_ID } from '../../../shared/competitions'
import type { MatchSummary } from '../../../shared/types'
import { COUNTRY_BY_ID } from '../data/countries'

export interface Beacon {
  id: string
  lat: number
  lng: number
}

/** Stable pseudo-random number in [-1, 1) from a string. */
function hashUnit(s: string, salt: number): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) / 2 ** 32) * 2 - 1
}

function countryOf(m: MatchSummary): string | null {
  const region = COMPETITION_BY_ID.get(m.competitionId)?.region
  return region?.kind === 'country' ? region.countryId : null
}

/**
 * One pulsing beacon per live domestic match. ESPN gives venue names but not coordinates,
 * so beacons sit near the country's focus point, spread out deterministically by match id.
 */
export function toBeacons(live: MatchSummary[]): Beacon[] {
  const beacons: Beacon[] = []
  for (const m of live) {
    const country = COUNTRY_BY_ID.get(countryOf(m) ?? '')
    if (!country) continue
    beacons.push({
      id: m.id,
      lat: country.lat + hashUnit(m.id, 1) * 3,
      lng: country.lng + hashUnit(m.id, 2) * 3.5,
    })
  }
  return beacons
}

export function liveCountByCountry(live: MatchSummary[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const m of live) {
    const id = countryOf(m)
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}
