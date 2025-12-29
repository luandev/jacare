import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the backend server
      // Use regex patterns to match specific API endpoints while allowing
      // SPA routes like /library to be handled by the frontend
      '^/crocdb/': {
        target: 'http://localhost:3333',
        changeOrigin: true
      },
      '^/settings': {
        target: 'http://localhost:3333',
        changeOrigin: true
      },
      // Only proxy specific library API endpoints, not the SPA /library route
      '^/library/(downloads|items|scan|games|item)': {
        target: 'http://localhost:3333',
        changeOrigin: true
      },
      '^/jobs': {
        target: 'http://localhost:3333',
        changeOrigin: true
      },
      '^/events': {
        target: 'http://localhost:3333',
        changeOrigin: true
      },
      '^/file': {
        target: 'http://localhost:3333',
        changeOrigin: true
      }
    }
  }
});
