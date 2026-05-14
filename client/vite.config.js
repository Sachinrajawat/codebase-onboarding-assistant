import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api -> backend in dev so we don't need to think about CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
