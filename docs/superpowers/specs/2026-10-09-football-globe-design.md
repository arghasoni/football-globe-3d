# Football Globe — Design Spec

Date: 2026-10-09 · Status: Parts 1–3 and 4a approved; 4b built, awaiting review

## Goal
A personal/portfolio website: a rotatable 3D globe (mouse + touch) where countries hosting
major football leagues light up as they rotate into view. Clicking a country lists its divisions;
clicking a division shows live/upcoming/finished matches; clicking a match opens a Google-style
match centre (score, timeline, stats, lineups, table).

Initial leagues: La Liga (Spain), Ligue 1 (France), Premier League (England), Serie A (Italy),
Bundesliga (Germany), Indian Super League (India), MLS (USA), Saudi Pro League (Saudi Arabia),
plus their second divisions where available. More leagues are added via config.

## Decisions (from Q&A)
| Topic | Decision |
|---|---|
| Data | **ESPN = primary for all competitions** (confirmed 2026-10-09). football-data.org free token = scores-only fallback for PL, ELC, PD, FL1, SA, BL1, CL. |
| Continental | Champions League, Europa League, Conference League, Nations League (ESPN). World Cup skipped until relevant. |
| Look | Dark neon "stadium night": dark space, faint neon borders, floodlight-green highlights |
| Highlight | Centre-focus (nearest league country to view centre auto-highlights + card) **and** hover highlight on desktop |
| Audience | Personal / portfolio; runs locally first |

## Architecture
```
web/    Vite + React + TypeScript + globe.gl   (UI; polls backend)
server/ Node + Hono                            (Part 2: proxy, headers, normalise, cache, mock mode)
```
Frontend only consumes our normalised model: `Country → Competition → Match → MatchDetail`.

## Parts (each ends with user review)
1. **Globe shell** — globe, country polygons, centre-focus + hover highlight, floating country card,
   pulsing beacons for (mock) live matches, idle auto-spin, click → placeholder league panel. Mock data only.
2. **Data backend** — Hono server, ESPN + football-data adapters, normalised types, cache
   (live 20s / fixtures 10min / finished 1d), recorded-response mock mode, adapter tests.
3. **Country → divisions → matches** — side panel / mobile bottom sheet, division tabs, Live/Upcoming/Finished, auto-refresh.
4. **Match centre** — score header + live minute, timeline, stat bars, lineups on pitch by formation, table, form.
   Built in sub-stages, each ending with user review:
   - **4a** Detail backend + shell: `/api/match/:id` (ESPN summary → `MatchDetail`, live 20s cache, mock fixtures, tests);
     clickable match rows, match centre view with back button + deep link, score header (crests, score, live minute, status, venue).
   - **4b** Timeline + stats: goals/cards/subs/VAR in minute order split home/away; two-sided stat bars in team colours.
   - **4c** Lineups: starting XIs placed by formation on a drawn pitch, shirt numbers, subs + bench.
   - **4d** Table + form + finish: standings with both teams highlighted (group table for cups), last-5 W/D/L chips,
     pre-match state, hide missing sections cleanly, desktop layout + mobile full-screen sheet.
5. **Polish** — mobile tuning, more leagues, favourites, PWA, goal-ripple effect, day/night terminator.

## Part 1 detail
- `web/src/data/countries.ts`: league-country config — ISO numeric id (matches world-atlas),
  display name, flag, centroid lat/lng, leagues `{ id: 'esp.1', name, tier }`. England maps to the UK polygon.
- `web/src/data/mockLive.ts`: mock live matches with stadium lat/lng (drives beacons + live counts).
- `web/src/lib/geo.ts`: `angularDistance(a, b)` and `nearestCountry(pov, countries, maxDeg)` — pure, unit-tested.
- `web/src/components/Globe.tsx`: globe.gl wrapper; on every camera change computes focus country;
  hover overrides focus; raised + glowing cap for active country; rings for live beacons.
- `web/src/components/CountryCard.tsx`: floating card anchored to the active country's screen position.
- `web/src/components/LeaguePanel.tsx`: placeholder panel opened on click (lists divisions; matches arrive in Part 3).
- Error handling: none needed beyond graceful WebGL-unsupported message (no network data in Part 1).
- Testing: vitest for `geo.ts`; manual browser check (desktop drag, hover, click; mobile viewport).

