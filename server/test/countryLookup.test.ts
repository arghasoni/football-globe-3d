import { describe, expect, it } from 'vitest'
import { countryByLeagueSlug, countryByName } from '../../shared/countryLookup.ts'

describe('countryByName', () => {
  it('matches world-atlas names regardless of accents and punctuation', () => {
    expect(countryByName('Spain')?.code).toBe('724')
    expect(countryByName("Côte d'Ivoire")?.code).toBe('384')
  })

  it('understands the names ESPN uses for national teams', () => {
    expect(countryByName('United States')?.code).toBe('840')
    expect(countryByName('Türkiye')?.code).toBe('792')
    expect(countryByName('Bosnia-Herzegovina')?.code).toBe('070')
    expect(countryByName('Congo DR')?.code).toBe('180')
    expect(countryByName('Faroe Islands')?.code).toBe('234')
    expect(countryByName('North Macedonia')?.code).toBe('807')
    expect(countryByName('Republic of Ireland')?.code).toBe('372')
  })

  it('keeps the home nations separate', () => {
    expect(countryByName('England')).toEqual({ code: 'gb-eng', name: 'England' })
    expect(countryByName('Scotland')?.code).toBe('gb-sct')
  })

  it('returns null for unknown names', () => {
    expect(countryByName('Atlantis')).toBeNull()
  })
})

describe('countryByLeagueSlug', () => {
  it('maps a club home league to its country', () => {
    expect(countryByLeagueSlug('por.1')?.code).toBe('620')
    expect(countryByLeagueSlug('eng.1')).toEqual({ code: 'gb-eng', name: 'England' })
    expect(countryByLeagueSlug('uefa.champions')).toBeNull()
  })
})
