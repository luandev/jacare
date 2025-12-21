import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("crocdesk", {
  revealInFolder: (filePath: string) => ipcRenderer.invoke("reveal-in-folder", filePath)
});
