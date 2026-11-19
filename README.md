# 🌿 CnG Writer — Zen Sanctuary

> Distraction-free, local-first writing sanctuary with Nordic Forest theme. 100% private on this device — no cloud, no tracking. Offline auto-save + manual JSON backup. Inspired by Lite Writer — built for authors who value privacy, speed, and minimalist aesthetic.

**Live:** **https://writer.tiafa.cc.cd/** — deployed on **Cloudflare Pages** (`base: "./"`)  
**Status:** Vanilla TypeScript rewrite `v2.0.0` — zero React Virtual DOM crashes, `tsc 0`, `vite 88KB JS (23KB gzip)`, white-label pure local-first.

---

## 🛠️ Tech Stack & Architecture

- **Engine:** Vanilla TypeScript (Pure DOM manipulation for zero-crash stability).
- **Bundler:** Vite 6 (Lightning fast builds, ~88KB JS · 23KB gzip + 27.5KB CSS).
- **Styling:** Tailwind CSS 3.4 (Nordic Forest Theme).
- **Deployment:** Cloudflare Pages (Auto-deploy on `main` push).
- **Privacy:** 100% Local-First. Data is sandboxed in browser `LocalStorage`.

### Full Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Vanilla TypeScript + Vite 6.0.6 | No React — zero `effect.destroy` / ref-callback crashes, pub/sub store |
| **Language** | TypeScript 5.6 `strict: true` (`moduleResolution: bundler`) | `Story` / `Category` / `AppSettings` / `BackupData` / `Theme` |
| **Styling** | Tailwind CSS 3.4.15 + PostCSS + Autoprefixer | `nordic.*` palette, `darkMode: class`, serif/mono fonts |
| **Icons** | `lucide` 0.460 (via CDN inline SVG — no `lucide-react`) | TopBar / Bookshelf / Editor |
| **Backend** | `pocketbase` 0.21.5 (white-labeled `CnG Cloud`) | Optional sync stub (`cng_stories` / `writer_users` — UI removed, data-layer retained for compat; 404 self-healing) |
| **Persistence** | `localStorage` only | `cngwriter:stories`, `cngwriter:categories`, `cngwriter:settings`, `cngwriter:theme`, `cngwriter:pb_url`, `cngwriter:pb_token` |
| **Deploy** | Cloudflare Pages → **https://writer.tiafa.cc.cd/** | `base: "./"`, `dist/` served directly by Cloudflare |
| **State** | `src/state/store.ts` pub/sub | `store.subscribe()` → `renderApp()` — no Virtual DOM |

### Build Config (`vite.config.ts`)

```ts
import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  define: { '__CF_ADMIN_SECRET__': JSON.stringify(process.env.WRITER_PANEL_LOGIN || process.env.VITE_WRITER_PANEL_LOGIN || '') },
  build: { outDir: "dist", assetsDir: "assets", sourcemap: false }
});
```

### Package Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## ✨ Key Features

- **Nordic Library (Bookshelf):** grid of story cards, live search (`title | content | shelf`), filter chips (`All`, `Unshelved`, custom shelves), word-count + `timeAgo` + `formatDate`, `Start writing`, delete, **Footer** with telemetry (`v2.0.0 · IST timestamp` + `Dev: CnG Soft` + `Web` + `Bugs/Feedback`)
- **Zen Editor:** minimalist interface with 30s auto-save, title `input#story-title` + content `textarea` auto-resize, `Shelf` back (bulletproof unmount — flush + `setActiveStory(null)`), shelf picker, Export → Markdown / TXT / Print-PDF, stats bar `words · chars · readingMinutes`, `Unsaved changes` → `Saved`, word counts & reading time
- **TopBar:** Nordic header, `Private & Local` badge (emerald dot), `Export All`, `Import`, `+ New story`, `Settings` (⚙️)
- **Library Settings & Backup (SettingsModal):** `Library Settings & Backup` title, Writer Profile `Local Sanctuary · 100% Private on this device`, Writer Name input (persisted `cngwriter:settings`), Backup `Export JSON` / `Import JSON` (no login form)
- **Nordic Forest Theme:** Deep forest dark mode (`#0d1413`) and soft stone light mode (`#f2f5f3`), `cngwriter:theme` + `documentElement` class toggle in Bookshelf
- **White-Labeled:** Zero branding leakage. No login required. "CnG Cloud" ready for optional sync
- **Backup & Restore:** Full library export/import via JSON (`cng-writer-backup-YYYY-MM-DD.json`)
- **Telemetry Panel:** Secret `#/adminpanel` for system health, storage logs, and cache management — protected by `WRITER_PANEL_LOGIN`, diagnostics, logs, **Nuke SW & Force Cache Bust**
- **Toasts:** floating bottom-right, auto-dismiss 2.8s
- **Offline-first:** all writes to `localStorage` instantly; no network required

