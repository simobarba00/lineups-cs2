const { autoUpdater } = require("electron-updater");
const { app } = require("electron");

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = {
  info: (msg) => console.log("[updater]", msg),
  warn: (msg) => console.warn("[updater]", msg),
  error: (msg) => console.error("[updater]", msg),
};

app.whenReady().then(() => {
  autoUpdater.checkForUpdates().catch((err) => {
    console.error("[updater] check failed:", err.message);
  });
});

autoUpdater.on("update-available", (info) => {
  console.log("[updater] update available:", info.version);
});

autoUpdater.on("update-not-available", () => {
  console.log("[updater] app is up to date");
});

autoUpdater.on("download-progress", (progress) => {
  console.log(`[updater] downloading: ${Math.round(progress.percent)}%`);
});

autoUpdater.on("update-downloaded", () => {
  console.log("[updater] update downloaded, will install on next quit");
});

autoUpdater.on("error", (err) => {
  console.error("[updater] error:", err.message);
});
