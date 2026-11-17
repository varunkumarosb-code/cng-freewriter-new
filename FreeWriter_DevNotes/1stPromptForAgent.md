=========================================
PROJECT: CnG Writer — Full Audit + Critical Crash Fix
REPO: https://github.com/varunkumarosb-code/cng-freewriter-new
LIVE: https://varunkumarosb-code.github.io/cng-freewriter-new/
BACKEND: https://salaryzapp-pb.onrender.com (PocketBase, collection: cng_stories)
BRANCH: Create new branch `arena/audit-and-back-crash-fix` — DO NOT touch main directly
=========================================

ROLE:
You are a senior React + TypeScript auditor + bug fixer. The app is ~75% ship-ready. Your job is a surgical audit and crash fix, NOT a rewrite. Preserve all working features.

=========================================
STRICT AGENT EXECUTION & CHECKPOINT RULE
=========================================
1. EFFICIENT EXECUTION: Minimum tool calls. Batch file reads/edits. No chatty back-and-forth.
2. SAFE CHECKPOINT: After each milestone below, run:
   git add . && git commit -m "fix(audit): <milestone>"
   Push branch early and often so credit limit never loses progress.
3. NO BLOCKED LOOPS: If PocketBase is unreachable (Render cold start), mock/skip that test and commit current state. Do not retry forever.
4. NEW BRANCH ONLY: `arena/audit-and-back-crash-fix` — never force push main.
=========================================

=========================================
WHAT IS ALREADY WORKING — DO NOT BREAK
=========================================
- PocketBase login (users collection)
- Local-first localStorage persistence
- Editor typing + autosave indicator
- Word / char / reading time counter
- Export single (.txt / .md)
- Export all JSON backup + Import merge
- Light mode editor surface
- Cloud badge (Synced / Local)
- Settings modal + PB connect panel
- Category field (PB schema = Text) — fixed
- Crash guards on countWords / stripMarkdown
=========================================

=========================================
🔴 CRITICAL BLOCKER (fix FIRST, highest priority)
=========================================
BUG: Editor → "Back to Shelf" button click → blank white screen (React tree crash).
Symptoms:
- Pure white page on back navigation
- Previously had error "z is not a function" — may still exist in new form
- Crash occurs when Bookshelf + TopBar mount after Editor unmount

ACTION:
A. Open src/components/Editor.tsx, Bookshelf.tsx, TopBar.tsx, and App.tsx (plus LibraryContext).
B. Add a top-level React ErrorBoundary around the main app shell so any crash shows error message + stack trace instead of white screen. Place it in App.tsx wrapping <Bookshelf /> and <Editor />.
C. Trace the Back button handler: find where state transitions from "editor view" → "shelf view". Check:
   - Any direct DOM mutation
   - Any undefined function call (`z is not a function` style minified error)
   - Any useEffect cleanup that references stale state
   - remoteId mutation path (P4 — direct mutation + localStorage is fragile)
D. Fix the root cause. Common suspects:
   - Minified prod build mangling — check vite.config.ts for terser/minify settings
   - A story object missing `id` or `remoteId` after sync
   - LibraryContext re-render loop
E. Verify fix locally with `npm run build && npm run preview`, click Back from Editor at least 3 times with different stories (local-only, synced, newly-created).

=========================================
🟡 PENDING FIXES (do after blocker, in order)
=========================================
P2. PocketBase category round-trip:
    - Verify `category: story.categoryId` is sent AND received correctly.
    - Add a console.log once, confirm, then remove.

P3. PB delete sync verify:
    - Confirm `deleteRemoteStory` actually removes from cng_stories collection.
    - Add try/catch with user-visible toast on failure.

P4. remoteId state fragility (duplicate story risk):
    - Replace direct mutation `story.remoteId = ...` with proper setState / context update.
    - Change fetch-merge logic: match by `remoteId` first, fallback to `id`, never create duplicate.

P5. Light mode visual QA — Settings modal, BackupPanel, category chips:
    - Ensure all surfaces use theme tokens (not hardcoded dark colors).
    - Test both themes.

P6. Theme toggle active state:
    - Add `aria-pressed` + visual highlight (ring/bg) to the currently selected Dark/Light button.

