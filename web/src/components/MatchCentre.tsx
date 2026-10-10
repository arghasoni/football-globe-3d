import { useEffect, useState, type CSSProperties } from 'react'
import { COMPETITION_BY_ID } from '../../../shared/competitions'
import type { MatchDetail, MatchSide, Side } from '../../../shared/types'
import { headerMarks, kickoffCountdown, kickoffLong, statusText, type HeaderMark } from '../lib/matchHeader'
import { kickoffTime } from '../lib/format'
import { closeMatch } from '../lib/route'
import { hasLineups } from '../lib/lineup'
import { tablesFor } from '../lib/table'
import { useStandings } from '../lib/useStandings'
import { barColors, statRows } from '../lib/stats'
import { useMatchDetail } from '../lib/useMatchDetail'
import Ball from './Ball'
import FormGuide from './FormGuide'
import LeagueTable from './LeagueTable'
import Lineups from './Lineups'
import { Crest } from './MatchList'
import StatBars from './StatBars'
import Timeline from './Timeline'

type Tab = 'summary' | 'stats' | 'lineups' | 'table'

const isInPlay = (d: MatchDetail) => d.status === 'live' || d.status === 'halftime'

/** Re-renders every minute so the kick-off countdown stays current. */
function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

function TeamBlock({ team, winner }: { team: MatchSide; winner: boolean }) {
  return (
    <div className={`sb-team${winner ? ' is-winner' : ''}`}>
      <Crest src={team.logo} size="lg" />
      <span className="sb-team__name">{team.shortName}</span>
    </div>
  )
}

