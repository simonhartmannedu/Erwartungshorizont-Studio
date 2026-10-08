import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : "./",
  define: {
    __EWH_APP_MODE__: JSON.stringify(mode),
  },
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        "**/.flatpak-builder/**",
        "**/dist/**",
      ],
    },
  },
}));