## Part 2 detail (as built)
- `shared/competitions.ts` — single competition list (ESPN slug, tier, region, football-data code); `shared/types.ts` — API contract.
- `server/` — Hono on 127.0.0.1:8787, proxied by Vite at `/api`. Token read from `server/.env` or `web/.env` (`API_TOKEN`), never sent to the browser.
- Endpoints: `/api/competitions`, `/api/competitions/:id/matches[?date=YYYYMMDD]`, `/api/competitions/:id/matches/:matchId`, `/api/competitions/:id/standings`, `/api/live`.
- Responses are `{ data, stale, updatedAt, source }`. Cache TTLs: in-play 20s, matchday 2 min, quiet 10 min, finished detail 24h, standings 10 min. Failures remembered 30s; last good value served as stale.
- ESPN requests retried once; `/api/live` sweeps competitions 4 at a time (bursts of 17 made ESPN time out).
- `npm run mock` serves recorded fixtures; `npm run record` refreshes them.
- Globe now shows real live counts and beacons (placed near the country centre — ESPN gives venue names, not coordinates).

## Part 3 detail (as built)
User asks (2026-10-10): every competition shows live + upcoming (next 48h) + results (last 48h); a top-right mode switch.
- Modes (`shared/competitions.ts` `MODES`): **Leagues** (domestic) · **Champions League** (UCL, Europa, Conference) · **World Cup** (WC + qualifying by confederation) · **Internationals** (Nations League, friendlies, Euro qualifying). Each mode tints the globe and backdrop.
- `/api/competitions/:id/matches` with no date = the ±48h window, built from one ESPN scoreboard per day (ESPN rejects date ranges). Empty window → nearest matchday within 30 days, flagged `note: 'nearest-matchday'`.
- Every team carries `country`: league country (domestic), name lookup (national teams), club profile's home league → else the club's home stadium (learned from scoreboards or its schedule). Lookup table `shared/countryPoints.ts` is generated from world-atlas by `web/scripts/gen-country-points.mjs`.
- Non-league modes draw arcs away country → home country (live: bright and fast; upcoming: drifting white; results: faint), glow every involved country, and the card/click narrows the panel to that country.
- Panel: division/competition tabs with live badges, Live now / Upcoming by day / Results by day, local kickoff times, crests, stale/error/empty states, refresh every 30s when live else 2 min.
- Known gaps: a few Conference League minnows have no country on ESPN (no arc) — accepted, will not fix (user, 2026-10-10). Match rows open the match centre in Part 4.

## Part 4a detail (as built)
- Route: hash deep link `#/match/<competitionId>/<matchId>`; match rows are links; back button / Esc / browser back return
  to the globe with the panel state kept (deep-link visitors go to `#/`).
- API: `MatchDetail.info` = round (from ESPN `altGameNote`), tie note, referee, attendance, half-time score.
  If ESPN's summary fails (or isn't recorded in mock mode), the scoreboard entry is served as a basic header, `stale: true`.
- `useMatchDetail` polls every 20s while live, 1 min within 2h of kick-off, 5 min before that, stops once finished.
- Header: competition + round, status (pulsing live minute / Half-time / Full-time / countdown), crests, score,
  HT score, goal scorers (pen/OG) and red cards per side, tie note, team-colour glow; facts: kick-off, venue, referee, attendance.
- Desktop: right-hand panel; phone: full-screen sheet. Globe cards hidden while a match is open.

## Part 4b detail (as built)
- Match centre tabs: Summary (timeline + facts) and Stats (shown only when the provider has stats).
- Timeline: newest first, ESPN's own order kept (it is chronological; minutes are not — half-time subs are logged at 45').
  Period dividers (Kick-off, Half-time, Full-time / End of 90 minutes) carry the score; each goal shows the running score
  (read from ESPN's "Goal! A 1, B 0." text, else counted). Goals with assists, pens, OGs, cards, second yellows, subs, VAR.
  Desktop: home left / away right of a centre line; phone: one column with a kit-coloured edge per team.
- ESPN facts verified: an own goal is tagged with the team that benefits; a second yellow arrives as `red-card` with
  "Second yellow" only in the text (parser now maps it to `second-yellow`).
- Stats: 13 headline stats in a fixed order; pass accuracy computed from counts (ESPN's % is rounded to 0.1);
  split bars in kit colours, near-black kits shown light grey, clashing kits separated; leader in bold.

