/* ============================================================
   LINEUP'GO — RENDERING MINIMAPPA + PIN + ZOOM
   ============================================================ */

const zoom = { scale: 1, x: 0, y: 0 };
const ZOOM_MIN = 1, ZOOM_MAX = 8;

function resetZoom() { zoom.scale = 1; zoom.x = 0; zoom.y = 0; }

function applyZoom() {
  const canvas = document.getElementById("zoom-canvas");
  if (!canvas) return;
  canvas.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
  const label = document.getElementById("zoom-label");
  if (label) label.textContent = `${Math.round(zoom.scale * 100)}%`;
}

/* Zoom concentrico sul punto dato (coordinate relative al holder) */
function zoomAt(mouseX, mouseY, factor) {
  const old = zoom.scale;
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, old * factor));
  if (next === old) return;
  const k = next / old;
  zoom.x = mouseX - (mouseX - zoom.x) * k;
  zoom.y = mouseY - (mouseY - zoom.y) * k;
  zoom.scale = next;
  applyZoom();
}

/* Restituisce i lineup di una mappa per un certo filtro ("all"|"smoke"|"flash")
   e un set di side ("CT"|"T"). Combina i due in AND. */
function filterLineups(mapData, filter, sides) {
  return mapData.lineups.filter(l =>
    (filter === "all" || l.util === filter) &&
    sides.has(l.side)
  );
}

const ICONS = {
  smoke: "assets/icons/smoke.png",
  flash: "assets/icons/flash.png",
  molotov: "assets/icons/molotov.png",
  he: "assets/icons/he.png"
};
const ICON_SMOKE = ICONS.smoke;
const ICON_FLASH = ICONS.flash;
const CLUSTER_RADIUS = 0.025;

/* Raggruppa le lineup vicine in cluster. Algoritmo greedy. */
function buildClusters(lineups) {
  const clusters = [];

  lineups.forEach(l => {
    let merged = false;
    for (const c of clusters) {
      const dx = l.x - c.cx;
      const dy = l.y - c.cy;
      if (Math.hypot(dx, dy) <= CLUSTER_RADIUS) {
        const n = c.lineups.length;
        c.cx = (c.cx * n + l.x) / (n + 1);
        c.cy = (c.cy * n + l.y) / (n + 1);
        c.lineups.push(l);
        c.utilTypes.add(l.util);
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push({
        cx: l.x,
        cy: l.y,
        lineups: [l],
        utilTypes: new Set([l.util])
      });
    }
  });

  return clusters;
}

/* Render del minimap + pin dentro il #zoom-canvas */
function renderMinimap(mapData, filter) {
  const holder = document.getElementById("minimap-holder");
  const canvas = document.getElementById("zoom-canvas");
  canvas.innerHTML = "";

  const img = document.createElement("img");
  img.src = mapData.minimap;
  img.alt = mapData.name;
  img.draggable = false;
  canvas.appendChild(img);

  const filtered = filterLineups(mapData, filter, currentSides);
  const clusters = buildClusters(filtered);

  clusters.forEach(c => {
    const el = document.createElement("button");
    el.className = "pin";
    el.style.left = `${c.cx * 100}%`;
    el.style.top = `${c.cy * 100}%`;
    el.title = c.lineups.length === 1 ? c.lineups[0].name : `${c.lineups.length} lineups`;

    if (c.lineups.length > 1) {
      const badge = document.createElement("span");
      badge.className = "pin-count";
      badge.textContent = c.lineups.length;
      el.appendChild(badge);
    }

    c.utilTypes.forEach(u => {
      const ic = document.createElement("img");
      ic.className = "pin-icon";
      ic.src = ICONS[u] || ICON_SMOKE;
      ic.alt = u;
      ic.draggable = false;
      el.appendChild(ic);
    });

    el.addEventListener("click", () => onPinSelect(mapData, c.lineups));
    canvas.appendChild(el);
  });

  applyZoom();
  renderPinPanel(null);

  /* lega i gestori di zoom/pan una sola volta */
  if (!holder.dataset.zoomBound) {
    holder.dataset.zoomBound = "1";
    bindZoom(holder);
  }
}

/* ---------- ZOOM / PAN ---------- */

function bindZoom(holder) {
  holder.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = holder.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    zoomAt(mx, my, factor);
  }, { passive: false });

  /* drag-to-pan con mouse */
  let dragging = false, moved = false;
  let startX = 0, startY = 0, startZoom = null;

  holder.addEventListener("mousedown", e => {
    if (e.target.closest(".pin") || e.target.closest(".zoom-controls")) return;
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    startZoom = { ...zoom };
    holder.classList.add("is-grabbing");
  });

  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    if (moved) {
      zoom.x = startZoom.x + dx;
      zoom.y = startZoom.y + dy;
      applyZoom();
    }
  });

  window.addEventListener("mouseup", () => {
    if (dragging && moved) {
      /* se è stato un drag, sopprimi il click successivo sul pin */
      suppressNextClick();
    }
    dragging = false;
    holder.classList.remove("is-grabbing");
  });

  let suppressUntil = 0;
  function suppressNextClick() { suppressUntil = Date.now() + 300; }
  holder.addEventListener("click", e => {
    if (Date.now() < suppressUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  /* pinch-to-zoom touch */
  let pinch = null;
  holder.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      pinch = { dist: touchDist(e), cx: 0, cy: 0, start: { ...zoom } };
      const rect = holder.getBoundingClientRect();
      const c = pinchCenter(e);
      pinch.cx = c.x - rect.left; pinch.cy = c.y - rect.top;
    }
  }, { passive: true });

  holder.addEventListener("touchmove", e => {
    if (e.touches.length === 2 && pinch) {
      e.preventDefault();
      const d = touchDist(e);
      const factor = d / pinch.dist;
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch.start.scale * factor));
      const k = next / (pinch.start.scale || 1);
      zoom.x = pinch.cx - (pinch.cx - pinch.start.x) * k;
      zoom.y = pinch.cy - (pinch.cy - pinch.start.y) * k;
      zoom.scale = next || 1;
      applyZoom();
    }
  }, { passive: false });

  holder.addEventListener("touchend", () => { pinch = null; });
}

