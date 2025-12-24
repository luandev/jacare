import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import type { ServerHandle } from "@crocdesk/server";

let serverHandle: ServerHandle | null = null;

async function startServer(): Promise<void> {
  const isDev = process.env.NODE_ENV === "development" || process.env.CROCDESK_DEV_URL;
  
  if (isDev) {
    // In dev, assume server is running separately
    return;
  }

  // In production, import and start the embedded server
  try {
    const { createServer } = await import("@crocdesk/server");
    serverHandle = await createServer();
    console.log("Server started successfully");
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
}

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
    // In production, load from local server
    window.loadURL("http://localhost:3333");
  }
}

app.whenReady().then(async () => {
  try {
    await startServer();
    
    ipcMain.handle("reveal-in-folder", (_event, filePath: string) => {
      if (typeof filePath === "string" && filePath.length > 0) {
        shell.showItemInFolder(filePath);
      }
    });

    createWindow();
  } catch (error) {
    console.error("Failed to initialize app:", error);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  if (serverHandle) {
    await serverHandle.stop();
    serverHandle = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  if (serverHandle) {
    await serverHandle.stop();
    serverHandle = null;
  }
});
