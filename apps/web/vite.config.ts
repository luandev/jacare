import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Get backend port from environment, default to 3333
const backendPort = process.env.CROCDESK_PORT || "3333";
const backendUrl = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the backend server
      // Use regex patterns to match specific API endpoints while allowing
      // SPA routes like /library to be handled by the frontend
      '^/crocdb/': {
        target: backendUrl,
        changeOrigin: true
      },
      '^/settings': {
        target: backendUrl,
        changeOrigin: true
      },
      // Only proxy specific library API endpoints, not the SPA /library route
      '^/library/(downloads|items|scan|games|item)': {
        target: backendUrl,
        changeOrigin: true
      },
      '^/jobs': {
        target: backendUrl,
        changeOrigin: true
      },
      '^/events': {
        target: backendUrl,
        changeOrigin: true
      },
      '^/file': {
        target: backendUrl,
        changeOrigin: true
      },
      '^/api-config': {
        target: backendUrl,
        changeOrigin: true
      }
    }
  }
});
