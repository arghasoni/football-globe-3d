import type { Side, StatLine } from '../../../shared/types'

export interface StatRow {
  key: string
  label: string
  home: string
  away: string
  /** Home's part of the bar, 0–1 (0.5 when both are zero). */
  homeShare: number
  leader: Side | null
}

type Values = (get: (key: string) => [number, number] | null) => [number, number] | null

interface Spec {
  key: string
  label: string
  percent?: boolean
  /** Derive the pair from other stats instead of reading `key`. */
  values?: Values
}

const ratio = (part: string, whole: string): Values => (get) => {
  const p = get(part)
  const w = get(whole)
  if (!p || !w) return null
  return [w[0] ? (100 * p[0]) / w[0] : 0, w[1] ? (100 * p[1]) / w[1] : 0]
}

/** The stats worth a bar, in display order. ESPN sends ~28; the rest are noise for a glance. */
const SPECS: Spec[] = [
  { key: 'possessionPct', label: 'Possession', percent: true },
  { key: 'totalShots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on target' },
  { key: 'wonCorners', label: 'Corners' },
  { key: 'foulsCommitted', label: 'Fouls' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' },
  { key: 'saves', label: 'Saves' },
  { key: 'totalPasses', label: 'Passes' },
  // ESPN's passPct is rounded to 0.1, so work it out from the counts.
  { key: 'passAccuracy', label: 'Pass accuracy', percent: true, values: ratio('accuratePasses', 'totalPasses') },
  { key: 'totalTackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
]

export function statRows(stats: StatLine[]): StatRow[] {
  const byKey = new Map(stats.map((s) => [s.key, s]))
  const get = (key: string): [number, number] | null => {
    const s = byKey.get(key)
    if (!s) return null
    const pair: [number, number] = [Number(s.home), Number(s.away)]
    return pair.every(Number.isFinite) ? pair : null
  }

  return SPECS.flatMap((spec) => {
    const pair = spec.values ? spec.values(get) : get(spec.key)
    if (!pair) return []
    const [h, a] = pair
    const fmt = (v: number) => (spec.percent ? `${Math.round(v)}%` : String(Math.round(v * 10) / 10))
    return [
      {
        key: spec.key,
        label: spec.label,
        home: fmt(h),
        away: fmt(a),
        homeShare: h + a > 0 ? h / (h + a) : 0.5,
        leader: h > a ? 'home' : a > h ? 'away' : null,
      } satisfies StatRow,
    ]
  })
}

// ---- Bar colours ----

const LIGHT = '#d9e4de'
const NEON = '#39ff88'

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Relative luminance, 0 (black) – 1 (white). */
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function distance(a: string, b: string): number {
  const [x, y] = [rgb(a), rgb(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

const valid = (hex?: string) => (hex && /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : null)

/** Kit colours for the stat bars, adjusted so both show on the dark panel and don't look alike. */
export function barColors(homeHex?: string, awayHex?: string): { home: string; away: string } {
  // Near-black kits become light grey; unknown kits get the app's neon (home) or light grey (away).
  const pick = (hex: string | undefined, fallback: string) => {
    const c = valid(hex)
    return c ? (luminance(c) >= 0.04 ? c : LIGHT) : fallback
  }
  const home = pick(homeHex, NEON)
  let away = pick(awayHex, LIGHT)
  if (distance(home, away) < 90) away = distance(home, LIGHT) < 90 ? NEON : LIGHT
  return { home, away }
}
