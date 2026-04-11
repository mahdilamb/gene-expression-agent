import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const agentUrl = process.env.AGENT_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8501,
    proxy: {
      "/api": {
        target: agentUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    port: 8501,
    proxy: {
      "/api": {
        target: agentUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
