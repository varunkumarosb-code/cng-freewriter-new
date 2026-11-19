import { store } from '../state/store';
import { logger } from '../utils/logger';
import { saveStories, saveCategories } from '../lib/storage';
import { getSyncKey, setSyncKey, regenerateSyncKey } from '../lib/syncKey';
import { restoreFromDeviceStorage } from '../lib/deviceBackup';
import { Capacitor } from '@capacitor/core';

export function openSettingsModal() {
  const existing = document.getElementById('settings-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'settings-modal-backdrop';
  backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';

  const isNative = Capacitor.isNativePlatform();
  const currentKey = getSyncKey();

  backdrop.innerHTML = `
    <div class="bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 text-nordic-textLight dark:text-nordic-textDark space-y-6 max-h-[90vh] overflow-y-auto">
      
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

      <!-- Sanctuary Sync & Device Protection -->
      <div class="space-y-3 p-4 rounded-xl bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark">
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase tracking-wider font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark">Sanctuary Sync & Device Protection</span>
          <span class="text-[10px] font-mono px-2 py-1 rounded-full bg-nordic-accentLight/10 dark:bg-nordic-accentDark/10 text-nordic-accentLight dark:text-nordic-accentDark font-bold">Universal Key</span>
        </div>
        
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark uppercase tracking-wider">Sanctuary Sync Key</label>
          <div class="flex gap-2">
            <input id="sync-key-input" type="text" readonly value="${currentKey}" class="flex-1 px-3 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark text-xs font-mono font-bold text-nordic-textLight dark:text-nordic-textDark tracking-wider select-all outline-none focus:border-nordic-accentLight dark:focus:border-nordic-accentDark" />
            <button id="btn-copy-key" class="px-3 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark text-xs font-semibold transition-colors flex items-center gap-1.5">
              <svg class="w-4 h-4 text-nordic-accentLight dark:text-nordic-accentDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v3"/></svg>
              Copy Key
            </button>
          </div>
          <div class="flex gap-2">
            <button id="btn-regenerate-key" class="flex-1 px-3 py-2 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold hover:opacity-90 transition-opacity">Regenerate</button>
            <span class="flex-1 text-[11px] leading-relaxed text-nordic-mutedLight dark:text-nordic-mutedDark flex items-center">Keep this key safe to sync across devices.</span>
          </div>
        </div>

        <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark">
          <span class="h-2 w-2 rounded-full ${isNative ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
          <span class="text-xs font-medium text-nordic-textLight dark:text-nordic-textDark">${isNative ? 'Auto-backup active (/Documents/CnG-Writer/)' : 'Browser Sandboxed'}</span>
          <span class="ml-auto text-[10px] font-mono px-2 py-1 rounded-full ${isNative ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'} font-bold">${isNative ? 'Native' : 'Web'}</span>
        </div>

        <button id="btn-restore-device" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-nordic-accentLight dark:border-nordic-accentDark bg-nordic-accentLight/10 dark:bg-nordic-accentDark/10 hover:bg-nordic-accentLight dark:hover:bg-nordic-accentDark hover:text-white dark:hover:text-nordic-bgDark text-nordic-accentLight dark:text-nordic-accentDark font-semibold text-xs transition-all">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
          Restore from Device Storage
        </button>
        <p class="text-[11px] leading-relaxed text-nordic-mutedLight dark:text-nordic-mutedDark">Scans your phone's Documents folder (CnG-Writer/cng_writer_backup.json) to reload backup.</p>
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
        <span>Build: <strong class="text-nordic-textLight dark:text-nordic-textDark">v${typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : '2.0.0'}</strong></span>
        <span>${typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' (IST)'}</span>
      </div>

    </div>
  `;

  document.body.appendChild(backdrop);

  // Close Modal Events
  backdrop.querySelector('#btn-close-modal')?.addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  // --- Sanctuary Sync Key Handlers ---
  const syncInput = backdrop.querySelector('#sync-key-input') as HTMLInputElement | null;
  backdrop.querySelector('#btn-copy-key')?.addEventListener('click', async () => {
    const key = syncInput?.value || getSyncKey();
    try {
      await navigator.clipboard.writeText(key);
      store.toast('Sync key copied to clipboard', 'ok');
      logger.action('SYNC', 'Copied sync key');
    } catch {
      // Fallback: select input
      if (syncInput) {
        syncInput.select();
        document.execCommand('copy');
        store.toast('Sync key copied', 'ok');
      }
    }
  });

  backdrop.querySelector('#btn-regenerate-key')?.addEventListener('click', () => {
    try {
      if (!confirm('Regenerate Sanctuary Sync Key? Old key will be invalid.')) return;
      const fresh = regenerateSyncKey();
      if (syncInput) syncInput.value = fresh;
      store.toast('Sync key regenerated', 'ok');
      logger.action('SYNC', `Regenerated sync key: ${fresh}`);
    } catch (err) {
      store.toast('Failed to regenerate key', 'error');
    }
  });

  // Allow manual editing: if user pastes custom key, validate on blur
  syncInput?.addEventListener('change', () => {
    const val = syncInput.value.trim().toUpperCase();
    if (!val) return;
    try {
      setSyncKey(val);
      syncInput.value = val;
      store.toast('Sync key updated', 'ok');
    } catch {
      store.toast('Invalid key format. Use CNG-XXXX-XXXX-XXXX', 'error');
      syncInput.value = getSyncKey();
    }
  });

  // --- Restore from Device Storage ---
  backdrop.querySelector('#btn-restore-device')?.addEventListener('click', async () => {
    const btn = backdrop.querySelector('#btn-restore-device') as HTMLButtonElement;
    const original = btn.innerHTML;
    btn.innerHTML = 'Scanning...';
    btn.setAttribute('disabled', 'true');
    try {
      const payload = await restoreFromDeviceStorage();
      if (!payload || !Array.isArray(payload.stories)) {
        store.toast('No device backup found in Documents/CnG-Writer/', 'error');
        logger.warn('DEVICE_BACKUP', 'No backup found on restore button');
        return;
      }
      // Merge using existing import logic
      const jsonStr = JSON.stringify(payload);
      const success = store.importBackupText(jsonStr);
      if (success) {
        store.toast(`Restored ${payload.stories.length} stories from device backup`, 'ok');
        logger.action('DEVICE_BACKUP', `Manual restore: ${payload.stories.length} stories`);
        setTimeout(() => {
          backdrop.remove();
          window.location.reload();
        }, 800);
      }
    } catch (err) {
      store.toast('Restore failed', 'error');
      logger.error('DEVICE_BACKUP', 'Manual restore failed', err);
    } finally {
      btn.innerHTML = original;
      btn.removeAttribute('disabled');
    }
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
