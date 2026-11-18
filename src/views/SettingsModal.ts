import { store } from '../state/store';
import { BUILD_INFO } from '../build-info';
import { logger } from '../utils/logger';
import { saveStories, saveCategories } from '../lib/storage';

export function openSettingsModal() {
  const existing = document.getElementById('settings-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'settings-modal-backdrop';
  backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';

  backdrop.innerHTML = `
    <div class="bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 text-nordic-textLight dark:text-nordic-textDark space-y-6">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-nordic-borderLight dark:border-nordic-borderDark">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">🌿</span>
          <h3 class="font-serif text-lg font-bold">Library Settings & Backup</h3>
        </div>
        <button id="btn-close-modal" class="text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight dark:hover:text-nordic-textDark p-1 rounded-lg transition-colors">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- Sanctuary Status (100% Private) -->
      <div class="p-4 rounded-xl bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase tracking-wider font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark">Storage Architecture</span>
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span> 100% Private & Local
          </span>
        </div>
        <p class="text-[12px] leading-relaxed text-nordic-mutedLight dark:text-nordic-mutedDark">
          All drafts and categories live strictly in your browser's sandboxed storage. Zero remote tracking, zero cloud leakage.
        </p>
      </div>

      <!-- Library Backup / Restore -->
      <div class="space-y-3">
        <span class="text-xs uppercase tracking-wider font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark block">Library Backup</span>
        <div class="grid grid-cols-2 gap-3">
          <button id="btn-modal-export" class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark font-semibold text-xs transition-all shadow-sm">
            <svg class="w-4 h-4 text-nordic-accentLight dark:text-nordic-accentDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export JSON
          </button>

          <label class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark font-semibold text-xs transition-all shadow-sm cursor-pointer">
            <svg class="w-4 h-4 text-nordic-accentLight dark:text-nordic-accentDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Import JSON
            <input type="file" id="input-modal-import" accept=".json" class="hidden" />
          </label>
        </div>
      </div>

      <!-- Build Info Footer -->
      <div class="pt-3 border-t border-nordic-borderLight dark:border-nordic-borderDark flex items-center justify-between text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">
        <span>Build: <strong class="text-nordic-textLight dark:text-nordic-textDark">${BUILD_INFO.version}</strong></span>
        <span>${BUILD_INFO.deployedAtIST}</span>
      </div>

    </div>
  `;

  document.body.appendChild(backdrop);

  // Close Modal Events
  backdrop.querySelector('#btn-close-modal')?.addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  // Export JSON
  backdrop.querySelector('#btn-modal-export')?.addEventListener('click', () => {
    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      stories: store.stories,
      categories: store.categories
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.action('BACKUP', 'Exported JSON backup file');
  });

  // Import JSON
  const importInput = backdrop.querySelector('#input-modal-import') as HTMLInputElement;
  importInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.stories)) {
          parsed.stories.forEach((s: any) => {
            const exists = store.stories.find((ex) => ex.id === s.id);
            if (!exists) {
              store.stories.push(s);
            }
          });
          saveStories(store.stories);

          if (Array.isArray(parsed.categories)) {
            parsed.categories.forEach((c: any) => {
              const exists = store.categories.find((ex) => ex.id === c.id);
              if (!exists) {
                store.categories.push(c);
              }
            });
            saveCategories(store.categories);
          }

          logger.action('BACKUP', `Successfully imported ${parsed.stories.length} stories`);
          alert(`Successfully imported ${parsed.stories.length} stories!`);
          backdrop.remove();
          window.location.reload();
        }
      } catch (err) {
        alert('Invalid JSON backup file.');
        logger.error('BACKUP', 'Failed to import JSON', err);
      }
    };
    reader.readAsText(file);
  });
}