/* ============================================================
   LINEUP'GO — AGGIUNGI LINEUP
   ============================================================ */

/* ---------- file name display ---------- */

document.getElementById("add-imgstart").addEventListener("change", e => {
  const name = e.target.files[0]?.name || "";
  document.getElementById("add-imgstart-name").textContent = name;
});
document.getElementById("add-imgaim").addEventListener("change", e => {
  const name = e.target.files[0]?.name || "";
  document.getElementById("add-imgaim-name").textContent = name;
});

/* ---------- populate selects ---------- */

function populateMapSelect() {
  const select = document.getElementById("add-map");
  select.innerHTML = "";
  Object.values(DATABASE.maps).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    select.appendChild(opt);
  });
}

/* ---------- mini-mappa nel form ---------- */

function setMapPreview(mapId) {
  const preview = document.getElementById("add-map-preview");
  const img = document.getElementById("add-map-preview-img");
  const pin = document.getElementById("add-map-pin");
  const hint = document.getElementById("add-map-hint");
  const xIn = document.getElementById("add-x");
  const yIn = document.getElementById("add-y");

  xIn.value = "";
  yIn.value = "";
  pin.classList.remove("is-visible");
  hint.classList.remove("is-hidden");

  const mapData = DATABASE.maps[mapId];
  if (!mapData) { img.removeAttribute("src"); return; }
  img.src = mapData.minimap;
}

function resetMapPreview() {
  setMapPreview(document.getElementById("add-map").value);
}

function resetForm() {
  document.getElementById("form-add-lineup").reset();
  document.getElementById("add-imgstart-name").textContent = "";
  document.getElementById("add-imgaim-name").textContent = "";
  populateMapSelect();
  const mapId = currentMapId || Object.keys(DATABASE.maps)[0];
  document.getElementById("add-map").value = mapId;
  resetMapPreview();
}

document.getElementById("add-map").addEventListener("change", e => {
  setMapPreview(e.target.value);
});

function placePin(clientX, clientY) {
  const preview = document.getElementById("add-map-preview");
  const img = document.getElementById("add-map-preview-img");
  const pin = document.getElementById("add-map-pin");
  const rect = preview.getBoundingClientRect();

  let px = (clientX - rect.left) / rect.width;
  let py = (clientY - rect.top) / rect.height;
  px = Math.max(0, Math.min(1, px));
  py = Math.max(0, Math.min(1, py));

  document.getElementById("add-x").value = px;
  document.getElementById("add-y").value = py;
  document.getElementById("add-map-hint").classList.add("is-hidden");
  pin.style.left = `${px * 100}%`;
  pin.style.top = `${py * 100}%`;
  pin.classList.add("is-visible");
}

document.getElementById("add-map-preview").addEventListener("click", e => {
  e.preventDefault();
  placePin(e.clientX, e.clientY);
});

/* ---------- modal open / close ---------- */

let editingLineup = null;

function setModalMode(isEdit) {
  document.getElementById("modal-title").textContent = isEdit ? "Modifica Lineup" : "Aggiungi Lineup";
  document.getElementById("btn-submit-lineup").textContent = isEdit ? "Salva" : "Aggiungi";
}

function openModal() {
  editingLineup = null;
  resetForm();
  resetMapPreview();
  document.getElementById("add-map").disabled = false;
  setModalMode(false);
  document.getElementById("modal-add-lineup").classList.add("is-open");
}

function openEditModal(mapId, lineup) {
  editingLineup = lineup;
  resetForm();
  populateMapSelect();

  document.getElementById("add-map").value = mapId;
  document.getElementById("add-map").disabled = true;

  document.getElementById("add-util").value = lineup.util;
  document.getElementById("add-side").value = lineup.side;
  document.getElementById("add-name").value = lineup.name;
  document.getElementById("add-throw").value = lineup.throw;

  setMapPreview(mapId);
  const xIn = document.getElementById("add-x");
  const yIn = document.getElementById("add-y");
  xIn.value = lineup.x;
  yIn.value = lineup.y;
  const pin = document.getElementById("add-map-pin");
  pin.style.left = `${lineup.x * 100}%`;
  pin.style.top = `${lineup.y * 100}%`;
  pin.classList.add("is-visible");
  document.getElementById("add-map-hint").classList.remove("is-hidden");

  setModalMode(true);
  document.getElementById("modal-add-lineup").classList.add("is-open");
}

function closeModal() {
  document.getElementById("modal-add-lineup").classList.remove("is-open");
  editingLineup = null;
}

