import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("crocdesk", {
  revealInFolder: (filePath: string) => ipcRenderer.invoke("reveal-in-folder", filePath),
  toggleBigPicture: (enabled: boolean) => ipcRenderer.invoke("toggle-big-picture", enabled)
});
