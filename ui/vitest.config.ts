import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    // Expose VITE_ vars to import.meta.env inside tests
    "import.meta.env.VITE_AGENT_URL": JSON.stringify("http://localhost"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
