import { store } from "../state/store";
import { countWords, formatDate, timeAgo } from "../lib/format";
import { getEffectiveShelfName, getShelfCount } from "../lib/storage";
import { renderFooter } from "./Footer";

let currentShelf = "All";
let searchQuery = "";

export function renderBookshelf(): HTMLElement {
  const container = document.createElement("div");
  container.className = "mx-auto max-w-6xl px-5 py-6 min-h-[calc(100vh-60px)] flex flex-col justify-between";

  const activeStories = store.stories.filter((s) => !s.deletedAt);
  const trashCount = store.stories.filter((s) => !!s.deletedAt).length;
  const isTrashView = currentShelf === "Trash 🗑️" || currentShelf.toLowerCase() === "trash";
  const totalWords = activeStories.reduce((acc, s) => acc + countWords(s.content || ""), 0);
  const shelves = ["All", "Unshelved", ...store.categories.map((c) => c.name), "Trash 🗑️"];

  const filteredStories = isTrashView
    ? store.stories.filter((s) => {
        if (!s.deletedAt) return false;
        const shelfName = getEffectiveShelfName(s, store.categories);
        const hay = `${s.title} ${s.content} ${shelfName}`.toLowerCase();
        const matchesSearch = !searchQuery || hay.includes(searchQuery.toLowerCase().trim());
        return matchesSearch;
      })
    : activeStories.filter((s) => {
        const shelfName = getEffectiveShelfName(s, store.categories);
        const matchesShelf = currentShelf === "All" || shelfName.toLowerCase() === currentShelf.toLowerCase();
        const hay = `${s.title} ${s.content} ${shelfName}`.toLowerCase();
        const matchesSearch = !searchQuery || hay.includes(searchQuery.toLowerCase().trim());
        return matchesShelf && matchesSearch;
      });

  container.innerHTML = `
    <div>
      <!-- Library Header -->
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-nordic-borderLight dark:border-nordic-borderDark pb-6">
        <div class="flex gap-4">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-nordic-accentLight to-emerald-700 dark:from-nordic-accentDark dark:to-emerald-400 text-white dark:text-nordic-bgDark shadow-sm">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </span>
          <div>
            <h2 class="font-serif text-xl font-semibold tracking-tight text-nordic-textLight dark:text-nordic-textDark">${isTrashView ? "Trash — Recycle Bin" : "Nordic Library"}</h2>
            <p class="max-w-[50ch] text-[13px] leading-5 text-nordic-mutedLight dark:text-nordic-mutedDark">${isTrashView ? "Deleted stories stay here until you restore or purge. Accidental delete protection." : "Offline-first writing sanctuary. Stories save automatically and sync securely."}</p>
            <p class="mt-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">${isTrashView ? `${trashCount} in trash` : `${activeStories.length} stories · ${totalWords.toLocaleString()} words`} ${trashCount > 0 && !isTrashView ? `· ${trashCount} in trash` : ""}</p>
          </div>
        </div>
        <div class="text-left sm:text-right font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          Theme: <button id="btn-theme-toggle" class="underline underline-offset-4 hover:text-nordic-accentLight dark:hover:text-nordic-accentDark font-semibold uppercase">${store.theme}</button>
        </div>
      </div>

      <!-- Filters & Search Bar -->
      <div class="flex flex-wrap items-center gap-3 py-4">
        <div class="relative">
          <svg class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nordic-mutedLight dark:text-nordic-mutedDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input id="input-search" value="${searchQuery}" placeholder="Filter stories..." class="h-9 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark py-2 pl-9 pr-3 text-sm text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight dark:placeholder:text-nordic-mutedDark focus:border-nordic-accentLight dark:focus:border-nordic-accentDark transition-all" />
        </div>

        <div class="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-1">
          ${shelves.map((sh) => {
            const isActive = currentShelf.toLowerCase() === sh.toLowerCase();
            const count = getShelfCount(store.stories, sh, store.categories);
            return `
              <button data-shelf="${sh}" class="shelf-chip px-3 py-1 text-[12px] font-medium transition-all rounded-full ${isActive ? "bg-nordic-textLight dark:bg-nordic-textDark text-nordic-bgLight dark:text-nordic-bgDark" : "text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight dark:hover:text-nordic-textDark"}">
                ${sh} <span class="ml-1 font-mono text-[10px] opacity-70">${count}</span>
              </button>
            `;
          }).join("")}
        </div>

        ${isTrashView && trashCount > 0 ? `
          <button id="btn-empty-trash" class="ml-auto inline-flex h-9 items-center justify-center rounded-full border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
            🗑️ Empty Trash
          </button>
        ` : `
          <button id="btn-start-writing" class="ml-auto inline-flex h-9 items-center justify-center rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-4 text-sm font-semibold text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark transition-all">
            Start writing
          </button>
        `}
      </div>

      <!-- Stories Grid -->
      ${filteredStories.length === 0 ? `
        <div class="grid place-items-center rounded-2xl border border-dashed border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight/50 dark:bg-nordic-cardDark/50 px-6 py-14 text-center">
          <p class="text-sm text-nordic-mutedLight dark:text-nordic-mutedDark">${isTrashView ? (trashCount === 0 ? "Trash is empty. Deleted stories will appear here." : "No matches in Trash. Clear your search.") : "No stories found. Start a new draft or clear your filters."}</p>
        </div>
      ` : `
        <div class="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          ${filteredStories.map((s) => {
            const shelf = getEffectiveShelfName(s, store.categories);
            const words = countWords(s.content || "");
            if (isTrashView) {
              return `
              <div data-story-id="${s.id}" class="group relative flex min-h-[200px] flex-col rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-5 pb-4 pt-5 text-left transition-all duration-200 opacity-90">
                <span class="line-clamp-2 pr-2 font-serif text-[18px] font-semibold leading-6 text-nordic-textLight dark:text-nordic-textDark">${s.title || "Untitled Story"}</span>
                <span class="mt-1 font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400">Trash · ${shelf}</span>
                <p class="mt-3 line-clamp-3 text-[13px] leading-6 text-nordic-mutedLight dark:text-nordic-mutedDark">${(s.content || "No content yet.").slice(0, 200)}</p>
                <div class="mt-auto flex items-center justify-between pt-4 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
                  <span>${words.toLocaleString()} words</span>
                  <span title="${formatDate(s.updatedAt)}">${timeAgo(s.updatedAt)}</span>
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <button data-restore-id="${s.id}" class="restore-btn flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all">
                    ↩ Restore
                  </button>
                  <button data-perma-delete-id="${s.id}" class="perma-delete-btn flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all">
                    🗑 Delete Permanently
                  </button>
                </div>
              </div>
            `;
            } else {
              return `
              <div data-story-id="${s.id}" class="story-card group relative flex min-h-[200px] cursor-pointer flex-col rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-5 pb-4 pt-5 text-left transition-all duration-200 hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:shadow-md hover:-translate-y-0.5">
                <span class="line-clamp-2 pr-2 font-serif text-[18px] font-semibold leading-6 text-nordic-textLight dark:text-nordic-textDark">${s.title || "Untitled Story"}</span>
                <span class="mt-1 font-mono text-[10px] uppercase tracking-widest text-nordic-accentLight dark:text-nordic-accentDark">${shelf} ${s.remoteId ? "· Cloud" : ""}</span>
                <p class="mt-3 line-clamp-3 text-[13px] leading-6 text-nordic-mutedLight dark:text-nordic-mutedDark">${(s.content || "No content yet. Tap to begin writing...").slice(0, 200)}</p>
                <div class="mt-auto flex items-center justify-between pt-4 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
                  <span>${words.toLocaleString()} words</span>
                  <div class="flex items-center gap-2">
                    <span title="${formatDate(s.updatedAt)}">${timeAgo(s.updatedAt)}</span>
                    <button data-delete-id="${s.id}" class="delete-btn grid h-7 w-7 place-items-center rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-nordic-mutedLight hover:text-red-500 hover:border-red-300 dark:hover:border-red-900 transition-all" title="Move to Trash">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            `;
            }
          }).join("")}
        </div>
      `}
    </div>

    <!-- Sleek Nordic Footer -->
    ${renderFooter()}
  `;

  // Event Listeners
  container.querySelector("#btn-theme-toggle")?.addEventListener("click", () => {
    store.setTheme(store.theme === "dark" ? "light" : "dark");
  });

  const searchInput = container.querySelector("#input-search") as HTMLInputElement;
  searchInput?.addEventListener("input", (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    const parent = container.parentElement;
    if (parent) {
      parent.replaceChildren(renderBookshelf());
      (parent.querySelector("#input-search") as HTMLInputElement)?.focus();
    }
  });

  container.querySelectorAll(".shelf-chip").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      currentShelf = (e.currentTarget as HTMLElement).getAttribute("data-shelf") || "All";
      container.parentElement?.replaceChildren(renderBookshelf());
    });
  });

  container.querySelector("#btn-start-writing")?.addEventListener("click", () => {
    const selectedCat = store.categories.find((c) => c.name.toLowerCase() === currentShelf.toLowerCase());
    store.createStory(selectedCat?.id);
  });

  container.querySelector("#btn-empty-trash")?.addEventListener("click", () => {
    if (trashCount > 0 && confirm(`Permanently purge all ${trashCount} stories in Trash? This cannot be undone.`)) {
      store.emptyTrash();
    }
  });

  container.querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".delete-btn")) return;
      const id = card.getAttribute("data-story-id");
      if (id) store.setActiveStory(id);
    });
  });

  container.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-delete-id");
      if (id) {
        store.deleteStory(id);
      }
    });
  });

  container.querySelectorAll(".restore-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-restore-id");
      if (id) store.restoreStory(id);
    });
  });

  container.querySelectorAll(".perma-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-perma-delete-id");
      if (id && confirm("Delete permanently? This cannot be undone.")) {
        store.permanentlyDeleteStory(id);
      }
    });
  });

  return container;
}