function Marks({ marks, side }: { marks: HeaderMark[]; side: Side }) {
  return (
    <ul className={`sb-marks sb-marks--${side}`}>
      {marks.map((m, i) => (
        <li key={i}>
          {m.kind === 'goal' ? <Ball size={11} /> : <span className="sb-mark-icon sb-mark-icon--red" aria-label="Red card" />}
          <span className="sb-marks__player">{m.player}</span>
          <span className="sb-marks__minute">
            {m.minute}
            {m.tag && ` (${m.tag})`}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Scoreboard({ d, now }: { d: MatchDetail; now: Date }) {
  const started = d.home.score !== null && d.away.score !== null
  const live = isInPlay(d)
  const finished = d.status === 'finished' && started
  const marks = headerMarks(d.events)
  return (
    <section className={`scoreboard scoreboard--${d.status}`}>
      <div className={`sb-status${live ? ' sb-status--live' : ''}`}>
        {live && <span className="live-dot" />}
        {statusText(d)}
      </div>

      <div className="sb-main">
        <TeamBlock team={d.home} winner={finished && d.home.score! > d.away.score!} />
        <div className="sb-score">
          {started ? (
            <>
              <span>{d.home.score}</span>
              <span className="sb-score__dash">–</span>
              <span>{d.away.score}</span>
            </>
          ) : (
            <span className="sb-score__time">{kickoffTime(d.kickoff)}</span>
          )}
        </div>
        <TeamBlock team={d.away} winner={finished && d.away.score! > d.home.score!} />
      </div>

      {d.info.halftime && d.status !== 'halftime' && (
        <p className="sb-sub">
          HT {d.info.halftime.home}–{d.info.halftime.away}
        </p>
      )}
      {d.status === 'scheduled' && <p className="sb-sub">{kickoffCountdown(d.kickoff, now)}</p>}

      {(marks.home.length > 0 || marks.away.length > 0) && (
        <div className="sb-marks-row">
          <Marks marks={marks.home} side="home" />
          <Marks marks={marks.away} side="away" />
        </div>
      )}

      {d.info.note && <p className="sb-note">{d.info.note}</p>}
    </section>
  )
}

function Facts({ d }: { d: MatchDetail }) {
  const venue = d.venue ? [d.venue.name, d.venue.city].filter(Boolean).join(', ') : null
  // [label, value, full width]
  const facts: [string, string, boolean][] = [['Kick-off', kickoffLong(d.kickoff), true]]
  if (venue) facts.push(['Venue', venue, true])
  if (d.info.referee) facts.push(['Referee', d.info.referee, !d.info.attendance])
  if (d.info.attendance) facts.push(['Attendance', d.info.attendance.toLocaleString(), !d.info.referee])
  return (
    <dl className="facts">
      {facts.map(([k, v, wide]) => (
        <div key={k} className={`facts__item${wide ? ' facts__item--wide' : ''}`}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

interface Props {
  competitionId: string
  matchId: string
}

export default function MatchCentre({ competitionId, matchId }: Props) {
  const { status, envelope } = useMatchDetail(competitionId, matchId)
  const now = useMinuteTick()
  const comp = COMPETITION_BY_ID.get(competitionId)
  const d = envelope?.data
  const [tab, setTab] = useState<Tab>('summary')
  const stats = d ? statRows(d.stats) : []
  const kit = barColors(d?.home.color, d?.away.color)
  const standings = useStandings(competitionId, !!d && isInPlay(d))
  const tables = d && standings ? tablesFor(standings, d.home.id, d.away.id) : null
  const tabs: { id: Tab; label: string }[] = [{ id: 'summary', label: 'Summary' }]
  if (stats.length) tabs.push({ id: 'stats', label: 'Stats' })
  if (d && hasLineups(d)) tabs.push({ id: 'lineups', label: 'Lineups' })
  if (tables?.groups.length) tabs.push({ id: 'table', label: 'Table' })
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'summary'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMatch()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Name the tab after the match, e.g. "Bournemouth 0–1 Liverpool".
  useEffect(() => {
    if (!d) return
    const before = document.title
    const score = d.home.score !== null ? `${d.home.score}–${d.away.score}` : 'v'
    document.title = `${d.home.shortName} ${score} ${d.away.shortName} · FootGlobe`
    return () => {
      document.title = before
    }
  }, [d])

  return (
    <aside
      className="centre"
      role="dialog"
      aria-label={d ? `${d.home.name} v ${d.away.name}` : 'Match centre'}
      style={{ '--home': kit.home, '--away': kit.away } as CSSProperties}
    >
      <header className="centre__bar">
        <button className="centre__back" onClick={closeMatch} aria-label="Back">
          <span aria-hidden>←</span>
        </button>
        <div className="centre__comp">
          <strong>{comp?.name ?? 'Match centre'}</strong>
          {d?.info.round && <span> · {d.info.round}</span>}
        </div>
      </header>

      {status === 'loading' && (
        <div className="skeleton" aria-label="Loading match">
          <div className="skeleton__row skeleton__row--tall" />
          <div className="skeleton__row" />
        </div>
      )}
      {status === 'not-found' && <p className="empty">This match couldn't be found.</p>}
      {status === 'error' && <p className="empty">Couldn't load this match. Retrying shortly…</p>}

      {d && (
        <>
          {envelope?.stale && <p className="notice notice--warn">Some details may be delayed or missing right now.</p>}
          <Scoreboard d={d} now={now} />
          {tabs.length > 1 && (
            <div className="tabs centre__tabs" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={t.id === activeTab}
                  className={`tab${t.id === activeTab ? ' is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {activeTab === 'summary' &&
            (d.status === 'scheduled' ? (
              // Before kick-off, form is the story.
              <>
                <FormGuide form={d.form} teams={d} />
                <Facts d={d} />
                <Timeline events={d.events} status={d.status} />
              </>
            ) : (
              <>
                <Timeline events={d.events} status={d.status} />
                <FormGuide form={d.form} teams={d} />
                <Facts d={d} />
              </>
            ))}
          {activeTab === 'stats' && <StatBars rows={stats} home={d.home} away={d.away} colors={kit} />}
          {activeTab === 'lineups' && <Lineups d={d} colors={kit} />}
          {activeTab === 'table' && tables && (
            <LeagueTable
              groups={tables.groups}
              titled={tables.titled}
              highlight={
                new Map<string, 'home' | 'away'>([
                  [d.home.id, 'home'],
                  [d.away.id, 'away'],
                ])
              }
            />
          )}
          <p className="panel__note">Data from ESPN · times in your time zone</p>
        </>
      )}
    </aside>
  )
}
