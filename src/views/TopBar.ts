import { store } from "../state/store";
import { openSettingsModal } from "./SettingsModal";

export function renderTopBar(): HTMLElement {
  const header = document.createElement("header");
  header.className = "sticky top-0 z-40 border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/80 dark:bg-nordic-bgDark/80 backdrop-blur-xl transition-colors duration-200";

  header.innerHTML = `
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
      <div class="flex items-center gap-2.5">
        <span class="grid h-8 w-8 place-items-center rounded-lg border border-nordic-accentLight/30 bg-nordic-accentLight/10 text-nordic-accentLight dark:border-nordic-accentDark/30 dark:bg-nordic-accentDark/10 dark:text-nordic-accentDark">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
        </span>
        <span class="font-serif text-[22px] font-semibold italic leading-none text-nordic-textLight dark:text-nordic-textDark">CnG</span>
        <span class="hidden font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-nordic-mutedLight dark:text-nordic-mutedDark sm:inline">Writer</span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2.5 py-1 font-mono text-[10px] text-nordic-mutedLight dark:text-nordic-mutedDark"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Private & Local</span>
      </div>

      <div class="flex items-center gap-2">
        <button id="btn-export-all" class="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-3 text-[13px] font-medium text-nordic-mutedLight dark:text-nordic-mutedDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Export All
        </button>
        <button id="btn-import-all" class="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-3 text-[13px] font-medium text-nordic-mutedLight dark:text-nordic-mutedDark hover:border-nordic-borderLight/80 transition-all">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Import
        </button>
        <span class="mx-1 hidden sm:block h-4 w-px bg-nordic-borderLight dark:bg-nordic-borderDark"></span>
        <button id="btn-new-story" class="inline-flex h-9 items-center gap-2 rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark px-3.5 text-[13px] font-bold text-white dark:text-nordic-bgDark hover:opacity-90 active:scale-[0.97] transition-all">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span class="hidden sm:inline">New story</span><span class="sm:hidden">New</span>
        </button>
        <button id="btn-settings" class="grid h-9 w-9 place-items-center rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight dark:hover:text-nordic-textDark transition-all">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>
    </div>
  `;

  header.querySelector("#btn-new-story")?.addEventListener("click", () => store.createStory());
  header.querySelector("#btn-export-all")?.addEventListener("click", () => store.exportAllBackup());
  header.querySelector("#btn-import-all")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const text = await file.text();
        store.importBackupText(text);
      }
    };
    input.click();
  });
  header.querySelector("#btn-settings")?.addEventListener("click", () => openSettingsModal());

  return header;
}
