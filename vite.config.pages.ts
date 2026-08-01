// Config exclusiva do build estático (SPA) para GitHub Pages.
// O build padrão da Lovable (SSR/TanStack Start) continua em vite.config.ts.
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.resolve(import.meta.dirname);

export default defineConfig({
  // Subdiretório do GitHub Pages: https://<user>.github.io/OS-CAMPO/
  base: process.env.PAGES_BASE ?? "/OS-CAMPO/",
  root: path.join(rootDir, "pages"),
  publicDir: path.join(rootDir, "public"),
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.join(rootDir, "src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  build: {
    outDir: path.join(rootDir, "dist"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
