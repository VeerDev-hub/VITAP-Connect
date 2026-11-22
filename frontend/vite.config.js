import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Polling is needed for hot reload through Docker bind mounts on Windows.
    watch: process.env.CHOKIDAR_USEPOLLING === "true" ? { usePolling: true, interval: 300 } : undefined
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: they only change when the libraries do.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["motion/react"],
          realtime: ["socket.io-client", "axios"]
        }
      }
    }
  }
});
