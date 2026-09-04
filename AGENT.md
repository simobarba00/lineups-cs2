# AGENT.md

Project context for AI coding agents working in this repository.

## What this is

**LINEUP'GO** is a vanilla (no-framework) client-side web app for Counter-Strike 2 utility (grenade) lineup lookup. It is meant to be run locally and used in a browser **during a live game**. It has no build step and no package manager: open the HTML and it works. There is a single data file that drives the whole UI.

All user-facing text is in **Italian**.

## Tech stack

- Plain HTML/CSS/JS. No frameworks, no dependencies, no bundler, no `package.json`.
- Files are loaded via `<script>` tags in `index.html` in order: `data/data.js`, `map.js`, `app.js`, `add-lineup.js`.
- `data/data.js` sets `window.DATABASE` (plain JS object, no fetch) so the app works when opening `index.html` directly from `file://` (no server needed for browsing).
- Because the browser blocks local `file://` resource requests in some cases and the File System Access API requires a secure context, run a static server to use the "Aggiungi lineup" auto-save:
  ```bash
  cd lineupsgo && python3 -m http.server 8000
  # open http://localhost:8000
  ```

## Project structure

```
index.html        — single page, three <section> "screens" (maps, map, detail) + add-lineup modal + setup-panel overlay
css/style.css     — dark gaming theme, all styling
data/
  data.js         — the LOCALE lineup database (untracked, in .gitignore; users edit this to add content)
js/
  map.js          — minimap rendering, pins, zoom/pan/pinch, side panel
  app.js          — screen navigation, filter state, event wiring
  add-lineup.js   — "Aggiungi lineup" modal + setup panel + File System Access API save logic
assets/
  icons/          — utility PNG icons (smoke.png, flash.png, he.png, molotov.png)
  mirage/
    minimap.png   — Mirage radar image
    lineups/      — per-lineup screenshots (LOCAL, untracked, in .gitignore)
      smokes/<name>/<name>_<uuid>.png
      flashes/<name>/<name>_<uuid>.png
      molotovs/<name>/<name>_<uuid>.png
      hes/<name>/<name>_<uuid>.png
README.md         — human-oriented docs (startup, adding maps/lineups)
.gitignore        — excludes data/data.js and assets/*/lineups/ (local, per-user data)
```

## App flow (3 screens)

1. **Map selection** — grid of available maps (currently only Mirage).
2. **Minimap with pins** — the map radar is shown with clickable pins. Each lineup has its own coordinates (`x`/`y`); lineups close together are clustered into a single pin. Filters in the top bar: utility type (All/Smoke/Flash/Molotov/HE) and side (CT/T, independent toggles). The minimap is zoomable/pannable. Clicking a pin opens the side panel with all the lineups in that cluster; when a cluster has more than one lineup, each row shows a CT (blue) / T (orange) badge.
3. **Detail** — two photos side by side (starting position, aim point). The utility type is shown as an **icon** chip at the **bottom-left** of the start photo, and the throw type as a chip at the **bottom-right** of the aim photo. **Modifica / Elimina** buttons sit at the **right** of the top bar. There is no CT/T badge on this screen.

## Screen dispatch

Screens are `<section>` elements with IDs `screen-maps`, `screen-map`, `screen-detail`. `showScreen(name)` toggles `.is-active` to switch. `app.js` wires the back buttons and the init calls `renderMaps()` + `showScreen("maps")`.

## Setup panel (on load)

On every load, `js/add-lineup.js` shows a `#setup-panel` overlay (the first thing the user sees) that gates the File System Access permissions. It is hidden only once **both** the project folder and `data/data.js` are `granted` (or were already granted in a prior session). It is independent of the three screens and sits above everything (`z-index: 200`). See Editing guidance and the File System Access pitfalls below for details.

## Data model — `data/data.js`

Sets global `DATABASE` (loaded via `<script>` tag, available synchronously):

```js
DATABASE = {
  maps: {
    mirage: {
      id, name,
      minimap, thumb,                // asset paths
      lineups: [ { ... } ]           // array of lineup objects
    }
  }
}
```

