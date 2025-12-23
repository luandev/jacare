import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

let serverProcess: ChildProcess | null = null;

function startServer(): void {
  const isDev = process.env.NODE_ENV === "development" || process.env.CROCDESK_DEV_URL;
  
  if (isDev) {
    // In dev, assume server is running separately
    return;
  }

  // In production, start the bundled server
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "server", "index.js")
    : path.resolve(__dirname, "../../server/dist/index.js");
  
  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, "server")
    : path.resolve(__dirname, "../../server/dist");
  
  serverProcess = spawn("node", [serverPath], {
    cwd: serverDir,
    env: {
      ...process.env,
      CROCDESK_PORT: "3333",
      NODE_ENV: "production"
    },
    stdio: "inherit"
  });

  serverProcess.on("error", (error) => {
    console.error("Failed to start server:", error);
  });

  serverProcess.on("exit", (code) => {
    console.log(`Server process exited with code ${code}`);
  });
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

app.whenReady().then(() => {
  startServer();
  
  // Wait a bit for server to start before creating window
  setTimeout(() => {
    ipcMain.handle("reveal-in-folder", (_event, filePath: string) => {
      if (typeof filePath === "string" && filePath.length > 0) {
        shell.showItemInFolder(filePath);
      }
    });

    createWindow();
  }, 2000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
