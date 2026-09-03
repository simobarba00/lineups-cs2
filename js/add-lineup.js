/* ============================================================
   LINEUP'GO — AGGIUNGI LINEUP
   ============================================================ */

const IDB_NAME = "lineupgo-db";
const IDB_STORE = "file-handles";
const DB_VERSION = 1;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getHandle(key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(key, handle) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const req = tx.objectStore(IDB_STORE).put(handle, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function removeHandle(key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const req = tx.objectStore(IDB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ---------- project directory handle ---------- */

let cachedDirHandle = null;

async function ensureProjectDir() {
  if (cachedDirHandle) return cachedDirHandle;
  const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  if (!(await validateProjectDir(dirHandle))) {
    alert("La cartella scelta non contiene data/data.js. Scegli la cartella del progetto.");
    return null;
  }
  cachedDirHandle = dirHandle;
  await saveHandle("project-dir", dirHandle);
  return dirHandle;
}

async function validateProjectDir(dirHandle) {
  try {
    const dataDir = await dirHandle.getDirectoryHandle("data");
    await dataDir.getFileHandle("data.js");
    return true;
  } catch (err) {
    return false;
  }
}

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

/* ---------- data/data.js read/write ---------- */

async function readDataJS(fileHandle) {
  return await (await fileHandle.getFile()).text();
}

let cachedFileHandle = null;

async function ensureFileHandle() {
  if (cachedFileHandle) return cachedFileHandle;
  [cachedFileHandle] = await window.showOpenFilePicker({
    types: [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }],
    multiple: false
  });
  if (!(await validateDataFile(cachedFileHandle))) {
    cachedFileHandle = null;
    alert("Il file scelto non è il database (manca window.DATABASE). Scegli data/data.js.");
    return null;
  }
  await saveHandle("data-js", cachedFileHandle);
  return cachedFileHandle;
}

async function validateDataFile(fileHandle) {
  try {
    const text = await (await fileHandle.getFile()).text();
    return text.includes("window.DATABASE");
  } catch (err) {
    return false;
  }
}

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
    y: parseFloat(document.getElementById("add-y").value),
    imgStart: editing ? editing.imgStart : "",
    imgAim: editing ? editing.imgAim : ""
  };
}

function generateLineupCode(lineup) {
  const i = "          ";
  return `${i}{
${i}  id: "${lineup.id}",
${i}  util: "${lineup.util}",
${i}  side: "${lineup.side}",
${i}  name: "${lineup.name}",
${i}  start: "${lineup.start}",
${i}  throw: "${lineup.throw}",
${i}  x: ${lineup.x},
${i}  y: ${lineup.y},
${i}  imgStart: "${lineup.imgStart}",
${i}  imgAim: "${lineup.imgAim}"
${i}}`;
}

function appendLineupToSource(source, mapId, lineupCode) {
  const re = new RegExp(`(${mapId}\\s*:\\s*\\{[\\s\\S]*?lineups\\s*:\\s*\\[)([\\s\\S]*?)(\\])`);
  const m = source.match(re);
  if (!m) return null;
  const existing = m[2].trim();
  const newContent = existing ? existing + ",\n" + lineupCode : lineupCode;
  return source.replace(m[0], m[1] + "\n" + newContent + "\n        " + m[3]);
}

/* Trova il blocco di una lineup (da "{" prima di `id:` fino alla "}" di chiusura
   del suo oggetto) dato un id univoco. Restituisce { start, end, block }. */
function locateLineupBlock(source, lineupId) {
  const idIdx = source.indexOf(`id: "${lineupId}"`);
  if (idIdx === -1) return null;

  const open = source.lastIndexOf("{", idIdx);
  if (open === -1) return null;

  let depth = 0, end = -1;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;

  return { start: open, end, block: source.slice(open, end + 1) };
}

/* Sostituisce il blocco della lineup con lineupCode, oppure lo rimuove se
   lineupCode === null. Gestisce la virgola di separazione tra gli elementi. */
function replaceLineupInSource(source, lineupId, lineupCode) {
  const loc = locateLineupBlock(source, lineupId);
  if (!loc) return null;

  const { start, end } = loc;

  if (lineupCode === null) {
    let removeStart = start;
    let removeEnd = end + 1;
    /* se il blocco ha una virgola dopo, consumala (caso non-ultimo) */
    const afterMatch = source.slice(end + 1).match(/^\s*,\s*/);
    if (afterMatch) {
      removeEnd = end + 1 + afterMatch[0].length;
    } else {
      /* ultimo elemento: rimuovi la virgola che lo precede */
      const beforeMatch = source.slice(0, start).match(/,\s*$/);
      if (beforeMatch) removeStart = start - beforeMatch[0].length;
    }
    return (source.slice(0, removeStart) + source.slice(removeEnd))
      .replace(/\n{3,}/g, "\n\n");
  }

  return source.slice(0, start) + lineupCode + source.slice(end + 1);
}

/* ---------- save images to project ---------- */

function safeSegment(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
}

async function saveImageToProject(projectDir, mapId, util, name, file) {
  const ext = file.name.split(".").pop();
  const segments = [
    "assets",
    safeSegment(mapId),
    "lineups",
    `${safeSegment(util)}s`,
    safeSegment(name)
  ];
  let dirHandle = projectDir;
  for (const seg of segments) {
    dirHandle = await dirHandle.getDirectoryHandle(seg, { create: true });
  }
  const fileName = `${safeSegment(name)}_${uuidShort()}.${ext}`;
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return `${segments.join("/")}/${fileName}`;
}

function uuidShort() {
  return crypto.randomUUID().slice(0, 8);
}

/* Elimina dei file nel progetto dato il loro percorso relativo (es. "assets/.../x.png").
   Best-effort: se un file manca, continua con gli altri. */
async function deleteProjectFiles(projectDir, paths) {
  if (!projectDir) return;

  const unique = [...new Set(paths.filter(p => typeof p === "string" && p.startsWith("assets/") && p.length))];
  for (const path of unique) {
    try {
      const segments = path.split("/");
      const fileName = segments.pop();
      let dirHandle = projectDir;
      for (const seg of segments) {
        dirHandle = await dirHandle.getDirectoryHandle(seg);
      }
      const fileHandle = await dirHandle.getFileHandle(fileName);
      await fileHandle.remove();
    } catch (err) {
      /* file già assente o permessi: ignora */
    }
  }
}

/* ---------- submit ---------- */

document.getElementById("form-add-lineup").addEventListener("submit", async e => {
  e.preventDefault();

  const mapId = document.getElementById("add-map").value;
  const lineup = parseLineupFromForm();
  if (!lineup.name || !lineup.start) return;
  if (isNaN(lineup.x) || isNaN(lineup.y)) {
    alert("Seleziona un punto sulla mappa.");
    return;
  }

  const imgStartFile = document.getElementById("add-imgstart").files[0];
  const imgAimFile = document.getElementById("add-imgaim").files[0];

  const isEdit = editingLineup !== null;

  if (!("showOpenFilePicker" in window)) {
    if (isEdit) {
      upsertLineupInMemory(mapId, lineup);
    } else {
      addLineupToMemory(mapId, lineup);
    }
    const code = generateLineupCode(lineup);
    navigator.clipboard.writeText(code).then(() => {
      alert("Lineup copiato negli appunti! Incollalo in data/data.js");
    }).catch(() => {
      prompt(`Copia in data/data.js:\n\n${code}`, code);
    });
    closeModal();
    refreshUI(mapId);
    if (isEdit) showScreen("map");
    return;
  }

  try {
    const needDir = (imgStartFile || imgAimFile) && !cachedDirHandle;
    const needFile = !cachedFileHandle;

    const dirPromise = needDir ? ensureProjectDir() : Promise.resolve(cachedDirHandle);
    const filePromise = needFile ? ensureFileHandle() : Promise.resolve(cachedFileHandle);

    const [fileHandle, projectDir] = await Promise.all([filePromise, dirPromise]);

    if (!fileHandle || (needDir && !projectDir)) {
      return;
    }

    if (imgStartFile && projectDir) {
      lineup.imgStart = await saveImageToProject(projectDir, mapId, lineup.util, lineup.name, imgStartFile);
    }
    if (imgAimFile && projectDir) {
      lineup.imgAim = await saveImageToProject(projectDir, mapId, lineup.util, lineup.name, imgAimFile);
    }

    const source = await readDataJS(fileHandle);
    const code = generateLineupCode(lineup);
    const newSource = isEdit
      ? replaceLineupInSource(source, lineup.id, code)
      : appendLineupToSource(source, mapId, code);
    if (!newSource) {
      alert("Impossibile trovare la sezione lineups per questa mappa in data/data.js");
      return;
    }

    const writable = await fileHandle.createWritable();
    await writable.write(newSource);
    await writable.close();

    if (isEdit) {
      upsertLineupInMemory(mapId, lineup);
    } else {
      addLineupToMemory(mapId, lineup);
    }
    closeModal();
    refreshUI(mapId);
    if (isEdit) showScreen("map");
  } catch (err) {
    if (err.name === "AbortError") return;
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
  if (!("showOpenFilePicker" in window)) {
    removeLineupFromMemory(mapId, lineupId);
    closeModal();
    refreshUI(mapId);
    return true;
  }

  try {
    const fileHandle = await ensureFileHandle();
    if (!fileHandle) return false;

    const source = await readDataJS(fileHandle);
    const newSource = replaceLineupInSource(source, lineupId, null);
    if (!newSource) {
      alert("Impossibile trovare la lineup in data/data.js");
      return false;
    }

    const writable = await fileHandle.createWritable();
    await writable.write(newSource);
    await writable.close();

    const lineup = DATABASE.maps[mapId].lineups.find(l => l.id === lineupId);
    removeLineupFromMemory(mapId, lineupId);

    if (lineup) {
      const projectDir = await ensureProjectDir().catch(() => null);
      await deleteProjectFiles(projectDir, [lineup.imgStart, lineup.imgAim]);
    }

    refreshUI(mapId);
    return true;
  } catch (err) {
    if (err.name !== "AbortError") alert("Errore: " + err.message);
    return false;
  }
}

function refreshUI(mapId) {
  if (currentMapId) renderMinimap(DATABASE.maps[currentMapId], currentFilter);
  renderMaps();
}

/* ============================================================
   PANNELLO CONFIGURAZIONE (mostrato all'avvio)
   ============================================================ */

async function getPermissionState() {
  const [fh, dh] = await Promise.all([getHandle("data-js"), getHandle("project-dir")]);
  async function stateOf(handle) {
    if (!handle) return "none";
    try {
      const p = await handle.queryPermission({ mode: "readwrite" });
      return p === "prompt" ? "prompt" : p;
    } catch (err) {
      return "denied";
    }
  }
  const fileState = await stateOf(fh);
  const dirState = await stateOf(dh);
  if (fh && fileState === "granted") cachedFileHandle = fh;
  if (dh && dirState === "granted") cachedDirHandle = dh;
  return { couldFile: !!fh, couldDir: !!dh, file: fileState, dir: dirState };
}

function setStepState(stepId, state) {
  const row = document.getElementById(stepId);
  if (!row) return;
  const ind = row.querySelector(".setup-ind");
  if (ind) ind.dataset.state = state;
  row.classList.toggle("is-ready", state === "granted");
  const btn = row.querySelector("button");
  if (btn) {
    if (state === "granted") {
      btn.remove();
      const check = document.createElement("span");
      check.className = "setup-check";
      check.textContent = "\u2713";
      row.appendChild(check);
    } else {
      btn.disabled = false;
    }
  }
  return state === "granted";
}

async function refreshSetupUI() {
  const s = await getPermissionState();
  const dirReady = setStepState("setup-step-dir", s.dir);
  const fileReady = setStepState("setup-step-file", s.file);
  document.getElementById("btn-finish-setup").disabled = !(dirReady && fileReady);
}

async function initSetupPanel() {
  const overlay = document.getElementById("setup-panel");
  if (!overlay) return;
  const s = await getPermissionState();

  if (s.file === "granted" && s.dir === "granted") {
    overlay.classList.add("is-hidden");
    return;
  }

  await refreshSetupUI();

  document.getElementById("btn-pick-dir").addEventListener("click", async () => {
    const handle = await ensureProjectDir();
    if (handle) {
      await refreshSetupUI();
      maybeAutoClose(overlay);
    }
  });

  document.getElementById("btn-pick-file").addEventListener("click", async () => {
    const handle = await ensureFileHandle();
    if (handle) {
      await refreshSetupUI();
      maybeAutoClose(overlay);
    }
  });

  document.getElementById("btn-finish-setup").addEventListener("click", () => {
    overlay.classList.add("is-hidden");
  });

  document.getElementById("btn-reset-perms").addEventListener("click", async () => {
    if (!confirm("Rimuovere le autorizzazioni salvate? Dovrai ri-scegliere cartella e file.")) return;
    await Promise.all([removeHandle("data-js"), removeHandle("project-dir")]);
    cachedFileHandle = null;
    cachedDirHandle = null;
    await refreshSetupUI();
  });
}

async function maybeAutoClose(overlay) {
  const s = await getPermissionState();
  if (s.file === "granted" && s.dir === "granted") {
    overlay.classList.add("is-hidden");
  }
}

initSetupPanel();
