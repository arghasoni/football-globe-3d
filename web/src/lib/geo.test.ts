import { describe, expect, it } from 'vitest'
import { angularDistance, fitAltitude, nearestCountry } from './geo'

const spain = { id: '724', lat: 40.2, lng: -3.6 }
const france = { id: '250', lat: 46.6, lng: 2.4 }
const india = { id: '356', lat: 22.9, lng: 79.6 }

describe('angularDistance', () => {
  it('is zero for the same point', () => {
    expect(angularDistance({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBeCloseTo(0)
  })

  it('is 90 degrees from the equator to a pole', () => {
    expect(angularDistance({ lat: 0, lng: 0 }, { lat: 90, lng: 0 })).toBeCloseTo(90)
  })

  it('handles the antimeridian', () => {
    expect(angularDistance({ lat: 0, lng: 179 }, { lat: 0, lng: -179 })).toBeCloseTo(2)
  })
})

describe('fitAltitude', () => {
  it('keeps the classic framing on wide screens', () => {
    expect(fitAltitude(1536, 695)).toBeCloseTo(1.87, 1)
  })

  it('pulls the camera back on tall phone screens so the globe fits the width', () => {
    expect(fitAltitude(440, 956)).toBeGreaterThan(3)
  })
})

describe('nearestCountry', () => {
  const countries = [spain, france, india]

  it('picks the country closest to the view centre', () => {
    expect(nearestCountry({ lat: 41, lng: -2 }, countries, 25)?.id).toBe('724')
    expect(nearestCountry({ lat: 20, lng: 75 }, countries, 25)?.id).toBe('356')
  })

  it('returns null when nothing is within range', () => {
    expect(nearestCountry({ lat: -40, lng: -140 }, countries, 25)).toBeNull()
  })
})
