import { store } from "../state/store";
import { countWords, formatDate, readingMinutes, slugify } from "../lib/format";
import { downloadFile, printStoryPDF, storyToMarkdown, storyToPlainText } from "../lib/backup";
import { getEffectiveShelfName, getAutosaveDelayMs } from "../lib/storage";

export function renderEditor(storyId: string): HTMLElement {
  const story = store.stories.find((s) => s.id === storyId);

  const container = document.createElement("div");
  container.className = "w-full max-w-full overflow-x-hidden box-border px-3 md:px-8 min-h-[calc(100vh-4rem)] bg-nordic-bgLight dark:bg-nordic-bgDark transition-colors duration-200";
  container.setAttribute("data-editor-id", storyId);

  if (!story) {
    container.innerHTML = `
      <div class="mx-auto max-w-lg px-5 py-20 text-center">
        <p class="text-nordic-mutedLight dark:text-nordic-mutedDark">Story not found or deleted.</p>
        <button id="btn-back-shelf" class="mt-4 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-4 py-2 text-sm text-nordic-textLight dark:text-nordic-textDark">Return to Shelf</button>
      </div>
    `;
    container.querySelector("#btn-back-shelf")?.addEventListener("click", () => store.setActiveStory(null));
    return container;
  }

  let localTitle = story.title;
  let localContent = story.content;
  let saveStatus = "Saved";
  let autosaveTimer: number | null = null;
  let exportMenuOpen = false;

  const shelfName = getEffectiveShelfName(story, store.categories);

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div class="sticky top-16 z-30 w-full max-w-full overflow-x-hidden box-border border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/70 dark:bg-nordic-bgDark/70 backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-1.5 px-3 md:px-5 py-3">
        <div class="flex min-w-0 items-center gap-2">
          <button id="btn-back" class="inline-flex h-7 md:h-8 shrink-0 items-center gap-1 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2 md:px-2.5 py-1 text-xs md:text-[13px] font-medium text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark transition-all">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span class="hidden xs:inline">Shelf</span>
          </button>
          <span id="save-indicator" class="font-mono text-[10px] md:text-[11px] truncate text-nordic-mutedLight dark:text-nordic-mutedDark">${saveStatus}</span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 min-w-0">
          <select id="select-shelf" class="h-7 md:h-8 max-w-[110px] truncate rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2 text-xs text-nordic-textLight dark:text-nordic-textDark outline-none">
            <option value="">Unshelved</option>
            ${store.categories.map((c) => `<option value="${c.id}" ${c.id === story.categoryId ? "selected" : ""}>${c.name}</option>`).join("")}
          </select>

          <div class="relative shrink-0">
            <button id="btn-export-dropdown" class="inline-flex h-7 md:h-8 items-center gap-1 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2 md:px-3 py-1 text-xs md:text-[12px] font-medium text-nordic-textLight dark:text-nordic-textDark transition-all">
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2=\"3\"></line></svg>
              <span class="hidden sm:inline">Export</span>
            </button>
            <div id="export-menu" class="hidden absolute right-0 z-40 mt-1 w-44 rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark py-1 shadow-lg">
              <button id="exp-md" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Markdown (.md)</button>
              <button id="exp-txt" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Plain text (.txt)</button>
              <button id="exp-pdf" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Print / PDF</button>
            </div>
          </div>

          <button id="btn-delete" class="inline-flex h-7 md:h-8 shrink-0 items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-2 md:px-3 py-1 text-xs md:text-[12px] font-medium text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span class="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Zen Writing Pad -->
    <div class="mx-auto w-full max-w-3xl max-w-full overflow-x-hidden box-border px-3 md:px-8 py-10">
      <div class="w-full max-w-full overflow-x-hidden box-border rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-4 md:p-8 shadow-sm">
        <input 
          id="story-title" 
          type="text" 
          placeholder="Story Title..." 
          value="" 
          class="w-full max-w-full box-border min-w-0 bg-transparent font-serif text-xl md:text-3xl font-bold text-nordic-textLight dark:text-nordic-textDark outline-none mb-3 placeholder:opacity-30 focus:border-b focus:border-nordic-accentLight dark:focus:border-nordic-accentDark transition-all"
        />

        <div class="mt-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          ${shelfName} · Last edited ${formatDate(story.updatedAt)}
        </div>
        <div class="mt-6 h-px bg-nordic-borderLight dark:bg-nordic-borderDark"></div>

        <textarea
          id="editor-content"
          rows="14"
          placeholder="Begin writing your story here…"
          class="mt-8 min-h-[420px] w-full max-w-full box-border min-w-0 resize-none overflow-hidden bg-transparent font-serif text-lg leading-loose text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight/50 dark:placeholder:text-nordic-mutedDark/50"
        >${localContent}</textarea>

        <!-- Stats Bar -->
        <div class="mt-8 flex flex-wrap items-center justify-between gap-2 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-4 py-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          <span id="stats-text">${countWords(localContent).toLocaleString()} words · ${localContent.length.toLocaleString()} chars · ${readingMinutes(localContent)} min read</span>
          <span class="text-nordic-accentLight dark:text-nordic-accentDark font-semibold">Zen Active</span>
        </div>
      </div>
    </div>
  `;

  // Autoresize utility for content textarea
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const titleEl = container.querySelector("#story-title") as HTMLInputElement;
  const contentEl = container.querySelector("#editor-content") as HTMLTextAreaElement;
  const saveIndEl = container.querySelector("#save-indicator") as HTMLElement;
  const statsEl = container.querySelector("#stats-text") as HTMLElement;

  // Set title input value safely (avoid HTML escaping issues)
  if (titleEl) {
    titleEl.value = localTitle || "";
  }

  if (contentEl) autoResize(contentEl);

  const flushSave = () => {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    const finalTitle = localTitle.trim() ? localTitle.trim() : "Untitled Story";
    store.updateStory(storyId, { title: finalTitle, content: localContent });
    saveIndEl.innerText = "Saved";
    saveIndEl.className = "font-mono text-[11px] text-nordic-accentLight dark:text-nordic-accentDark";
  };

  const scheduleSave = () => {
    saveIndEl.innerText = "Unsaved changes";
    saveIndEl.className = "font-mono text-[11px] text-amber-500 animate-pulse";
    if (autosaveTimer !== null) clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      flushSave();
    }, getAutosaveDelayMs());
  };

  titleEl?.addEventListener("input", (e) => {
    localTitle = (e.target as HTMLInputElement).value;
    scheduleSave();
  });

  contentEl?.addEventListener("input", (e) => {
    localContent = (e.target as HTMLTextAreaElement).value;
    autoResize(contentEl);
    statsEl.innerText = `${countWords(localContent).toLocaleString()} words · ${localContent.length.toLocaleString()} chars · ${readingMinutes(localContent)} min read`;
    scheduleSave();
  });

  // Back to Shelf — flush pending save before navigating
  container.querySelector("#btn-back")?.addEventListener("click", () => {
    if (autosaveTimer !== null) {
      flushSave();
    }
    store.setActiveStory(null);
  });

  // Shelf Dropdown — flush title/content first, then update category
  const selectShelf = container.querySelector("#select-shelf") as HTMLSelectElement;
  selectShelf?.addEventListener("change", () => {
    if (autosaveTimer !== null) {
      flushSave();
    }
    store.updateStory(storyId, { categoryId: selectShelf.value });
  });

  // Export Menu
  const expBtn = container.querySelector("#btn-export-dropdown");
  const expMenu = container.querySelector("#export-menu");
  expBtn?.addEventListener("click", () => {
    exportMenuOpen = !exportMenuOpen;
    expMenu?.classList.toggle("hidden", !exportMenuOpen);
  });

  const getSlug = () => slugify(localTitle?.trim() || "untitled");
  container.querySelector("#exp-md")?.addEventListener("click", () => {
    downloadFile(`${getSlug()}.md`, storyToMarkdown({ ...story, title: localTitle, content: localContent }, shelfName), "text/markdown");
    expMenu?.classList.add("hidden");
  });
  container.querySelector("#exp-txt")?.addEventListener("click", () => {
    downloadFile(`${getSlug()}.txt`, storyToPlainText({ ...story, title: localTitle, content: localContent }, shelfName), "text/plain");
    expMenu?.classList.add("hidden");
  });
  container.querySelector("#exp-pdf")?.addEventListener("click", () => {
    printStoryPDF({ ...story, title: localTitle, content: localContent }, shelfName);
    expMenu?.classList.add("hidden");
  });

  // Delete — flush not needed, just delete
  container.querySelector("#btn-delete")?.addEventListener("click", () => {
    if (confirm("Delete this story?")) {
      if (autosaveTimer !== null) clearTimeout(autosaveTimer);
      store.deleteStory(storyId);
    }
  });

  // Also flush on page unload / hash change protection
  const handleBeforeUnload = () => {
    if (autosaveTimer !== null) {
      const finalTitle = localTitle.trim() ? localTitle.trim() : "Untitled Story";
      // synchronous save via store is async scheduled, but we try to persist directly
      // Use direct storage save for unload reliability
      store.updateStory(storyId, { title: finalTitle, content: localContent });
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload, { once: true });

  return container;
}
