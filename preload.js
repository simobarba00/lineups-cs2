const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  readData:      ()               => ipcRenderer.invoke("fs:readData"),
  writeData:     (source)         => ipcRenderer.invoke("fs:writeData", source),
  saveImage:     (rel, buffer)    => ipcRenderer.invoke("fs:saveImage", rel, buffer),
  deleteFolder:  (rel)            => ipcRenderer.invoke("fs:deleteFolder", rel),
});