P7. pb.authStore badge reactivity:
    - Confirm `pb.authStore.onChange` listener updates the Synced/Local badge WITHOUT page reload after login/logout.

P8. Orphan files cleanup:
    - DELETE: `src/lib/library.ts`, `src/lib/model.ts`, `src/lib/useLibrary.ts`
    - Confirm nothing imports them (grep first). If any import exists, migrate to active LibraryContext.

P9. Seed story IDs (`story-lighthouse` etc.):
    - On first cloud sync, these local-only IDs can cause merge weirdness.
    - Add logic: if story.id starts with "story-" (seed) AND user is logged in, treat as local-only (do not push to cloud) OR assign new UUID on first edit.

P10. createCategory from Editor shelf-picker:
    - Verify new category created from Editor appears in Bookshelf AND persists after reload.

=========================================
🌟 ADD-ON: STRICT LIGHT THEME & UI POLISH (MANDATORY)
=========================================
The Light Theme currently has visual bugs (e.g., white-on-white text, invisible buttons, unstyled modals). You MUST fix these UI issues across the app using Tailwind CSS:

1. Settings Modal & Backup Panel: 
   - Ensure text is highly readable in light mode (e.g., `text-gray-900`).
   - Modal backgrounds must be visible (e.g., `bg-white` or `bg-gray-50`) with proper borders/shadows.
   - Preserve `dark:` variants so dark mode doesn't break.

2. Category Chips & Tags: 
   - Fix background and text colors in light mode so they stand out clearly (e.g., `bg-gray-200 text-gray-800`).

3. Theme Toggle Buttons (TopBar / Settings): 
   - Add a clear ACTIVE visual state (e.g., `ring-2 ring-blue-500`, `bg-gray-200`, or `font-bold`) to instantly show the user whether Dark or Light mode is currently selected.
   - Ensure `aria-pressed` or `data-active` attributes are updated.

4. Empty States & Text: 
   - Verify there are absolutely NO "white text on white background" or "dark text on dark background" readability issues anywhere when switching themes.

=========================================
AUDIT REPORT (deliverable at end)
=========================================
Create a file `AUDIT_REPORT.md` at repo root with:
1. Root cause of Back button crash (one paragraph + code snippet of the bad line)
2. Fix applied (before/after diff summary)
3. Status of each P2–P10 item (Fixed / Verified / Skipped + reason)
4. Any remaining risks for production
5. Deployment command (should still be: `npm run build` → push to gh-pages branch or GitHub Actions)

=========================================
TECH CONSTRAINTS (do not violate)
=========================================
- Stack stays: React + TypeScript + Vite + PocketBase + localStorage
- No new heavy dependencies (no Redux, no Zustand unless absolutely needed)
- No backend changes to PocketBase schema (cng_stories collection stays as-is)
- Do not touch GitHub Pages deploy config unless broken
- Keep file sizes reasonable (<500 lines each)
- All user-facing text stays in current language (English/Hinglish mix as-is)
- No telemetry, no analytics, no new external calls

=========================================
SUCCESS CRITERIA (all must pass before final commit)
=========================================
✅ Back button from Editor → Shelf works 5 times in a row without white screen
✅ ErrorBoundary catches any future crash and shows readable error
✅ P2, P3, P4 verified with console or network tab proof
✅ P8 orphan files deleted, build still passes
✅ `npm run build` passes with zero TypeScript errors
✅ AUDIT_REPORT.md committed
✅ Branch `arena/audit-and-back-crash-fix` pushed and ready for PR
✅ Live site after merge: Back button works, no regressions in working features

=========================================
WORKFLOW
=========================================
1. Clone + checkout new branch
2. Read key files first: App.tsx, Editor.tsx, Bookshelf.tsx, TopBar.tsx, LibraryContext, storage.ts, pocketbase.ts
3. Add ErrorBoundary + fix Back crash → COMMIT
4. Fix P2, P3, P4 → COMMIT
5. Fix P5, P6, P7 → COMMIT
6. P8 cleanup → COMMIT
7. P9, P10 → COMMIT
8. Write AUDIT_REPORT.md → COMMIT
9. Push branch, output PR URL

START NOW. No clarifying questions — use best judgment where ambiguous and document assumptions in AUDIT_REPORT.md.