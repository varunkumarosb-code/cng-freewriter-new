import { store } from '../state/store';
import { openSettingsModal } from './SettingsModal';

export function renderTopBar(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'sticky top-0 z-40 border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight/80 dark:bg-nordic-cardDark/80 backdrop-blur-md px-5 py-3';

  header.innerHTML = `
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
      <!-- Brand Logo & Badge -->
      <div class="flex items-center gap-3">
        <a href="#/" class="flex items-center gap-2 group">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark font-bold text-sm shadow">
            🌿
          </span>
          <div class="flex flex-col">
            <span class="font-serif font-bold text-base tracking-tight text-nordic-textLight dark:text-nordic-textDark group-hover:text-nordic-accentLight dark:group-hover:text-nordic-accentDark transition-colors">CnG <span class="font-mono text-xs font-normal opacity-70">WRITER</span></span>
          </div>
        </a>

        <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Local Sanctuary
        </span>
      </div>

      <!-- Top Actions -->
      <div class="flex items-center gap-2">
        <button id="top-btn-new" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold shadow hover:opacity-90 transition-all">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New story
        </button>

        <button id="top-btn-settings" class="grid h-8 w-8 place-items-center rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight dark:hover:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark transition-all" title="Settings & Backup">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>
    </div>
  `;

  header.querySelector('#top-btn-new')?.addEventListener('click', () => {
    store.createStory();
  });

  header.querySelector('#top-btn-settings')?.addEventListener('click', () => {
    openSettingsModal();
  });

  return header;
}