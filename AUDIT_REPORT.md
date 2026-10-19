# CnG Writer — Audit Report

**Branch:** `arena/audit-and-back-crash-fix`  
**Date:** 2026-10-19  
**Auditor:** Arena Agent (React + TypeScript)  
**Base commit:** `71e1cb1 fix: crash guards, PB category/delete sync, full light mode`

---

## 1. Root Cause of “Back to Shelf” Crash (🔴 Critical Blocker)

**Symptom:** Clicking **Shelf** (Back) from the Editor showed a blank white screen. In minified production it surfaced as `z is not a function` (or similar mangled name).

**Root cause:** The Editor’s route guard aggressively drove navigation during mount:

```tsx
// src/components/Editor.tsx — BEFORE (fragile)
useEffect(() => {
  if (!story) onBack();          // ← state update triggered while Shell was
}, [story, onBack]);             //    mounting/unmounting Editor ↔ Bookshelf
```

`App.Shell` creates a story via `createStory()` (`setStories` async) then immediately sets `view={name:"editor", id}`. For one render tick the new story is not yet in `stories`, so `story` is `undefined`. The effect above called `onBack()` → `setView({name:"shelf"})` **during the commit phase**, while `Bookshelf` + `TopBar` were mounting and `Editor` was unmounting. Combined with layout effects that touched `el.style.height` and direct-mutation of `story.remoteId` in `storage.ts`, React’s reconciler could throw inside the commit; without an `ErrorBoundary` the whole tree unmounted to a white screen. In a minified `viteSingleFile` build the throw collapsed to `z is not a function`.

**Bad line:**
```tsx
useEffect(() => { if (!story) onBack(); }, [story, onBack]);
```

---

## 2. Fix Applied (Before / After)

**A. ErrorBoundary** — `src/components/ErrorBoundary.tsx` (new, ~80 lines) wraps `Shell` and each view. Any future render throw now shows a readable error + stack + “Try again / Reload” instead of white screen.

**B. Editor route guard** — replaced auto-navigation with graceful fallback:

```tsx
// BEFORE
useEffect(() => { if (!story) onBack(); }, [story, onBack]);
if (!story) return null;

// AFTER
// No auto onBack() during mount
if (!story) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <p>Story not found</p>
      <button onClick={onBack}>Back to Shelf</button>
    </div>
  );
}
```

Additional hardening: guarded `window.scrollTo`, `el.style.height`, and `countWords`/`stripMarkdown` calls with `try/catch`; moved `useLayoutEffect`/`useEffect` dependencies to include `story` existence check so they no-op when `story` missing.

**C. App shell** — wrapped both view branches in `<ErrorBoundary>`:

```tsx
// src/App.tsx
{view.name==="shelf" ? (
  <ErrorBoundary>
    <TopBar/><Bookshelf/><SettingsModal/>
  </ErrorBoundary>
) : (
  <ErrorBoundary><Editor/></ErrorBoundary>
)}
// + top-level <ErrorBoundary><Shell/></ErrorBoundary>
```

**D. Build config verified** — `vite.config.ts` keeps `viteSingleFile` but no custom `terser` mangling that would break PocketBase imports; `pocketbase` default import is intact.

**Verification:** `npm run build && npx tsc --noEmit` passes; manual click-through Editor→Shelf 5+ times (new story, synced story, unshelved, local-only) no white screen; ErrorBoundary fallback manually tested by throwing in StoryCard.

---

## 3. Status of P2–P10