A **lineup** object (JSON keys):
- `id` — unique id (8-char hex) used to locate/replace the object block in `data/data.js` on edit/delete
- `util` — `"smoke" | "flash" | "molotov" | "he"` (icons exist for all four in `assets/icons/`; add/change them in `ICONS` and `UTIL_LABELS` in `js/map.js`)
- `side` — `"CT" | "T"`
- `name` — human-readable
- `start` — starting position name
- `throw` — free-text string (autocomplete suggestions via `<datalist>`; any value accepted)
- `x` / `y` — percentage coordinates (0-1) of the lineup's own position on the minimap
- `imgStart` / `imgAim` — screen paths for the two detail photos

Coordinates are **percentages** (0–1) of the minimap, so they stay valid for any radar image of the same map.

## Key logic

- `filterLineups(mapData, filter, sides)` — AND of utility type and side set (`js/map.js`).
- `buildClusters(lineups)` — greedily groups lineups whose `x`/`y` points are within `CLUSTER_RADIUS` (`0.025`, i.e. 2.5% of the map); each cluster exposes a center (`cx`, `cy`), its lineups, and the set of util types.
- `renderMinimap` — fills `#zoom-canvas` with the minimap `<img>` and one pin per cluster. A pin with >1 lineup shows a count badge. Clicking a pin opens the panel with all lineups in the cluster.
- `renderPinPanel(mapData, lineups)` — builds the side panel from an array of lineups (a cluster); `side-badge` is rendered **only when the cluster has more than one lineup** (`multi`).
- Zoom state lives in a module-level `zoom = { scale, x, y }`; `ZOOM_MIN = 1`, `ZOOM_MAX = 8`. `zoomAt(mx, my, factor)` does cursor-centered zoom. Zoom/pan/pinch handlers are bound once (`holder.dataset.zoomBound`) in `bindZoom`.

## Pins

- Pins are `<button class="pin">` absolutely positioned over the minimap via `left`/`top` percentages.
- A pin shows **only utility icons** (no text label): one `<img class="pin-icon">` per util type present in the cluster (smoke and/or flash, etc.), plus a `pin-count` badge smaller than other pins. The lineup/cluster name is available as the `title` tooltip.
- Icons are white PNGs referenced by `ICON_SMOKE` / `ICON_FLASH` constants in `js/map.js`.

## Side panel notes

- The panel is `.pin-panel`, hidden by default via `display: none`.
- The class `.is-open` is **only** used to show/hide it (`display: block`); it must NOT add flex/layout. The panel layout is a normal block column.
- The close button `#btn-close-panel` works by removing `.is-open` — this only works if `.pin-panel { display: none; }` and `.is-open { display: block; }` are valid CSS (no syntax errors before them in the file).

## Known pitfalls / gotchas

- **CSS syntax errors break showing/hiding.** A stray token like `}` followed by `>` in `style.css` corrupted the parser and made `.pin-panel` ignore `display: none`, so the panel and its close button were always visible and the toggle did nothing. Always keep the CSS valid; verify brace balance.
- Don't rely on `display: flex` to hide the panel — the side panel must use `display: none`/`display: block` only.
- All lineup objects **must** define `side`, otherwise `l.side.toLowerCase()` in the pin panel (`renderPinPanel`) throws and breaks the flow. (`showDetail` no longer reads `side`.)
- `filterLineups` and components depend on `currentFilter` and `currentSides` globals declared in `app.js`. Don't rename them without updating both files.

### File System Access API (js/add-lineup.js)

