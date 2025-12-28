import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import type { Server } from "http";

// Store server instance for cleanup
let serverInstance: Server | null = null;

async function startServer(): Promise<void> {
  const isDev = process.env.NODE_ENV === "development" || process.env.CROCDESK_DEV_URL;
  
  if (isDev) {
    // In dev, assume server is running separately
    return;
  }

  // Set environment variables BEFORE importing server module
  // This ensures config.ts reads the correct values at module load time
  process.env.CROCDESK_PORT = process.env.CROCDESK_PORT || "3333";
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  // Resolve the server module path based on packaging state
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "server", "index.js")
    : path.resolve(__dirname, "../../server/dist/index.js");

  // In production, import and run the server in-process
  try {
    // Dynamic import of server module (after env vars are set)
    const serverModule = await import(serverPath) as { 
      startServer?: () => Promise<Server | void>;
      logger?: { 
        info: (msg: string, data?: Record<string, unknown>) => void;
        error: (msg: string, error?: Error | unknown, data?: Record<string, unknown>) => void;
      };
    };
    
    // Use server's logger if available
    const log = serverModule.logger || {
      info: (msg: string) => console.log(`[INFO] ${msg}`),
      error: (msg: string, error?: Error | unknown) => console.error(`[ERROR] ${msg}`, error)
    };
    
    // Call the exported startServer function
    if (serverModule.startServer) {
      const result = await serverModule.startServer();
      if (result && typeof result === 'object' && 'listen' in result) {
        serverInstance = result as Server;
      }
      log.info("Server started successfully in Electron process");
    } else {
      const errorMsg = "Server module does not export startServer function";
      log.error(errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    // Use basic logging if server logger not available
    console.error("[ERROR] Failed to start server:", error);
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
    // In production, load from local server using configured port
    const port = process.env.CROCDESK_PORT || "3333";
    window.loadURL(`http://localhost:${port}`);
  }
}

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (error) {
    console.error("[ERROR] Failed to start server, exiting application:", error);
    // Exit the app if server fails to start
    app.quit();
    return;
  }
  
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
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  // Gracefully close the server to allow active connections to complete
  if (serverInstance) {
    serverInstance.close(() => {
      console.log("[INFO] Server closed gracefully");
    });
    // Give the server a moment to close before process exits
    // The process will exit anyway after this handler completes
  }
});
