import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".e2b.app"],
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://127.0.0.1:4000",
        changeOrigin: false,
      },
    },
  },
  build: { chunkSizeWarningLimit: 1400 },
});