---

## 🏗 Architecture

```
src/main.ts — Bootloader + Router + SW purge
  ├─ serviceWorker.getRegistrations().forEach(unregister) // cache-bust
  ├─ syncTheme() → documentElement.classList + cngwriter:theme
  ├─ hash === '#/adminpanel' → renderAdminPanel()
  └─ else → renderTopBar() + (activeStoryId ? renderEditor(id) : renderBookshelf()) + renderToasts
  └─ store.subscribe(renderApp) + hashchange listener

src/state/store.ts — Vanilla Store (pub/sub)
  ├─ loadStories()/loadCategories()/loadSettings()/loadTheme() (seed: Novel/Essays/Poetry/Journal + lighthouse)
  ├─ schedulePersist() 150ms → saveStories/Categories/Settings
  ├─ createStory(initialCategoryId?) → crypto fallback ID, setActiveStory
  ├─ updateStory(id, patch) → map + updatedAt, schedulePersist (no queueSyncToPB in white-label)
  ├─ deleteStory, addCategory, exportAllBackup, importBackupText
  └─ login/logout → no-ops (white-label), refreshFromCloud → no-op

src/views/
  TopBar.ts        → CnG logo, Private & Local badge, Export All / Import / New story / Settings
  Bookshelf.ts     → search + shelf chips + story cards + ${renderFooter()}
  Editor.ts        → input#story-title + content textarea + autoResize + 30s debounced scheduleSave + Export/Print
  SettingsModal.ts → #settings-modal-backdrop, Library Settings & Backup, Writer Name, Export/Import JSON
  Toast.ts         → store.toasts → floating container
  Footer.ts        → Dev: CnG Soft · Web https://cngteam.pagezapp.cc.cd/ · Bugs https://bugtracker.cngpnsteam2026.cc.cd/ · v2.0.0 · IST
  AdminPanelView.ts → WRITER_PANEL_LOGIN gate, telemetry, logs, Nuke SW & Cache

src/lib/
  types.ts         → Story, Category, AppSettings, BackupData, Theme, ToastItem
  storage.ts       → KEY_STORIES etc., DEFAULT_CATEGORIES, SEED_STORY, load/save, getEffectiveShelfName/getShelfCount, mergeByUpdatedAt
  format.ts        → countWords, readingMinutes, formatDate, timeAgo, slugify
  backup.ts        → buildBackup, parseBackup, downloadFile, storyToMarkdown/PlainText, printStoryPDF
  pocketbase.ts    → pb singleton (autoCancellation false), setCustomPbUrl, fetchRemoteStories/deleteRemoteStory/queueSyncToPB (white-label CnG Cloud)

src/build-info.ts  → BUILD_INFO (auto-generated IST)
src/utils/logger.ts → SystemLogger (INFO/WARN/ERROR/ACTION)
```

**Key invariants:**
- No React — no `useEffect` cleanup bugs; all timers use explicit `clearTimeout`.
- No direct mutation — `store.stories = store.stories.map(s => ...)` + `schedulePersist()`.
- Editor autosave is *only* writer (30s debounce → `Unsaved changes` → `Saved`, flush on leave); cloud sync is stubbed/no-op in white-label.
- Route is hash-based: `#/adminpanel` → Admin, else `activeStoryId` decides shelf/editor.

---

## 📂 File Tree

