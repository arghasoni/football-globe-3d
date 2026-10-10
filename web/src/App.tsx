import { useEffect, useMemo, useRef, useState } from 'react'
import { MODES, competitionsForMode, type Mode } from '../../shared/competitions'
import Backdrop from './components/Backdrop'
import GlobeView, { type FlyTo } from './components/Globe'
import CountryCard from './components/CountryCard'
import FixtureCard from './components/FixtureCard'
import Flag from './components/Flag'
import MatchCentre from './components/MatchCentre'
import MatchPanel from './components/MatchPanel'
import ModeSwitch from './components/ModeSwitch'
import { COUNTRY_BY_ID, LEAGUE_COUNTRIES } from './data/countries'
import { focusPlaces, matchesInPlace, toArcs, type FocusPlace } from './lib/arcs'
import { liveCountByCountry, toBeacons } from './lib/beacons'
import { useCompetitionMatches } from './lib/useCompetitionMatches'
import { useLive } from './lib/useLive'
import { useRoute } from './lib/route'
import { sceneTheme } from './lib/cameraView'

const STATUS_TEXT = {
  loading: 'Connecting to live feed…',
  stale: 'Some data may be delayed',
  offline: 'Live feed offline',
} as const

/** Globe tint per mode (RGB). */
const ACCENT: Record<Mode, string> = {
  leagues: '57,255,136',
  europe: '96,170,255',
  'world-cup': '255,206,84',
  internationals: '255,112,150',
}

/** Where the camera heads when a mode is chosen. */
const MODE_VIEW: Record<Mode, { lat: number; lng: number }> = {
  leagues: { lat: 38, lng: 5 },
  europe: { lat: 48, lng: 12 },
  'world-cup': { lat: 25, lng: -20 },
  internationals: { lat: 45, lng: 15 },
}

const HINT: Record<Mode, string> = {
  leagues: 'Drag to spin the globe · glowing countries have leagues',
  europe: 'Arcs link the clubs in each European tie · tap a country for its clubs',
  'world-cup': 'Arcs link the nations in each World Cup match',
  internationals: 'Arcs link the nations in each international match',
}

const LEAGUE_PLACES: FocusPlace[] = LEAGUE_COUNTRIES.map(({ id, name, lat, lng }) => ({ id, name, lat, lng }))
const isMobile = () => window.matchMedia('(max-width: 640px)').matches

