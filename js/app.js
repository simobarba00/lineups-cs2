/* ============================================================
   LINEUP'GO — NAVIGAZIONE + FILTRO
   ============================================================ */

let currentMapId = null;
let currentFilter = "all";   // "all" | "smoke" | "flash" | "molotov" | "he"
let currentSides = new Set(["CT", "T"]);   // subset di {"CT","T"}

const screens = {
  maps: document.getElementById("screen-maps"),
  map: document.getElementById("screen-map"),
  detail: document.getElementById("screen-detail")
};

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("is-active", key === name);
  });
  window.scrollTo(0, 0);
}

/* ---------- SCHERMATA 1: mappe ---------- */
function renderMaps() {
  const grid = document.getElementById("map-grid");
  grid.innerHTML = "";

  Object.values(DATABASE.maps).forEach(m => {
    const card = document.createElement("div");
    card.className = "map-card";
    card.innerHTML = `
      <img class="map-thumb" src="${m.thumb}" alt="${m.name}" />
      <div class="map-name">${m.name}</div>
      <div class="map-count">${m.lineups.length} lineups</div>
    `;
    card.addEventListener("click", () => openMap(m.id));
    grid.appendChild(card);
  });
}

function openMap(mapId) {
  currentMapId = mapId;
  currentFilter = "all";
  currentSides = new Set(["CT", "T"]);
  document.getElementById("map-title").textContent = DATABASE.maps[mapId].name;
  setFilterUI();
  setSideUI();
  resetZoom();
  renderMinimap(DATABASE.maps[mapId], currentFilter);
  showScreen("map");
}

/* ---------- FILTRO ---------- */
function setFilterUI() {
  document.querySelectorAll(".filter-btn[data-filter]").forEach(b => {
    b.classList.toggle("is-active", b.dataset.filter === currentFilter);
  });
}

function setSideUI() {
  document.querySelectorAll("#side-filter .side-btn").forEach(b => {
    b.classList.toggle("is-active", currentSides.has(b.dataset.side));
  });
}

document.getElementById("filter").addEventListener("click", e => {
  const btn = e.target.closest(".filter-btn");
  if (!btn || !currentMapId) return;
  currentFilter = btn.dataset.filter;
  setFilterUI();
  renderMinimap(DATABASE.maps[currentMapId], currentFilter);
});

/* toggle indipendente CT/T: entrambi selezionabili o solo uno */
document.getElementById("side-filter").addEventListener("click", e => {
  const btn = e.target.closest(".side-btn");
  if (!btn || !currentMapId) return;
  const side = btn.dataset.side;
  if (currentSides.has(side)) currentSides.delete(side);
  else currentSides.add(side);
  setSideUI();
  renderMinimap(DATABASE.maps[currentMapId], currentFilter);
});

/* ---------- Zoom buttons ---------- */
document.getElementById("zoom-in").addEventListener("click", () => {
  const holder = document.getElementById("minimap-holder");
  const rect = holder.getBoundingClientRect();
  zoomAt(rect.width / 2, rect.height / 2, 1.3);
});
document.getElementById("zoom-out").addEventListener("click", () => {
  const holder = document.getElementById("minimap-holder");
  const rect = holder.getBoundingClientRect();
  zoomAt(rect.width / 2, rect.height / 2, 1 / 1.3);
});
document.getElementById("zoom-reset").addEventListener("click", () => {
  resetZoom();
  applyZoom();
});

/* ---------- Selezione pin ---------- */
function onPinSelect(mapData, lineups) {
  renderPinPanel(mapData, lineups);
}

/* ---------- SCHERMATA 3: dettaglio lineup ---------- */
let activeMapData = null;
let activeLineup = null;

function showDetail(mapData, lineup) {
  activeMapData = mapData;
  activeLineup = lineup;

  document.getElementById("detail-title").textContent = `${mapData.name} — ${lineup.name}`;

  const utilChip = document.getElementById("util-chip");
  utilChip.textContent = "";
  const utilIcon = document.createElement("img");
  utilIcon.className = "chip-util-icon";
  utilIcon.src = ICONS[lineup.util];
  utilIcon.alt = utilLabelName(lineup.util);
  utilIcon.draggable = false;
  utilChip.appendChild(utilIcon);
  document.getElementById("throw-chip").textContent = lineup.throw;

  document.getElementById("img-start").src = `assets/${lineup.id}/start.jpg`;
  document.getElementById("img-aim").src = `assets/${lineup.id}/aim.jpg`;

  showScreen("detail");
}

document.getElementById("btn-edit-lineup").addEventListener("click", () => {
  if (activeMapData && activeLineup) {
    openEditModal(activeMapData.id, activeLineup);
  }
});

document.getElementById("btn-delete-lineup").addEventListener("click", () => {
  if (!activeMapData || !activeLineup) return;
  if (!confirm(`Eliminare la lineup "${activeLineup.name}"?`)) return;
  const mapId = activeMapData.id;
  const lineupId = activeLineup.id;
  deleteLineup(mapId, lineupId).then(ok => {
    if (!ok) return;
    activeLineup = null;
    activeMapData = null;
    showScreen("map");
  });
});

/* ---------- Back navigation ---------- */
document.getElementById("btn-back-maps").addEventListener("click", () => {
  currentMapId = null;
  showScreen("maps");
});

document.getElementById("btn-back-map").addEventListener("click", () => {
  if (currentMapId) {
    renderMinimap(DATABASE.maps[currentMapId], currentFilter);
    showScreen("map");
  }
});

document.getElementById("btn-close-panel").addEventListener("click", () => {
  document.getElementById("pin-panel").classList.remove("is-open");
});

/* ---------- Init ---------- */
function initApp() {
  renderMaps();
  showScreen("maps");
}
