import { describe, expect, it } from 'vitest'
import type { MatchSummary } from '../../../shared/types'
import { focusPlaces, matchesInPlace, placeOf, toArcs } from './arcs'

const side = (name: string, code?: string) => ({ name, country: code ? { code, name } : undefined })
const match = (id: string, home: [string, string?], away: [string, string?], status = 'scheduled') =>
  ({ id, status, home: side(...home), away: side(...away) }) as unknown as MatchSummary

const ucl = [
  match('1', ['Arsenal', 'gb-eng'], ['Lille', '250'], 'live'),
  match('2', ['Villarreal', '724'], ['Napoli', '380']),
  match('3', ['Atlético', '724'], ['Man United', 'gb-eng'], 'finished'),
  match('4', ['Mystery FC'], ['Lens', '250']),
]

describe('placeOf', () => {
  it('uses the globe polygon when there is one, else the country code', () => {
    expect(placeOf('gb-eng')).toBe('826')
    expect(placeOf('724')).toBe('724')
    expect(placeOf('674')).toBe('674') // San Marino has no 110m polygon
  })
})

describe('toArcs', () => {
  it('draws one arc per match from the away country to the home country', () => {
    const arcs = toArcs(ucl)
    expect(arcs.map((a) => a.id)).toEqual(['1', '2', '3'])
    const lilleToArsenal = arcs[0]
    expect(lilleToArsenal.status).toBe('live')
    expect(lilleToArsenal.startLat).toBeCloseTo(46.6, 0) // France
    expect(lilleToArsenal.endLat).toBeCloseTo(52.6, 0) // England
  })
})

describe('focusPlaces', () => {
  it('lists each involved place once with a point to centre on', () => {
    const places = focusPlaces(ucl)
    expect(places.map((p) => p.id).sort()).toEqual(['250', '380', '724', '826'])
    expect(places.find((p) => p.id === '826')?.name).toBe('England')
  })
})

describe('matchesInPlace', () => {
  it('finds matches involving a place', () => {
    expect(matchesInPlace(ucl, '724').map((m) => m.id)).toEqual(['2', '3'])
    expect(matchesInPlace(ucl, '826').map((m) => m.id)).toEqual(['1', '3'])
  })
})
