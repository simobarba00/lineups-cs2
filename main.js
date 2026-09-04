const { app, protocol, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged;

if (!isDev) {
  require("./updater");
}
const dataDir = path.join(app.getPath("userData"), "lineups");
const bundleRoot = __dirname;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0e1116",
    title: "LINEUP'GO",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL("app://localhost/index.html");

  if (isDev) {
    win.webContents.openDevTools();
  }
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

app.whenReady().then(() => {
  bootstrapUserData();

  protocol.handle("app", (request) => {
    const relative = request.url.slice("app://localhost/".length);
    const dataPath = path.join(dataDir, relative);
    const bundlePath = path.join(bundleRoot, relative);

    let filePath;
    if (fs.existsSync(dataPath)) {
      filePath = dataPath;
    } else if (fs.existsSync(bundlePath)) {
      filePath = bundlePath;
    } else {
      filePath = path.join(bundleRoot, "index.html");
    }

    return new Response(fs.readFileSync(filePath), {
      headers: { "Content-Type": guessType(filePath) },
    });
  });

  registerIPC();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function registerIPC() {
  ipcMain.handle("fs:readData", () => {
    return fs.readFileSync(path.join(dataDir, "lineups", "data.json"), "utf-8");
  });

  ipcMain.handle("fs:writeData", (_event, content) => {
    const target = path.join(dataDir, "lineups", "data.json");
    ensureDirForFile(target);
    const tmp = target + ".tmp";
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, target);
    return true;
  });

  ipcMain.handle("fs:saveImage", (_event, rel, buffer) => {
    const abs = path.join(dataDir, rel);
    ensureDirForFile(abs);
    fs.writeFileSync(abs, Buffer.from(buffer));
    return rel;
  });

  ipcMain.handle("fs:deleteFolder", (_event, rel) => {
    try {
      const abs = path.join(dataDir, rel);
      if (fs.existsSync(abs)) fs.rmSync(abs, { recursive: true, force: true });
    } catch (_) {}
    return true;
  });

  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });
}

function bootstrapUserData() {
  const src = path.join(bundleRoot, "data", "data.template.json");
  const dest = path.join(dataDir, "lineups", "data.json");
  if (!fs.existsSync(dest) && fs.existsSync(src)) {
    ensureDirForFile(dest);
    fs.copyFileSync(src, dest);
  }
}

function guessType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return types[ext] || "application/octet-stream";
}
