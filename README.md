# Football Globe 3D

A rotatable 3D globe for live football. Countries with major leagues light up as they turn into view;
click one for its divisions, pick a match, and open a Google-style match centre.

- **Leagues:** Premier League, LaLiga, Ligue 1, Serie A, Bundesliga, Indian Super League, MLS, Saudi Pro League
  and their second divisions
- **Modes:** Leagues · Champions League (plus Europa and Conference League) · World Cup · Internationals, with arcs
  linking the two sides of every match
- **Match lists:** live now, the next 48 hours and the last 48 hours, refreshed automatically
- **Match centre:** live minute, score, half-time score, scorers, red cards, venue, referee and attendance
  (timeline, stats, lineups and table in progress)

Built with React, TypeScript, Vite and globe.gl on the front end and a small Hono server that fetches and caches
ESPN's public scores feed (football-data.org as a backup).

## Run it locally

Needs Node.js 22 or newer. Use two terminals.

```sh
# Terminal 1: API on http://127.0.0.1:8787
cd server
npm install
npm run dev      # live data; or `npm run mock` for recorded data, no internet needed

# Terminal 2: web app on http://localhost:5173
cd web
npm install
npm run dev
```

Optional: put `FOOTBALL_DATA_TOKEN=<your token>` in `server/.env` to enable the football-data.org fallback.

## Tests

```sh
cd server && npm test
cd web && npx vitest run
```

## Layout

```
web/      React app (globe, panels, match centre)
server/   Hono API: providers, cache, mock mode, recorded fixtures
shared/   Types and competition config used by both
docs/     Design spec
```
