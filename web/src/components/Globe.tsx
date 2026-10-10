import { useEffect, useRef, type RefObject } from 'react'
import Globe, { type GlobeInstance } from 'globe.gl'
import { feature } from 'topojson-client'
import type { Feature, Geometry } from 'geojson'
import { MeshPhongMaterial, Color } from 'three'
import worldTopo from 'world-atlas/countries-110m.json'
import type { Beacon } from '../lib/beacons'
import type { FocusPlace, MatchArc } from '../lib/arcs'
import { fitAltitude, nearestCountry } from '../lib/geo'
import { cameraView } from '../lib/cameraView'

type CountryFeature = Feature<Geometry, { name: string }> & { id: string }

const COUNTRIES = (
  feature(worldTopo as never, (worldTopo as never as { objects: { countries: never } }).objects.countries) as unknown as {
    features: CountryFeature[]
  }
).features.filter((f) => f.properties.name !== 'Antarctica')

/** How far (degrees) from the view centre a place can be and still take focus. */
const FOCUS_RANGE_DEG = 28
const IDLE_SPIN_DELAY_MS = 5000

export interface FlyTo {
  lat: number
  lng: number
  altitude?: number
  /** Change to re-trigger a flight to the same spot. */
  key: string
}

interface Props {
  /** Places that glow and can be focused, hovered and clicked (polygon ids or country codes). */
  places: FocusPlace[]
  activeId: string | null
  /** RGB triple, e.g. '57,255,136'. */
  accent: string
  arcs: MatchArc[]
  beacons: Beacon[]
  flyTo: FlyTo | null
  /** Stop the idle spin (a panel is pinned to a place). */
  locked: boolean
  onFocusChange: (id: string | null) => void
  onHoverChange: (id: string | null) => void
  onSelect: (id: string) => void
  /** Element kept glued to the active place's screen position. */
  anchorRef: RefObject<HTMLDivElement | null>
}