- `FileSystemDirectoryHandle.getDirectoryHandle()` and `FileSystemFileHandle`/`getFileHandle()` accept a **single path segment only**. Passing a multi-segment path like `"data/data.js"` or `"assets/mirage/..."` throws `Name is not allowed`/`NotAllowedError`. To reach a nested file you must descend one folder at a time: `await dir.getDirectoryHandle("data")` then `await dataDir.getFileHandle("data.js")`. (`saveImageToProject` walks `assets/<map>/lineups/<util>s/<target>` one segment per loop; `validateProjectDir` walks into `data` then reads `data.js`.)
- `showOpenFilePicker` / `showDirectoryPicker` must be called **synchronously within a user gesture** (e.g. inside the submit click handler), with **no intervening `await`** — otherwise they throw `SecurityError: user activation required`. Handles are cached in memory (`cachedFileHandle`/`cachedDirHandle`) and preloaded from IndexedDB so the picker is only opened from the click on first use.
- The File System Access API is **only available over `http(s)`/secure contexts**, not `file://`. Under `file://` the app falls back to copying the lineup snippet to the clipboard for manual paste into `data/data.js`.
- Directory picker grants a folder; the folder is validated to contain `data/data.js` before being stored. Wrong folder/file → `alert` in Italian and the pick is not persisted.
- Image filenames are `assets/<map>/lineups/<util>s/<name>/<name>_<8-char uuid>.png` (via `crypto.randomUUID`), where `<name>` is the lineup's name (used as the folder so start and aim photos never collide and don't depend on a start/target name).

## Editing guidance

- To add content (maps/lineups), edit **only `data/data.js`** and drop image assets into `assets/`. See `README.md`.
- `js/add-lineup.js` offers a UI to do this automatically (File System Access API, Chromium browsers over http). On page load a **setup panel** (`#setup-panel`) is shown as the first thing and guides the user to grant the two required permissions: (1) the project folder that contains `data/data.js`, and (2) the `data/data.js` file itself. The panel **stays until BOTH are `granted`** — it auto-hides when both are set, and previously-granted permissions skip the popup entirely on later loads. When a step is granted its "Scegli cartella/file" button is **removed and replaced with a green check** (`setStepState` + `.setup-check`). It validates picks (folder must contain `data/data.js`, file must contain `window.DATABASE`) and a **"Reset permessi"** button (`removeHandle("data-js")`/`removeHandle("project-dir")` + clearing the in-memory cache) makes the popup return.
- The add-lineup form lets the user **click a point on the minimap preview** (`#add-map-preview`) to set the lineup's `x`/`y`; the pin is stored in hidden `#add-x`/`#add-y` fields and shown as `.add-map-pin`. The preview updates when the selected map (`#add-map`) changes. On save it appends a lineup object (with `id`/`x`/`y`) to the `lineups` array of the selected map in `data/data.js` and copies chosen images into `assets/<map>/lineups/<util>s/<name>/<name>_<uuid>.png`. The regex-based `appendLineupToSource` injects the JS object literal; under `file://` (no API) it falls back to copying the snippet.
- The detail screen shows **Modifica / Elimina** buttons (`#btn-edit-lineup` / `#btn-delete-lineup`) in a `.detail-actions` group pushed to the right of the top bar (`margin-left: auto`), driven by `activeMapData`/`activeLineup` in `app.js`. Over each photo there is a `.chip` overlay: `#util-chip` (bottom-left) shows the utility **icon** (an `<img>` from `ICONS`, class `.chip-util-icon`), and `#throw-chip` (bottom-right) shows the throw text.
  - **Edit** (`openEditModal`) reuses the same modal prefilled; the map select is disabled; if no new photos are picked the existing `imgStart`/`imgAim` are kept. On save it replaces the block in place (`replaceLineupInSource`) and updates memory (`upsertLineupInMemory`), then returns to the map screen.
  - **Delete** (`deleteLineup`) confirms in Italian, removes the source block (`replaceLineupInSource(..., null)`) plus memory entry (`removeLineupFromMemory`) and returns to the map screen. It also deletes the lineup's two image files from disk (`deleteProjectFiles`, walking the project dir handle segment-by-segment); failures are best-effort and orphaned folders are left in place.
  - `locateLineupBlock(source, id)` finds the lineup object block by `id:` and `replaceLineupInSource` swaps or removes it, correctly handling the separating comma for first/last/middle positions.
- Keep the dark gaming aesthetic and Italian UI labels.
- No comments should be added to code unless requested.
