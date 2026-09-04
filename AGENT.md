# AGENT.md

Project context for AI coding agents working in this repository.

## What this is

**LINEUP'GO** is an Electron desktop app for Counter-Strike 2 utility (grenade) lineup lookup. Built with vanilla HTML/CSS/JS (no framework, no build step). All user-facing text is in **Italian**.

## Run

```sh
npm start          # launch Electron app
npm run dist       # build distributable (win/mac/linux)
```

No linter, no typecheck, no tests. Verify changes by launching `npm start`.

## Tech stack

- Electron 44 (Chromium). Main process + renderer with `contextIsolation: true`, `nodeIntegration: false`.
- Vanilla HTML/CSS/JS loaded via `<script>` tags in `index.html`. No framework, no bundler.
- Data is plain JSON (not JS), loaded via IPC (`window.electronAPI.readData()`), not `fetch()`.

## Project structure

```
main.js              — Electron main process: custom app:// protocol, IPC handlers, bootstrap
preload.js           — contextBridge: readData, writeData, saveImage, deleteFolder
index.html           — single page, three <section> screens + add-lineup modal
css/style.css        — dark gaming theme
js/
  app.js             — screen navigation, data loading, filter state, initApp()
  map.js             — minimap rendering, pins, zoom/pan/pinch, side panel
  add-lineup.js      — add/edit/delete lineup via IPC; image save/delete
data/
  data.template.json — seed file, copied to appdata on first run
assets/
  icons/             — utility PNG icons
  {map}/minimap.png  — radar images (static, in bundle)
```

## Electron architecture

### Custom protocol (`app://localhost/...`)

1. Check `%APPDATA%/lineups-cs2/lineups/{path}` (userData) — serves live data + user images.
2. Fall back to `__dirname/{path}` (bundle) — serves static assets (minimaps, css, js, icons).
3. If neither exists — serves `index.html` (SPA fallback).

### IPC handlers (main.js → preload.js → renderer)

| Channel | Args | Description |
|---|---|---|
| `fs:readData` | — | Returns `data.json` as UTF-8 string |
| `fs:writeData` | `content` | Atomic write (tmp + rename) to `data.json` |
| `fs:saveImage` | `rel`, `buffer` | Saves image to `%APPDATA%/lineups/{rel}` |
| `fs:deleteFolder` | `rel` | Recursively deletes `%APPDATA%/lineups/{rel}` |

## Data

### Where things live

```
%APPDATA%/lineups-cs2/
  lineups/
    data.json                    ← live database (all maps + lineups)
    assets/{lineup_id}/
      start.png                  ← screenshot from standing position
      aim.png                    ← screenshot of crosshair placement
```

### data.json format

```json
{
  "maps": {
    "<mapId>": {
      "id": "anubis",
      "name": "Anubis",
      "minimap": "assets/anubis/minimap.png",
      "thumb": "assets/anubis/minimap.png",
      "lineups": [
        {
          "id": "07e2d7c0",
          "util": "molotov",
          "side": "T",
          "name": "Molly Colonne da Connector",
          "start": "",
          "throw": "Jump Throw",
          "x": 0.398,
          "y": 0.507
        }
      ]
    }
  }
}
```

- `x`, `y` — normalized 0–1 coordinates on the minimap.
- `util` — `"molotov"`, `"smoke"`, `"flash"`, `"he"`.
- `side` — `"T"` or `"CT"`.
- `throw` — free text (e.g. `"Jump Throw"`, `"Left Jump Throw"`, `"Run Throw"`, `"Throw"`).
- `id` — 8-char hex string, used to derive image paths: `assets/{id}/start.png`, `assets/{id}/aim.png`.
- **No `imgStart`/`imgAim` fields** — image paths are always derived from the lineup `id`.

### data.template.json

Seed file. Copied to `%APPDATA%/lineups-cs2/lineups/data.json` on first run if that file doesn't exist. Maps are pre-defined; lineups should be empty.

## App flow (3 screens)

1. **Map selection** — grid of available maps with minimap thumbnails.
2. **Minimap with pins** — minimap with clickable pins. Each lineup has `x`/`y` coordinates; nearby lineups are clustered. Filters in top bar: utility type and side.
3. **Detail** — two photos (start position, aim point) with utility icon chip and throw type chip. Modifica/Elimina buttons in top bar.

## Screen dispatch

Screens are `<section>` elements with IDs `screen-maps`, `screen-map`, `screen-detail`. `showScreen(name)` toggles `.is-active`. `app.js` wires back buttons; `initApp()` loads data asynchronously then calls `renderMaps()` + `showScreen("maps")`.

## Key logic

- `filterLineups(mapData, filter, sides)` — AND of utility type and side set (`js/map.js`).
- `buildClusters(lineups)` — greedily groups lineups within `CLUSTER_RADIUS` (0.025); each cluster has center (`cx`, `cy`), lineups, and util type set.
- `renderMinimap` — fills `#zoom-canvas` with minimap `<img>` and one pin per cluster.
- `renderPinPanel(mapData, lineups)` — builds side panel from a cluster's lineups.
- Zoom state: module-level `zoom = { scale, x, y }`, `ZOOM_MIN = 1`, `ZOOM_MAX = 8`. `zoomAt(mx, my, factor)` for cursor-centered zoom.

## Image storage

Images are saved to `%APPDATA%/lineups-cs2/lineups/assets/{lineup_id}/start.png` (or `.jpg`) and `aim.png` (or `.jpg`). The path is derived from the lineup's `id` — no path is stored in `data.json`. Saving writes the file; deleting removes the entire `assets/{id}/` folder. Display reads from `assets/${lineup.id}/start.png` at runtime.

## Known quirks

- `crypto.randomUUID()` fails in Electron renderer on `app://` — use `crypto.getRandomValues()` instead.
- `fetch()` doesn't support `app://` scheme — always use IPC for reading/writing data.
- All lineup objects must define `side`, otherwise `l.side.toLowerCase()` in the pin panel throws.
- `filterLineups` and components depend on `currentFilter` and `currentSides` globals in `app.js`.
- CSS syntax errors break show/hide toggling — keep CSS valid, verify brace balance.
- `.gitignore` excludes `/assets/*/lineups/` (old format, can be cleaned up).
