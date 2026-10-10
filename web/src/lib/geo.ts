export interface LatLng {
  lat: number
  lng: number
}

const RAD = Math.PI / 180

/** Great-circle angle between two points, in degrees. */
export function angularDistance(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * RAD
  const dLng = (b.lng - a.lng) * RAD
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / RAD
}

/** The item closest to `pov`, or null if none lies within `maxDeg`. */
export function nearestCountry<T extends LatLng>(pov: LatLng, items: T[], maxDeg: number): T | null {
  let best: T | null = null
  let bestDist = maxDeg
  for (const item of items) {
    const d = angularDistance(pov, item)
    if (d <= bestDist) {
      best = item
      bestDist = d
    }
  }
  return best
}

/** globe.gl's camera has a 50° vertical field of view. */
const HALF_FOV_TAN = Math.tan(25 * RAD)

/**
 * Camera altitude (in globe radii) that makes the globe fill ~80% of the screen height
 * on wide screens, and just inside the screen width on tall phone screens.
 */
export function fitAltitude(width: number, height: number): number {
  const radiusFraction = Math.min(0.8, (0.92 * width) / height)
  const angularRadius = Math.atan(radiusFraction * HALF_FOV_TAN)
  return 1 / Math.sin(angularRadius) - 1
}
