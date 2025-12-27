import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";

async function startServer(): Promise<void> {
  const isDev = process.env.NODE_ENV === "development" || process.env.CROCDESK_DEV_URL;
  
  if (isDev) {
    // In dev, assume server is running separately
    return;
  }

  // Set environment variables for in-process server
  process.env.CROCDESK_PORT = process.env.CROCDESK_PORT || "3333";
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  // In production, import and run the server in-process
  try {
    // Import the server module
    // @ts-expect-error - Dynamic import of server module built separately
    const serverModule = await import("../../server/dist/index.js") as { startServer?: () => Promise<void> };
    
    // Call the exported startServer function
    if (serverModule.startServer) {
      await serverModule.startServer();
    } else {
      throw new Error("Server module does not export startServer function");
    }
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
  await startServer();
  
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
  // Server cleanup is handled by Node.js process exit
});