export default function App() {
  const [mode, setMode] = useState<Mode>('leagues')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  /** Leagues: the open country. Other modes: the country the panel is narrowed to. */
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Other modes: whether the competition panel is showing. */
  const [panelOpen, setPanelOpen] = useState(false)
  const [tab, setTab] = useState('')
  const [flyTo, setFlyTo] = useState<FlyTo | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const { matches: live, status } = useLive()
  const route = useRoute()
  /** The match centre covers the panels; their state is kept for when it closes. */
  const inMatch = route.kind === 'match'

  const leagues = mode === 'leagues'
  const selectedCountry = leagues && selectedId ? COUNTRY_BY_ID.get(selectedId) : undefined
  const competitions = useMemo(
    () => (leagues ? (selectedCountry?.leagues ?? []) : competitionsForMode(mode)),
    [leagues, selectedCountry, mode],
  )
  const data = useCompetitionMatches(competitions.map((c) => c.id))

  useEffect(() => {
    sceneTheme.accent = ACCENT[mode]
  }, [mode])

  // Keep the active tab valid for the current competition list.
  useEffect(() => {
    if (competitions.length && !competitions.some((c) => c.id === tab)) setTab(competitions[0].id)
  }, [competitions, tab])

  const modeMatches = useMemo(
    () => (leagues ? [] : Object.values(data).flatMap((d) => d.envelope?.data ?? [])),
    [leagues, data],
  )
  const places = useMemo(() => (leagues ? LEAGUE_PLACES : focusPlaces(modeMatches)), [leagues, modeMatches])
  const arcs = useMemo(() => toArcs(modeMatches), [modeMatches])
  const beacons = useMemo(() => (leagues ? toBeacons(live) : []), [leagues, live])
  const liveCounts = useMemo(() => liveCountByCountry(live), [live])

  const changeMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setSelectedId(null)
    setFocusedId(null)
    setHoveredId(null)
    setPanelOpen(next !== 'leagues' && !isMobile())
    setFlyTo({ ...MODE_VIEW[next], key: `mode-${next}-${Date.now()}` })
  }

  const select = (id: string) => {
    setSelectedId(id)
    if (!leagues) setPanelOpen(true)
    const place = places.find((p) => p.id === id)
    if (place) setFlyTo({ lat: place.lat, lng: place.lng, key: `place-${id}-${Date.now()}` })
  }

  // Hover wins over centre-focus; a selected country stays highlighted.
  const activeId = (leagues ? selectedId : null) ?? hoveredId ?? focusedId ?? (leagues ? null : selectedId)
  const activePlace = activeId ? places.find((p) => p.id === activeId) : undefined
  const activeCountry = leagues && activeId ? COUNTRY_BY_ID.get(activeId) : undefined
  const selectedPlace = !leagues && selectedId ? places.find((p) => p.id === selectedId) : undefined
  const showCard = !inMatch && (leagues ? !!activeCountry && !selectedCountry : !!activePlace && activeId !== selectedId)

  const modeLabel = MODES.find((m) => m.id === mode)!.label
  const totalInMode = modeMatches.length

  return (
    <main className={`app app--${mode}`} style={{ ['--accent' as string]: ACCENT[mode] }}>
      <Backdrop />
      <GlobeView
        places={places}
        activeId={activeId}
        accent={ACCENT[mode]}
        arcs={arcs}
        beacons={beacons}
        flyTo={flyTo}
        locked={!!selectedId}
        onFocusChange={setFocusedId}
        onHoverChange={setHoveredId}
        onSelect={select}
        anchorRef={anchorRef}
      />

      <header className="brand">
        <h1>
          FOOT<span>GLOBE</span>
        </h1>
        {status === 'ok' ? (
          <p>
            <span className="live-dot" /> {live.length} {live.length === 1 ? 'match' : 'matches'} live worldwide
          </p>
        ) : (
          <p className={`feed-status feed-status--${status}`}>{STATUS_TEXT[status]}</p>
        )}
      </header>

      <ModeSwitch mode={mode} onChange={changeMode} />

      <div ref={anchorRef} className="anchor">
        {showCard && leagues && activeCountry && (
          <CountryCard
            country={activeCountry}
            liveCount={liveCounts.get(activeCountry.id) ?? 0}
            onOpen={() => select(activeCountry.id)}
          />
        )}
        {showCard && !leagues && activePlace && (
          <FixtureCard
            name={activePlace.name}
            matches={matchesInPlace(modeMatches, activePlace.id)}
            onOpen={() => select(activePlace.id)}
          />
        )}
      </div>

      {!inMatch && !activeId && !selectedId && !panelOpen && <p className="hint">{HINT[mode]}</p>}

      {!inMatch && !leagues && !panelOpen && (
        <button className="panel-toggle" onClick={() => setPanelOpen(true)}>
          View {modeLabel} matches{totalInMode ? ` (${totalInMode})` : ''}
        </button>
      )}

      <div className="panel-slot" hidden={inMatch}>
        {selectedCountry && (
          <MatchPanel
            title={selectedCountry.name}
            badge={<Flag code={selectedCountry.flag} size={24} />}
            competitions={competitions}
            data={data}
            tab={tab}
            onTab={setTab}
            onClose={() => setSelectedId(null)}
          />
        )}

        {!leagues && panelOpen && (
          <MatchPanel
            title={modeLabel}
            competitions={competitions}
            data={data}
            tab={tab}
            onTab={setTab}
            filter={
              selectedPlace
                ? {
                    label: selectedPlace.name,
                    test: (m) => matchesInPlace([m], selectedPlace.id).length > 0,
                    onClear: () => setSelectedId(null),
                  }
                : undefined
            }
            onClose={() => {
              setPanelOpen(false)
              setSelectedId(null)
            }}
          />
        )}
      </div>

      {route.kind === 'match' && (
        <MatchCentre key={route.matchId} competitionId={route.competitionId} matchId={route.matchId} />
      )}
    </main>
  )
}