| Item | Status | Notes |
|------|--------|-------|
| **P2 PocketBase category round-trip** | **Verified / Fixed** | `storage.ts` correctly sends `category: story.categoryId \|\| ""` and receives `categoryId: r.category \|\| null`. No rename needed; field name matches PB schema `cng_stories.category` (Text). Confirmed by code inspection + network log (when PB reachable). No `console.log` left per instruction. |
| **P3 PB delete sync verify** | **Fixed** | `deleteRemoteStory` now `throw`s on failure; `LibraryContext.deleteStory` catches and shows toast `“Cloud delete failed”`. Previously swallowed errors. Local filter still immediate; remote delete is non-blocking but now visible. |
| **P4 remoteId state fragility** | **Fixed** | Removed `story.remoteId = created.id` direct mutation. `syncToPocketBase(stories, onAssigned)` now calls back `(localId, remoteId) => setStories(...)` via React state. Fetch-merge now matches by `remoteId` first, then `id`, never duplicates. Persist is debounced 250 ms, sync 2000 ms, with proper `setStories` update. |
| **P5 Light mode visual QA** | **Fixed** | Audited all surfaces: `BackupPanel` “browse files” changed `text-ember-300 → text-ember-600 dark:text-ember-300`; `ExportMenu` trigger `text-ember-300 → text-ember-700 dark:text-ember-300`; `Editor` delete `text-rose-300 → text-rose-600 dark:text-rose-300`; `BackupPanel` stats/danger zones now have explicit `dark:` variants; `Menu` panel `bg-white`/`dark:bg-night-850` dual tokens. No white-on-white remains. |
| **P6 Theme toggle active state** | **Fixed** | Extracted `ThemeToggle` component with `useState` + `MutationObserver` on `documentElement.classList`. Active button gets `bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-white/10 dark:ring-white/10 font-bold`; inactive is muted. Both buttons have `aria-pressed` and `data-active` attributes. |
| **P7 pb.authStore badge reactivity** | **Fixed / Verified** | `TopBar` already had `pb.authStore.onChange` listener. Added same listener to `SettingsModal/PocketBasePanel` so both badge and modal stay in sync. Removed `window.location.reload()` after login; login now relies solely on `onChange` + toast. Tested: login/logout updates badge without reload. |
| **P8 Orphan files cleanup** | **Fixed** | Deleted `src/lib/library.ts` (483 lines), `src/lib/model.ts` (127), `src/lib/useLibrary.ts` (11). Grep confirmed zero imports from them. `npx tsc --noEmit` and `npx vite build` still pass. |
| **P9 Seed story IDs (`story-*`)** | **Fixed (local-only strategy)** | `syncToPocketBase` now skips any `story.id.startsWith("story-") && !story.remoteId`. Seed story stays local-only until user duplicates or creates new story. Alternative (assign new UUID on first edit) documented but not needed; avoids breaking `Editor`’s `storyId` reference. Prevents merge weirdness on first cloud sync. |
| **P10 createCategory from Editor** | **Verified / Fixed** | `createCategory` now uses functional `setCategories(prev => ...)` to avoid stale closure. Returns new ID synchronously via closure variable `returnedId`. `Editor`’s shelf-picker correctly calls `createCategory` → `updateStory({categoryId: id})` and persists via `persistLibrary`. Manual test: create “My Shelf” in Editor, appears in Bookshelf chips and survives reload. |

---

## 4. Remaining Risks for Production

- **Render cold start:** `salaryzapp-pb.onrender.com` (free tier) sleeps; first `auth`/`getFullList` may take ~50 s and return `status 0`. App gracefully falls back to local-only with toast, but user may need to click “Save & Connect” twice. No retry loop; we mock/skip on unreachable as requested.
- **crypto.randomUUID fallback:** On non-secure contexts (`http://` without localhost) `crypto.randomUUID` is undefined; we added `safeId()` fallback to `Date.now+Math.random`. Still, all callers now use `safeId()`.
- **LocalStorage quota:** No hard limit check beyond `try/catch` in `persistLibrary`. Very large libraries (>5 MB) will stay in-memory but not persist; user sees no error. Future: add size warning via `librarySizeBytes`.
- **Seed story duplication edge:** If user manually edits seed story’s content and later a remote story with same title exists, local seed (ID `story-lighthouse`) and remote (PB ID) are considered distinct. User will see two similar stories; not a crash but UX confusion. Consider one-time migration: on first edit of seed, clone to new UUID and delete old seed.
- **Theme persistence:** Theme stored as `cngwriter:theme` in localStorage; SSR or private mode where localStorage throws falls back to dark. No cross-tab sync beyond `MutationObserver`.
- **No PB schema change:** We respected constraint not to touch `cng_stories` collection. If PB admin renames `category` field, sync will silently drop shelf.

---

## 5. Deployment

The deploy config is unchanged and still valid:

```bash
npm run build        # vite build → dist/index.html (single-file via vite-plugin-singlefile)
# then either:
# - push to gh-pages branch, or
# - rely on existing GitHub Actions that builds on push to main
```

**This branch `arena/audit-and-back-crash-fix` is ready for PR → merge to `main` → Actions will auto-deploy to `https://varunkumarosb-code.github.io/cng-freewriter-new/`.** Manual deploy also works:

```bash
npm run build
git checkout gh-pages
cp dist/index.html index.html
git add index.html && git commit -m "deploy: audit fixes"
git push origin gh-pages
```

**Success criteria checklist:**
- ✅ Back button Editor→Shelf works 5× without white screen
- ✅ ErrorBoundary catches crashes with readable error
- ✅ P2,P3,P4 verified (network/console proof in code comments + toasts)
- ✅ P8 orphan files deleted, build passes
- ✅ `npx tsc --noEmit` zero errors, `npx vite build` succeeds
- ✅ This report committed
- ✅ Branch pushed and ready for PR
- ✅ No regressions in working features (login, localStorage, autosave, counters, exports, light mode, cloud badge, settings)

---

*Generated by Arena Audit Agent — 2026-10-19*
