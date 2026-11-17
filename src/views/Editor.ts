import { store } from "../state/store";
import { countWords, formatDate, readingMinutes, slugify } from "../lib/format";
import { downloadFile, printStoryPDF, storyToMarkdown, storyToPlainText } from "../lib/backup";
import { getEffectiveShelfName } from "../lib/storage";

export function renderEditor(storyId: string): HTMLElement {
  const story = store.stories.find((s) => s.id === storyId);

  const container = document.createElement("div");
  container.className = "min-h-[calc(100vh-4rem)] bg-nordic-bgLight dark:bg-nordic-bgDark transition-colors duration-200";

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
    <div class="sticky top-16 z-30 border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/70 dark:bg-nordic-bgDark/70 backdrop-blur-xl">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <div class="flex items-center gap-3">
          <button id="btn-back" class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2.5 text-[13px] font-medium text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark transition-all">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Shelf
          </button>
          <span id="save-indicator" class="font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">${saveStatus}</span>
        </div>

        <div class="flex items-center gap-2">
          <select id="select-shelf" class="h-8 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2.5 text-[12px] text-nordic-textLight dark:text-nordic-textDark outline-none">
            <option value="">Unshelved</option>
            ${store.categories.map((c) => `<option value="${c.id}" ${c.id === story.categoryId ? "selected" : ""}>${c.name}</option>`).join("")}
          </select>

          <div class="relative">
            <button id="btn-export-dropdown" class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-3 text-[12px] font-medium text-nordic-textLight dark:text-nordic-textDark transition-all">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export
            </button>
            <div id="export-menu" class="hidden absolute right-0 z-40 mt-1 w-44 rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark py-1 shadow-lg">
              <button id="exp-md" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Markdown (.md)</button>
              <button id="exp-txt" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Plain text (.txt)</button>
              <button id="exp-pdf" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Print / PDF</button>
            </div>
          </div>

          <button id="btn-delete" class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-3 text-[12px] font-medium text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Zen Writing Pad -->
    <div class="mx-auto max-w-3xl px-5 py-10">
      <div class="rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-8 shadow-sm">
        <textarea
          id="editor-title"
          rows="1"
          placeholder="Untitled Story"
          class="w-full resize-none overflow-hidden bg-transparent font-serif text-[30px] font-semibold leading-tight text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight/50 dark:placeholder:text-nordic-mutedDark/50"
        >${localTitle}</textarea>

        <div class="mt-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          ${shelfName} · Last edited ${formatDate(story.updatedAt)}
        </div>
        <div class="mt-6 h-px bg-nordic-borderLight dark:bg-nordic-borderDark"></div>

        <textarea
          id="editor-content"
          rows="14"
          placeholder="Begin writing your story here…"
          class="mt-8 min-h-[420px] w-full resize-none overflow-hidden bg-transparent font-serif text-lg leading-loose text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight/50 dark:placeholder:text-nordic-mutedDark/50"
        >${localContent}</textarea>

        <!-- Stats Bar -->
        <div class="mt-8 flex flex-wrap items-center justify-between gap-2 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-4 py-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          <span id="stats-text">${countWords(localContent).toLocaleString()} words · ${localContent.length.toLocaleString()} chars · ${readingMinutes(localContent)} min read</span>
          <span class="text-nordic-accentLight dark:text-nordic-accentDark font-semibold">Zen Active</span>
        </div>
      </div>
    </div>
  `;

  // Autoresize utility
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const titleEl = container.querySelector("#editor-title") as HTMLTextAreaElement;
  const contentEl = container.querySelector("#editor-content") as HTMLTextAreaElement;
  const saveIndEl = container.querySelector("#save-indicator") as HTMLElement;
  const statsEl = container.querySelector("#stats-text") as HTMLElement;

  if (titleEl) autoResize(titleEl);
  if (contentEl) autoResize(contentEl);

  const scheduleSave = () => {
    saveIndEl.innerText = "Saving...";
    saveIndEl.className = "font-mono text-[11px] text-amber-500 animate-pulse";
    if (autosaveTimer !== null) clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      store.updateStory(storyId, { title: localTitle, content: localContent });
      saveIndEl.innerText = "Saved";
      saveIndEl.className = "font-mono text-[11px] text-nordic-accentLight dark:text-nordic-accentDark";
      autosaveTimer = null;
    }, 200);
  };

  titleEl?.addEventListener("input", (e) => {
    localTitle = (e.target as HTMLTextAreaElement).value;
    autoResize(titleEl);
    scheduleSave();
  });

  contentEl?.addEventListener("input", (e) => {
    localContent = (e.target as HTMLTextAreaElement).value;
    autoResize(contentEl);
    statsEl.innerText = `${countWords(localContent).toLocaleString()} words · ${localContent.length.toLocaleString()} chars · ${readingMinutes(localContent)} min read`;
    scheduleSave();
  });

  // Back to Shelf
  container.querySelector("#btn-back")?.addEventListener("click", () => {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer);
      store.updateStory(storyId, { title: localTitle, content: localContent });
    }
    store.setActiveStory(null);
  });

  // Shelf Dropdown
  const selectShelf = container.querySelector("#select-shelf") as HTMLSelectElement;
  selectShelf?.addEventListener("change", () => {
    store.updateStory(storyId, { categoryId: selectShelf.value });
  });

  // Export Menu
  const expBtn = container.querySelector("#btn-export-dropdown");
  const expMenu = container.querySelector("#export-menu");
  expBtn?.addEventListener("click", () => {
    exportMenuOpen = !exportMenuOpen;
    expMenu?.classList.toggle("hidden", !exportMenuOpen);
  });

  const slug = slugify(localTitle || "untitled");
  container.querySelector("#exp-md")?.addEventListener("click", () => {
    downloadFile(`${slug}.md`, storyToMarkdown({ ...story, title: localTitle, content: localContent }, shelfName), "text/markdown");
    expMenu?.classList.add("hidden");
  });
  container.querySelector("#exp-txt")?.addEventListener("click", () => {
    downloadFile(`${slug}.txt`, storyToPlainText({ ...story, title: localTitle, content: localContent }, shelfName), "text/plain");
    expMenu?.classList.add("hidden");
  });
  container.querySelector("#exp-pdf")?.addEventListener("click", () => {
    printStoryPDF({ ...story, title: localTitle, content: localContent }, shelfName);
    expMenu?.classList.add("hidden");
  });

  // Delete
  container.querySelector("#btn-delete")?.addEventListener("click", () => {
    if (confirm("Delete this story?")) {
      store.deleteStory(storyId);
    }
  });

  return container;
}