function touchDist(e) {
  return Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY);
}
function pinchCenter(e) {
  return {
    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
    y: (e.touches[0].clientY + e.touches[1].clientY) / 2
  };
}

/* ---- Pannello laterale ---- */

function renderPinPanel(mapData, lineups) {
  const panel = document.getElementById("pin-panel");

  if (!mapData || !lineups || !lineups.length) {
    panel.classList.remove("is-open");
    return;
  }

  const titles = [...new Set(lineups.map(l => l.util))];
  const utilLabel = titles.map(utilLabelName).join(" / ");

  const title = lineups.length === 1 ? lineups[0].name : `${lineups.length} lineups`;
  panel.querySelector(".panel-title").textContent = title;
  panel.querySelector("#pin-util-label").textContent = utilLabel;

  const multi = lineups.length > 1;

  const list = document.getElementById("start-list");
  list.innerHTML = "";

  lineups.forEach(l => {
    const btn = document.createElement("button");
    btn.className = "start-item";
    const badge = multi
      ? `<span class="side-badge side-${l.side.toLowerCase()}">${l.side}</span>`
      : "";
    const utilIcon = ICONS[l.util] || ICON_SMOKE;
    btn.innerHTML = `
      <div class="start-top">
        <div class="start-item-head">
          <img class="pin-icon start-util-icon" src="${utilIcon}" alt="${l.util}" />
          <div class="start-name">${escapeHtml(l.start)}</div>
        </div>
        ${badge}
      </div>
      <div class="start-meta">${escapeHtml(l.name)}</div>
      <div class="start-meta">${escapeHtml(l.throw)}</div>
    `;
    btn.addEventListener("click", () => showDetail(mapData, l));
    list.appendChild(btn);
  });

  panel.classList.add("is-open");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const UTIL_LABELS = { smoke: "Smoke", flash: "Flash", molotov: "Molotov", he: "HE" };
function utilLabelName(u) { return UTIL_LABELS[u] || u; }