export default function GlobeView(props: Props) {
  const { places, activeId, accent, arcs, beacons, flyTo, locked, anchorRef } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  const live = useRef({ props, lockedNow: locked })
  live.current = { props, lockedNow: locked }

  // Create the globe once.
  useEffect(() => {
    const el = containerRef.current!
    const isPlace = (id: string | undefined) => !!id && live.current.props.places.some((p) => p.id === id)
    const globe = new Globe(el, { animateIn: true })
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereAltitude(0.18)
      .globeMaterial(
        new MeshPhongMaterial({ color: new Color('#040b16'), emissive: new Color('#03140c'), shininess: 8 }),
      )
      .polygonsData(COUNTRIES)
      .polygonsTransitionDuration(250)
      .polygonLabel(() => '')
      .onPolygonHover((f) => {
        const id = (f as CountryFeature | null)?.id
        live.current.props.onHoverChange(isPlace(id) ? id! : null)
        el.style.cursor = isPlace(id) ? 'pointer' : 'grab'
      })
      .onPolygonClick((f) => {
        const id = (f as CountryFeature).id
        if (isPlace(id)) live.current.props.onSelect(id)
      })
      .ringColor(() => (t: number) => `rgba(${live.current.props.accent},${1 - t})`)
      .ringMaxRadius(2.2)
      .ringPropagationSpeed(1.6)
      .ringRepeatPeriod(1100)
      .ringAltitude(0.012)
      .pointColor(() => '#e8fff2')
      .pointRadius(0.25)
      .pointAltitude(0.015)
      .pointLabel(() => '')
      .arcAltitudeAutoScale(0.35)
      .arcLabel(() => '')

    globe.pointOfView({ lat: 38, lng: 5, altitude: fitAltitude(window.innerWidth, window.innerHeight) })

    // Idle auto-spin that pauses while the user interacts.
    const controls = globe.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    controls.enableDamping = true
    controls.minDistance = 140
    controls.maxDistance = Math.max(600, 100 * (1 + fitAltitude(window.innerWidth, window.innerHeight)) + 150)
    let idleTimer: number | undefined
    const onStart = () => {
      controls.autoRotate = false
      window.clearTimeout(idleTimer)
    }
    const onEnd = () => {
      idleTimer = window.setTimeout(() => {
        if (!live.current.lockedNow) controls.autoRotate = true
      }, IDLE_SPIN_DELAY_MS)
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)

    const resize = () => globe.width(window.innerWidth).height(window.innerHeight)
    resize()
    window.addEventListener('resize', resize)

    // Per-frame: detect the centred place and glue the card to the active one.
    let raf = 0
    let lastFocus: string | null = null
    const tick = () => {
      const pov = globe.pointOfView()
      cameraView.lat = pov.lat
      cameraView.lng = pov.lng
      cameraView.altitude = pov.altitude
      const { places: targets, activeId: active, onFocusChange } = live.current.props
      const focus = nearestCountry(pov, targets, FOCUS_RANGE_DEG)?.id ?? null
      if (focus !== lastFocus) {
        lastFocus = focus
        onFocusChange(focus)
      }
      const anchor = anchorRef.current
      const place = active ? targets.find((p) => p.id === active) : undefined
      if (anchor && place) {
        const { x, y } = globe.getScreenCoords(place.lat, place.lng, 0.05)
        anchor.style.transform = `translate(${x}px, ${y}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    globeRef.current = globe
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(idleTimer)
      window.removeEventListener('resize', resize)
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      globe._destructor()
      el.innerHTML = ''
      globeRef.current = null
    }
  }, [anchorRef])

  // Restyle polygons when the glowing set, the active place or the mode colour changes.
  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const glowing = new Set(places.map((p) => p.id))
    globe
      .atmosphereColor(`rgb(${accent})`)
      .polygonSideColor(() => `rgba(${accent},0.15)`)
      .polygonAltitude((f) => {
        const id = (f as CountryFeature).id
        if (id === activeId) return 0.045
        return glowing.has(id) ? 0.012 : 0.006
      })
      .polygonCapColor((f) => {
        const id = (f as CountryFeature).id
        if (id === activeId) return `rgba(${accent},0.85)`
        return glowing.has(id) ? `rgba(${accent},0.22)` : 'rgba(14,30,48,0.9)'
      })
      .polygonStrokeColor((f) => {
        const id = (f as CountryFeature).id
        if (id === activeId) return '#f2fff8'
        return glowing.has(id) ? `rgba(${accent},0.9)` : 'rgba(80,160,200,0.25)'
      })
  }, [places, activeId, accent])

  useEffect(() => {
    globeRef.current?.ringsData(beacons).pointsData(beacons)
  }, [beacons])

  // Match arcs: live ones race along brightly, upcoming ones drift, results stay faint.
  useEffect(() => {
    globeRef.current
      ?.arcsData(arcs)
      .arcColor((a: object) => {
        const s = (a as MatchArc).status
        if (s === 'live' || s === 'halftime') return [`rgba(${accent},0.25)`, `rgba(${accent},1)`]
        if (s === 'finished') return `rgba(${accent},0.28)`
        return ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.6)']
      })
      .arcStroke((a) => ((a as MatchArc).status === 'live' ? 0.8 : 0.4))
      .arcDashLength((a) => ((a as MatchArc).status === 'finished' ? 1 : 0.35))
      .arcDashGap((a) => ((a as MatchArc).status === 'finished' ? 0 : 0.25))
      .arcDashAnimateTime((a) => {
        const s = (a as MatchArc).status
        return s === 'live' || s === 'halftime' ? 1400 : s === 'finished' ? 0 : 5000
      })
  }, [arcs, accent])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !flyTo) return
    globe.controls().autoRotate = false
    globe.pointOfView(
      {
        lat: flyTo.lat,
        lng: flyTo.lng,
        altitude: flyTo.altitude ?? Math.max(1.5, fitAltitude(window.innerWidth, window.innerHeight) * 0.65),
      },
      900,
    )
  }, [flyTo])

  useEffect(() => {
    const globe = globeRef.current
    if (globe && locked) globe.controls().autoRotate = false
  }, [locked])

  return <div ref={containerRef} className="globe" />
}
