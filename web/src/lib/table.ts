import type { StandingsGroup } from '../../../shared/types'

/**
 * The table(s) worth showing in a match centre: the groups that contain either team.
 * `titled` when the competition has several groups, so the group's name matters.
 */
export function tablesFor(groups: StandingsGroup[], homeId: string, awayId: string) {
  const relevant = groups.filter((g) => g.rows.some((r) => r.team.id === homeId || r.team.id === awayId))
  return { groups: relevant, titled: groups.length > 1 }
}
