import { defineConfig } from "vite";
import { readFileSync } from "fs";

let pkgVersion = "2.0.0";
try {
  const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
  if (pkg.version) pkgVersion = pkg.version;
} catch {}
// Fallback to npm_package_version env if available (e.g., CI)
if (process.env.npm_package_version) {
  pkgVersion = process.env.npm_package_version;
}

const now = new Date();
const istTime = now.toLocaleString('en-IN', { 
  timeZone: 'Asia/Kolkata', 
  day: '2-digit', month: '2-digit', year: 'numeric', 
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
}) + ' (IST)';

export default defineConfig({
  base: "./",
  define: {
    '__CF_ADMIN_SECRET__': JSON.stringify(process.env.WRITER_PANEL_LOGIN || process.env.VITE_WRITER_PANEL_LOGIN || ''),
    '__BUILD_VERSION__': JSON.stringify(pkgVersion),
    '__APP_VERSION__': JSON.stringify(pkgVersion),
    '__BUILD_TIME__': JSON.stringify(istTime)
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false
  }
});
