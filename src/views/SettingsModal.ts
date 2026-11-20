import { store } from '../state/store';
import { loadEditorSettings, saveEditorSettings } from '../lib/editorSettings';
import { logger } from '../utils/logger';
import { saveStories, saveCategories } from '../lib/storage';
import { getSyncKey, setSyncKey, regenerateSyncKey } from '../lib/syncKey';
import { restoreFromDeviceStorage } from '../lib/deviceBackup';
import { syncWithCloud } from '../lib/cloudSync';
import { Capacitor } from '@capacitor/core';

export function openSettingsModal() {
  const existing = document.getElementById('settings-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'settings-modal-backdrop';
  backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';

  const isNative = Capacitor.isNativePlatform();
  const currentKey = getSyncKey();
  const cloudNameStored = (() => { try { return localStorage.getItem('cng_cloudinary_cloud') || ''; } catch { return ''; } })();
  const presetStored = (() => { try { return localStorage.getItem('cng_cloudinary_preset') || ''; } catch { return ''; } })();
  const lastCloudUrl = (() => { try { return localStorage.getItem('cng_cloudinary_last_url') || ''; } catch { return ''; } })();

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

      <!-- Sanctuary Sync & Device Protection — Interactive Sync Key & Pairing UI -->
      <div class="space-y-3 p-4 rounded-xl bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark">
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase tracking-wider font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark">Sanctuary Sync & Device Protection</span>
          <span class="text-[10px] font-mono px-2 py-1 rounded-full bg-nordic-accentLight/10 dark:bg-nordic-accentDark/10 text-nordic-accentLight dark:text-nordic-accentDark font-bold">Universal Key</span>
        </div>
        
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark uppercase tracking-wider">Sanctuary Sync Key</label>
          <input id="sync-key-input" type="text" value="${currentKey}" placeholder="CNG-XXXX-XXXX-XXXX" class="w-full px-3 py-2.5 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark text-xs font-mono font-bold text-nordic-textLight dark:text-nordic-textDark tracking-wider outline-none focus:border-nordic-accentLight dark:focus:border-nordic-accentDark select-all" />
          <div class="grid grid-cols-2 gap-2">
            <button id="btn-copy" class="px-3 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-nordic-accentLight dark:text-nordic-accentDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v3"/></svg>
              Copy
            </button>
            <button id="btn-paste" class="px-3 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-nordic-accentLight dark:text-nordic-accentDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              Paste
            </button>
            <button id="btn-link-sync" class="px-3 py-2 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">Link & Sync</button>
            <button id="btn-new-key" class="px-3 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark text-xs font-semibold transition-colors">New Key</button>
          </div>
          <!-- Hidden legacy IDs for backward compat / tests -->
          <div class="hidden">
            <button id="btn-copy-key"></button>
            <button id="btn-regenerate-key"></button>
          </div>
          <button id="btn-sync-now" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold hover:opacity-90 transition-all shadow-sm">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 0 6.74 2.74L23 8"/><path d="M3 12a9 9 0 1 0 9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M23 8v5h-5"/><path d="M3 16v-5h5"/></svg>
            Sync Now 🔄
          </button>
          <p class="text-[11px] leading-relaxed text-nordic-mutedLight dark:text-nordic-mutedDark">Copy this key to another device, paste and Link & Sync to merge libraries instantly.</p>
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

      <!-- Cloudinary Cloud Vault (Optional Off-site Archive) -->
      <div class="space-y-3 p-4 rounded-xl bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark">
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase tracking-wider font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark">Cloudinary Cloud Vault</span>
          <span class="text-[10px] font-mono px-2 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">Off-site Archive</span>
        </div>
        <p class="text-[11px] leading-relaxed text-nordic-mutedLight dark:text-nordic-mutedDark">Optional encrypted off-site archive. Your JSON library is uploaded as a raw file to your Cloudinary account.</p>
        <div class="space-y-2">
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark uppercase tracking-wider">Cloud Name</label>
            <input id="cloudinary-cloud" type="text" value="${cloudNameStored}" placeholder="e.g. demo-cloud" class="w-full px-3 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark text-xs font-mono text-nordic-textLight dark:text-nordic-textDark outline-none focus:border-nordic-accentLight dark:focus:border-nordic-accentDark" />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-nordic-mutedLight dark:text-nordic-mutedDark uppercase tracking-wider">Upload Preset</label>
            <input id="cloudinary-preset" type="text" value="${presetStored}" placeholder="e.g. cng_writer_preset (unsigned)" class="w-full px-3 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark text-xs font-mono text-nordic-textLight dark:text-nordic-textDark outline-none focus:border-nordic-accentLight dark:focus:border-nordic-accentDark" />
          </div>
          <button id="btn-cloudinary-backup" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark font-semibold text-xs transition-all shadow-sm">
            <svg class="w-4 h-4 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Backup to Cloudinary
          </button>
          <div id="cloudinary-status" class="text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark break-all">
            ${lastCloudUrl ? `<a href="${lastCloudUrl}" target="_blank" rel="noopener" class="text-sky-600 dark:text-sky-400 underline hover:opacity-80">Last: ${lastCloudUrl}</a>` : '<span class="opacity-60">No vault backup yet</span>'}
          </div>
        </div>
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

      <!-- Open Last Story on Launch -->
      <div class="space-y-2 p-4 rounded-xl bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>⚡</span>
            <span class="text-xs font-semibold text-nordic-textLight dark:text-nordic-textDark">Open last story on launch</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="toggle-open-last-story" class="sr-only peer" />
            <div class="w-11 h-6 bg-nordic-borderLight dark:bg-nordic-borderDark rounded-full peer peer-checked:bg-nordic-accentLight dark:peer-checked:bg-nordic-accentDark transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
          </label>
        </div>
        <p class="text-[11px] leading-relaxed text-nordic-mutedLight dark:text-nordic-mutedDark">Automatically enter editor for your last opened story</p>
      </div>

      <!-- Build Info Footer -->
      <div class="pt-3 border-t border-nordic-borderLight dark:border-nordic-borderDark flex items-center justify-between text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">
        <span>Build: <strong class="text-nordic-textLight dark:text-nordic-textDark">v${typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : (typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : '2.0.0')}</strong></span>
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

  // Copy
  const handleCopy = async () => {
    const key = syncInput?.value?.trim() || getSyncKey();
    try {
      await navigator.clipboard.writeText(key);
      store.toast('Sync key copied to clipboard', 'ok');
      logger.action('SYNC', 'Copied sync key');
    } catch {
      if (syncInput) {
        syncInput.select();
        try { document.execCommand('copy'); } catch {}
        store.toast('Sync key copied', 'ok');
      }
    }
  };
  backdrop.querySelector('#btn-copy')?.addEventListener('click', handleCopy);
  // Legacy alias
  backdrop.querySelector('#btn-copy-key')?.addEventListener('click', handleCopy);

  // Paste
  backdrop.querySelector('#btn-paste')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && syncInput) {
        syncInput.value = text.trim().toUpperCase();
        syncInput.focus();
        store.toast('Pasted from clipboard', 'ok');
        logger.action('SYNC', 'Pasted sync key from clipboard');
      } else {
        store.toast('Clipboard empty', 'error');
      }
    } catch {
      store.toast('Clipboard read failed — please paste manually (Ctrl+V)', 'error');
      if (syncInput) syncInput.focus();
    }
  });

  // Link & Sync
  backdrop.querySelector('#btn-link-sync')?.addEventListener('click', async () => {
    if (!syncInput) return;
    const val = syncInput.value.trim().toUpperCase();
    if (!val) {
      store.toast('Please enter a sync key', 'error');
      return;
    }
    try {
      setSyncKey(val);
      logger.action('SYNC', `Link & Sync: saved key ${val}`);
      store.toast('Syncing with Sanctuary...', 'info');
      const result = await syncWithCloud();
      if (result.success) {
        const msg = result.message || `Sync complete! ${result.totalStories ?? store.stories.length} stories up-to-date across all devices.`;
        store.toast(msg, 'ok');
        logger.info('SYNC', `Link & Sync success: ${msg}`);
        // Trigger UI re-render via store notification already happens in syncWithCloud merge
        setTimeout(() => backdrop.remove(), 800);
      } else {
        const errMsg = result.message || 'Sync failed';
        store.toast(errMsg, 'error');
        logger.warn('SYNC', `Link & Sync failed: ${errMsg}`);
      }
    } catch (err: any) {
      store.toast(err?.message || 'Invalid key format. Use CNG-XXXX-XXXX-XXXX', 'error');
      if (syncInput) syncInput.value = getSyncKey();
    }
  });

  // New Key
  const handleNewKey = () => {
    try {
      const fresh = regenerateSyncKey();
      if (syncInput) syncInput.value = fresh;
      store.toast('New key generated — Link & Sync to activate', 'ok');
      logger.action('SYNC', `New sync key generated: ${fresh}`);
    } catch {
      store.toast('Failed to generate key', 'error');
    }
  };
  backdrop.querySelector('#btn-new-key')?.addEventListener('click', handleNewKey);
  backdrop.querySelector('#btn-regenerate-key')?.addEventListener('click', handleNewKey);

  // Sync Now
  backdrop.querySelector('#btn-sync-now')?.addEventListener('click', async () => {
    const btn = backdrop.querySelector('#btn-sync-now') as HTMLButtonElement;
    const original = btn.innerHTML;
    btn.innerHTML = 'Syncing...';
    btn.setAttribute('disabled', 'true');
    store.toast('Syncing with Sanctuary...', 'info');
    logger.action('SYNC', 'Manual Sync Now triggered');
    try {
      const result = await syncWithCloud();
      if (result.success) {
        const msg = result.message || `Sync complete! ${result.totalStories ?? store.stories.length} stories up-to-date across all devices.`;
        store.toast(msg, 'ok');
        logger.info('SYNC', `Manual Sync Now success: ${msg}`);
      } else {
        const errMsg = result.message || 'Sync failed';
        store.toast(errMsg, 'error');
        logger.warn('SYNC', `Sync Now failed: ${errMsg}`);
      }
    } catch (e: any) {
      store.toast(e?.message || 'Sync failed', 'error');
      logger.error('SYNC', 'Sync Now failed', e);
    } finally {
      btn.innerHTML = original;
      btn.removeAttribute('disabled');
    }
  });

  // Allow manual editing: validate on change
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

  // --- Cloudinary Vault Backup ---
  const cloudInput = backdrop.querySelector('#cloudinary-cloud') as HTMLInputElement | null;
  const presetInput = backdrop.querySelector('#cloudinary-preset') as HTMLInputElement | null;
  const statusEl = backdrop.querySelector('#cloudinary-status') as HTMLElement | null;

  const persistCloudinary = () => {
    try {
      if (cloudInput) localStorage.setItem('cng_cloudinary_cloud', cloudInput.value.trim());
      if (presetInput) localStorage.setItem('cng_cloudinary_preset', presetInput.value.trim());
    } catch {}
  };
  cloudInput?.addEventListener('change', persistCloudinary);
  presetInput?.addEventListener('change', persistCloudinary);
  cloudInput?.addEventListener('blur', persistCloudinary);
  presetInput?.addEventListener('blur', persistCloudinary);

  backdrop.querySelector('#btn-cloudinary-backup')?.addEventListener('click', async () => {
    const btn = backdrop.querySelector('#btn-cloudinary-backup') as HTMLButtonElement;
    const original = btn.innerHTML;
    const cloudName = cloudInput?.value.trim() || (() => { try { return localStorage.getItem('cng_cloudinary_cloud') || ''; } catch { return ''; } })();
    const preset = presetInput?.value.trim() || (() => { try { return localStorage.getItem('cng_cloudinary_preset') || ''; } catch { return ''; } })();

    if (!cloudName || !preset) {
      store.toast('Please fill Cloud Name and Upload Preset', 'error');
      return;
    }
    persistCloudinary();
    btn.innerHTML = 'Uploading...';
    btn.setAttribute('disabled', 'true');
    if (statusEl) statusEl.textContent = 'Uploading to Cloudinary...';
    try {
      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        stories: store.stories,
        categories: store.categories,
        sync_key: getSyncKey()
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });

      const formData = new FormData();
      formData.append('file', blob, `cng-writer-backup-${new Date().toISOString().slice(0,10)}.json`);
      formData.append('upload_preset', preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Cloudinary upload failed ${res.status}: ${errText}`);
      }

      const json = await res.json() as { secure_url?: string; url?: string; public_id?: string };
      const url = json.secure_url || json.url || '';
      if (url) {
        try { localStorage.setItem('cng_cloudinary_last_url', url); } catch {}
        if (statusEl) statusEl.innerHTML = `<a href="${url}" target="_blank" rel="noopener" class="text-sky-600 dark:text-sky-400 underline hover:opacity-80 break-all">Vault URL: ${url}</a>`;
        // Also show toast
        store.toast('Cloud Vault backup complete', 'ok');
        logger.action('CLOUDINARY', `Backup uploaded: ${url}`);
        // Open link optional
        // window.open(url, '_blank');
      } else {
        if (statusEl) statusEl.textContent = 'Upload succeeded but no URL returned';
        store.toast('Upload succeeded', 'ok');
      }
    } catch (err: any) {
      const msg = err?.message || 'Cloudinary backup failed';
      if (statusEl) statusEl.textContent = msg;
      store.toast(msg, 'error');
      logger.error('CLOUDINARY', 'Backup failed', err);
    } finally {
      btn.innerHTML = original;
      btn.removeAttribute('disabled');
    }
  });

  // Open Last Story toggle
  {
    const prefs = loadEditorSettings();
    const toggle = backdrop.querySelector('#toggle-open-last-story') as HTMLInputElement | null;
    if (toggle) {
      toggle.checked = !!prefs.openLastStoryOnLaunch;
      toggle.addEventListener('change', () => {
        const cur = loadEditorSettings();
        saveEditorSettings({ ...cur, openLastStoryOnLaunch: toggle.checked, lastActiveStoryId: cur.lastActiveStoryId ?? store.activeStoryId ?? null });
        store.toast(toggle.checked ? 'Auto-open last story enabled' : 'Auto-open last story disabled');
      });
    }
  }

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
