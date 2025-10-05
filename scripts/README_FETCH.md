
# Army Forge -> Local JSON (250 pts each, with images)

This script fetches **all official Grimdark Future: Firefight** armies from Army Forge,
builds a **250 points** team per army, and writes JSON to `public/data/teams/<uid>/team.json`.
Each unit gets a **unique SVG** saved at `public/assets/armies/<uid>/<unit>.svg`, and the JSON
links to it via `image` field.

## Requirements
- Node.js 18+ (uses global `fetch`)

## Run
```bash
node scripts/fetch_armyforge_teams.mjs
```

Optional: add to your package.json
```json
"scripts": {
  "fetch:armies": "node scripts/fetch_armyforge_teams.mjs"
}
```

## What it does
1. Loads all pages of the official Firefight list:
   `GET /api/army-books?filters=official&gameSystemSlug=grimdark-future-firefight&page=N...`
2. For each army (`uid`), loads:
   `GET /api/army-books/<uid>?gameSystem=3`
3. Converts entries into internal units (with robust fallbacks).
4. Greedy-packs units up to **250 pts** (tries to include a leader-type if present).
5. Writes:
   - `public/data/teams/<uid>/team.json`
   - `public/assets/armies/<uid>/*.svg`

If some entries do not expose clear points, a heuristic based on stats (quality/defense/attacks/wounds) is used.