```
.
├── index.html                 # Vite entry (served via dist/ on CF Pages)
├── src/
│   ├── main.ts               # router + SW nuke + theme sync
│   ├── style.css             # @tailwind base/components/utilities + thin scrollbar
│   ├── build-info.ts         # auto-generated v2.0.0 + IST
│   ├── lib/
│   │   ├── types.ts
│   │   ├── storage.ts
│   │   ├── format.ts
│   │   ├── backup.ts
│   │   └── pocketbase.ts     # white-label CnG Cloud stub
│   ├── state/
│   │   └── store.ts          # pub/sub store
│   ├── views/
│   │   ├── TopBar.ts
│   │   ├── Bookshelf.ts
│   │   ├── Editor.ts
│   │   ├── SettingsModal.ts
│   │   ├── Toast.ts
│   │   ├── Footer.ts
│   │   └── AdminPanelView.ts
│   └── utils/
│       └── logger.ts
├── vite.config.ts            # base "./"
├── tailwind.config.js        # nordic.* palette
├── postcss.config.js
├── tsconfig.json
└── package.json              # v2.0.0, vanilla
```

Removed legacy: `src/App.tsx`, `src/components/*`, `src/main.tsx` (React), `src/index.css`, `src/state/LibraryContext.tsx`, `src/types.ts`.

---

## 🗄 Data

### Types (`src/lib/types.ts`)

```ts
interface Story { id: string; title: string; content: string; categoryId: string; createdAt: string; updatedAt: string; remoteId?: string; }
interface Category { id: string; name: string; order: number; }
interface AppSettings { writerName: string; lastBackupAt: string | null; }
interface BackupData { version: 1; exportedAt: string; settings?: AppSettings; categories: Category[]; stories: Story[]; }
type Theme = "light" | "dark";
interface ToastItem { id: string; message: string; tone: "ok" | "error" | "info"; }
```

### localStorage

| Key | Value |
|-----|-------|
| `cngwriter:stories` | `Story[]` (seed: story-lighthouse) |
| `cngwriter:categories` | `Category[]` (Novel, Essays, Poetry, Journal) |
| `cngwriter:settings` | `AppSettings` |
| `cngwriter:theme` | `"light" \| "dark"` |
| `cngwriter:pb_url` | PB base URL (optional) |
| `cngwriter:pb_token` | auth token (optional) |

### Backup

`buildBackup(stories, categories, settings)` → `cng-writer-backup-YYYY-MM-DD.json` via `downloadFile`. `parseBackup(jsonStr)` handles new envelope + legacy arrays. SettingsModal also supports direct Export/Import via Blob.

---

## 🚀 Development & Deployment

### Commands
- `npm run dev` - Start local development server (`vite` → http://localhost:5173/)
- `npm run build` - Compile TypeScript and build for production (to `dist/` — 88KB JS · 23KB gzip)
- `npm run preview` - Preview the production build locally

No env vars. Theme persists `cngwriter:theme`.

### Deployment Pipeline
The project is hosted on **Cloudflare Pages**.
1. Push to `main` branch.
2. Cloudflare automatically triggers `npm run build`.
3. The `dist/` folder is served instantly with global CDN caching.

- **Hosting:** **Cloudflare Pages** → **https://writer.tiafa.cc.cd/** (migrated from GitHub Pages)
- **Base:** `base: "./"` (relative, works on CF Pages root)
- **Cache bust:** `src/build-info.ts` stamps IST build version; `src/main.ts` unregisters legacy service workers; `AdminPanelView.ts` has `Nuke SW & Force Cache Bust`

---

## 🛡️ Privacy & Security

CnG Writer is a **Sanctuary**.
- **No mandatory accounts:** Start writing instantly.
- **No Cloud Leakage:** All UI references to external databases have been scrubbed. `grep -rn PocketBase src/views` → 0 hits.
- **Sandboxed:** Your stories never leave your device unless you manually export them. 100% Local-First, `localStorage` only.
- **White-Label:** `SettingsModal.ts` only Writer Name + Backup; `store.ts` login/logout are no-ops; Nordic Forest theme `nordic.bgLight #f2f5f3` / `bgDark #0d1413`.

---

## 📎 Links

- **Live:** https://writer.tiafa.cc.cd/
- **Web:** https://cngteam.pagezapp.cc.cd/
- **Bugs/Feedback:** https://bugtracker.cngpnsteam2026.cc.cd/
- **Admin:** https://writer.tiafa.cc.cd/#/adminpanel (passcode `WRITER_PANEL_LOGIN`)

**Jai CnG! 🌲🔥**  
**License:** Private. Built with Vanilla TypeScript + Vite + Tailwind + Cloudflare Pages.
