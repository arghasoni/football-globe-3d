import { competitionsForCountry, type Competition } from '../../../shared/competitions'

export interface LeagueCountry {
  /** ISO 3166-1 numeric code, matching world-atlas polygon ids. */
  id: string
  name: string
  /** flagcdn.com code, e.g. 'es' or 'gb-eng' (Windows lacks emoji flags). */
  flag: string
  /** Focus point for centre-detection and card anchoring. */
  lat: number
  lng: number
  /** Domestic competitions, top division first (from shared/competitions.ts). */
  leagues: Competition[]
}

const GEO: Omit<LeagueCountry, 'leagues'>[] = [
  { id: '826', name: 'England', flag: 'gb-eng', lat: 52.6, lng: -1.5 },
  { id: '724', name: 'Spain', flag: 'es', lat: 40.2, lng: -3.6 },
  { id: '250', name: 'France', flag: 'fr', lat: 46.6, lng: 2.4 },
  { id: '380', name: 'Italy', flag: 'it', lat: 42.8, lng: 12.6 },
  { id: '276', name: 'Germany', flag: 'de', lat: 51.1, lng: 10.4 },
  { id: '356', name: 'India', flag: 'in', lat: 22.9, lng: 79.6 },
  { id: '840', name: 'United States', flag: 'us', lat: 39.5, lng: -98.4 },
  { id: '682', name: 'Saudi Arabia', flag: 'sa', lat: 24.0, lng: 45.0 },
]

export const LEAGUE_COUNTRIES: LeagueCountry[] = GEO.map((g) => ({
  ...g,
  leagues: competitionsForCountry(g.id).sort((a, b) => a.tier - b.tier),
}))

export const COUNTRY_BY_ID = new Map(LEAGUE_COUNTRIES.map((c) => [c.id, c]))
