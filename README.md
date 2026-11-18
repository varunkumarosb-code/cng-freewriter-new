# 🌿 CnG Writer — Zen Sanctuary

A distraction-free, 100% private, local-first writing webapp inspired by Lite Writer. Built for authors who value privacy, speed, and a minimalist aesthetic.

**Live at:** [writer.tiafa.cc.cd](https://writer.tiafa.cc.cd) | [sanctuary.tiafa.cc.cd](https://sanctuary.tiafa.cc.cd)

---

## 🛠️ Tech Stack & Architecture

- **Engine:** Vanilla TypeScript (Pure DOM manipulation for zero-crash stability).
- **Bundler:** Vite 6 (Lightning fast builds, ~88KB JS · 23KB gzip).
- **Styling:** Tailwind CSS 3.4 (Nordic Forest Theme).
- **Deployment:** Cloudflare Pages (Auto-deploy on `main` push).
- **Privacy:** 100% Local-First. Data is sandboxed in browser `LocalStorage`.

## ✨ Key Features

- **Bookshelf:** A card-based library with category filtering (Novel, Essay, Poetry, etc.).
- **Zen Editor:** Minimalist interface with auto-save, word counts, and reading time.
- **Nordic Forest Theme:** Deep forest dark mode (`#0d1413`) and soft stone light mode.
- **White-Labeled:** Zero branding leakage. No login required. "CnG Cloud" ready for optional sync.
- **Backup & Restore:** Full library export/import via JSON.
- **Telemetry Panel:** Secret `/adminpanel` for system health, storage logs, and cache management.

## 🚀 Development & Deployment

### Commands
- `npm run dev` - Start local development server.
- `npm run build` - Compile TypeScript and build for production (to `dist/`).
- `npm run preview` - Preview the production build locally.

### Deployment Pipeline
The project is hosted on **Cloudflare Pages**.
1. Push to `main` branch.
2. Cloudflare automatically triggers `npm run build`.
3. The `dist/` folder is served instantly with global CDN caching.

---

## 🛡️ Privacy & Security
CnG Writer is a **Sanctuary**.
- **No mandatory accounts:** Start writing instantly.
- **No Cloud Leakage:** All UI references to external databases have been scrubbed.
- **Sandboxed:** Your stories never leave your device unless you manually export them.

**Jai CnG! 🌲🔥**
