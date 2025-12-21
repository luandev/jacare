import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#f6f2ea",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, "./preload.js")
    }
  });

  const devUrl = process.env.CROCDESK_DEV_URL || "http://localhost:5173";
  if (process.env.CROCDESK_DEV_URL || process.env.NODE_ENV === "development") {
    window.loadURL(devUrl);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.resolve(__dirname, "../../web/dist/index.html");
    window.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  ipcMain.handle("reveal-in-folder", (_event, filePath: string) => {
    if (typeof filePath === "string" && filePath.length > 0) {
      shell.showItemInFolder(filePath);
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