document.getElementById("btn-add-lineup-maps").addEventListener("click", openModal);
document.getElementById("btn-add-lineup-map").addEventListener("click", openModal);
document.getElementById("btn-close-modal").addEventListener("click", closeModal);
document.getElementById("btn-cancel-add").addEventListener("click", closeModal);
document.getElementById("modal-add-lineup").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeModal();
});

/* ---------- form -> lineup ---------- */

function parseLineupFromForm() {
  const editing = editingLineup;
  return {
    id: editing ? editing.id : uuidShort(),
    util: document.getElementById("add-util").value,
    side: document.getElementById("add-side").value,
    name: document.getElementById("add-name").value.trim(),
    start: editing ? editing.start : "",
    throw: document.getElementById("add-throw").value,
    x: parseFloat(document.getElementById("add-x").value),
    y: parseFloat(document.getElementById("add-y").value)
  };
}

/* ---------- save images to project ---------- */

function uuidShort() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function saveImageToProject(lineupId, type, file) {
  const ext = file.name.split(".").pop();
  const rel = `assets/${lineupId}/${type}.${ext}`;
  const buffer = await file.arrayBuffer();
  await window.electronAPI.saveImage(rel, buffer);
  return rel;
}

async function deleteLineupAssets(lineupId) {
  await window.electronAPI.deleteFolder(`assets/${lineupId}`);
}

/* ---------- submit ---------- */

document.getElementById("form-add-lineup").addEventListener("submit", async e => {
  e.preventDefault();

  const mapId = document.getElementById("add-map").value;
  const lineup = parseLineupFromForm();
  if (!lineup.name) return;
  if (isNaN(lineup.x) || isNaN(lineup.y)) {
    alert("Seleziona un punto sulla mappa.");
    return;
  }

  const imgStartFile = document.getElementById("add-imgstart").files[0];
  const imgAimFile = document.getElementById("add-imgaim").files[0];
  const isEdit = editingLineup !== null;

  try {
    if (imgStartFile) {
      await saveImageToProject(lineup.id, "start", imgStartFile);
    }
    if (imgAimFile) {
      await saveImageToProject(lineup.id, "aim", imgAimFile);
    }

    const db = JSON.parse(await window.electronAPI.readData());
    const arr = db.maps[mapId].lineups;

    if (isEdit) {
      const idx = arr.findIndex(l => l.id === lineup.id);
      if (idx !== -1) arr[idx] = lineup;
      else arr.push(lineup);
    } else {
      arr.push(lineup);
    }

    await window.electronAPI.writeData(JSON.stringify(db, null, 2));

    if (isEdit) {
      upsertLineupInMemory(mapId, lineup);
    } else {
      addLineupToMemory(mapId, lineup);
    }
    closeModal();
    refreshUI(mapId);
    if (isEdit) showScreen("map");
  } catch (err) {
    console.error("[LINEUP'GO] Save failed:", err);
    alert("Errore: " + err.message);
  }
});

function addLineupToMemory(mapId, lineup) {
  if (DATABASE.maps[mapId]) {
    DATABASE.maps[mapId].lineups.push(lineup);
  }
}

function upsertLineupInMemory(mapId, lineup) {
  const arr = DATABASE.maps[mapId].lineups;
  const idx = arr.findIndex(l => l.id === lineup.id);
  if (idx !== -1) {
    arr[idx] = lineup;
  } else {
    arr.push(lineup);
  }
}

function removeLineupFromMemory(mapId, lineupId) {
  DATABASE.maps[mapId].lineups =
    DATABASE.maps[mapId].lineups.filter(l => l.id !== lineupId);
}

async function deleteLineup(mapId, lineupId) {
  try {
    const db = JSON.parse(await window.electronAPI.readData());
    const lineup = db.maps[mapId].lineups.find(l => l.id === lineupId);
    db.maps[mapId].lineups = db.maps[mapId].lineups.filter(l => l.id !== lineupId);

    await window.electronAPI.writeData(JSON.stringify(db, null, 2));

    removeLineupFromMemory(mapId, lineupId);

    if (lineup) {
      await deleteLineupAssets(lineupId);
    }

    refreshUI(mapId);
    return true;
  } catch (err) {
    console.error("[LINEUP'GO] Delete failed:", err);
    alert("Errore: " + err.message);
    return false;
  }
}

function refreshUI(mapId) {
  if (currentMapId) renderMinimap(DATABASE.maps[currentMapId], currentFilter);
  renderMaps();
}
