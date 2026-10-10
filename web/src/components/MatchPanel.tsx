import type { ReactNode } from 'react'
import type { Competition } from '../../../shared/competitions'
import type { MatchSummary } from '../../../shared/types'
import type { CompetitionMatches } from '../lib/useCompetitionMatches'
import MatchList from './MatchList'

interface Props {
  title: string
  /** Flag image or other badge shown before the title. */
  badge?: ReactNode
  competitions: Competition[]
  data: Record<string, CompetitionMatches>
  tab: string
  onTab: (id: string) => void
  /** Optional narrowing, e.g. only matches involving a clicked country. */
  filter?: { label: string; test: (m: MatchSummary) => boolean; onClear: () => void }
  onClose: () => void
}

const isInPlay = (m: MatchSummary) => m.status === 'live' || m.status === 'halftime'

export default function MatchPanel({ title, badge, competitions, data, tab, onTab, filter, onClose }: Props) {
  const current = data[tab]
  const all = current?.envelope?.data ?? []
  const matches = filter ? all.filter(filter.test) : all

  return (
    <aside className="panel" role="dialog" aria-label={title}>
      <header className="panel__head">
        {badge}
        <h2>{title}</h2>
        <button className="panel__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      {competitions.length > 1 && (
        <div className="tabs" role="tablist">
          {competitions.map((c) => {
            const live = (data[c.id]?.envelope?.data ?? []).filter((m) => isInPlay(m) && (!filter || filter.test(m))).length
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={c.id === tab}
                className={`tab${c.id === tab ? ' is-active' : ''}`}
                onClick={() => onTab(c.id)}
              >
                {c.tier > 0 && <span className="tier">D{c.tier}</span>}
                {c.short}
                {live > 0 && <span className="tab__live">{live}</span>}
              </button>
            )
          })}
        </div>
      )}

      {filter && (
        <button className="filter-chip" onClick={filter.onClear}>
          Showing {filter.label} <span aria-hidden>×</span>
        </button>
      )}

      {current?.envelope?.stale && <p className="notice notice--warn">Some data may be delayed.</p>}

      {!current || current.status === 'loading' ? (
        <div className="skeleton" aria-label="Loading matches">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton__row" />
          ))}
        </div>
      ) : current.status === 'error' ? (
        <p className="empty">Couldn't load matches. Retrying shortly…</p>
      ) : (
        <MatchList
          matches={matches}
          nearest={current.envelope?.note === 'nearest-matchday'}
          emptyText={
            filter && all.length
              ? `No ${filter.label} matches in this competition right now.`
              : competitions.find((c) => c.id === tab)?.quietNote
          }
        />
      )}

      <p className="panel__note">Times in your time zone · tap a match for the match centre</p>
    </aside>
  )
}
