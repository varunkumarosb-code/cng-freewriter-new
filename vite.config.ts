import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  define: {
    '__CF_ADMIN_SECRET__': JSON.stringify(process.env.WRITER_PANEL_LOGIN || process.env.VITE_WRITER_PANEL_LOGIN || '')
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false
  }
});
