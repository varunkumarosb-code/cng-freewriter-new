import { store } from '../state/store';
import { countWords } from '../lib/format';
import { logger, LogEntry } from '../utils/logger';
import { BUILD_INFO } from '../build-info';
import { getAutosaveDelayMs, setAutosaveDelaySec } from '../lib/storage';

let isAdminAuthenticated = false;
let currentFilter: string = 'ALL';

export function renderAdminPanel(): HTMLElement {
  const container = document.createElement('div');

  if (!isAdminAuthenticated) {
    container.innerHTML = `
      <div class="min-h-screen bg-nordic-bgLight dark:bg-nordic-bgDark text-nordic-textLight dark:text-nordic-textDark flex items-center justify-center p-4">
        <div class="bg-nordic-cardLight dark:bg-nordic-cardDark p-8 rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark shadow-2xl max-w-md w-full">
          <div class="text-center mb-6">
            <span class="inline-block p-3 rounded-2xl bg-nordic-accentLight/10 dark:bg-nordic-accentDark/10 text-nordic-accentLight dark:text-nordic-accentDark mb-3 text-2xl">🛡️</span>
            <h1 class="text-2xl font-serif font-bold">Admin & Diagnostic Portal</h1>
            <p class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark mt-1">CnG Writer System Telemetry</p>
          </div>

          <form id="admin-login-form" class="space-y-4">
            <div>
              <label class="block text-xs uppercase tracking-wider font-semibold mb-1 text-nordic-mutedLight dark:text-nordic-mutedDark">Master Secret Passcode</label>
              <input type="password" id="admin-passcode" placeholder="Enter WRITER_PANEL_LOGIN" 
                     class="w-full px-4 py-2.5 rounded-xl bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark focus:outline-none focus:border-nordic-accentLight dark:focus:border-nordic-accentDark text-sm font-mono text-nordic-textLight dark:text-nordic-textDark" required />
            </div>
            <div id="login-error" class="text-xs text-rose-500 hidden font-semibold">Invalid Passcode! Check WRITER_PANEL_LOGIN.</div>

            <div class="flex gap-2 pt-2">
              <a href="#/" class="flex-1 px-4 py-2.5 rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark text-center text-sm font-medium hover:bg-nordic-borderLight/30">Back to App</a>
              <button type="submit" class="flex-1 px-4 py-2.5 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark font-bold text-sm shadow hover:opacity-90">Authenticate</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = container.querySelector('#admin-login-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = (container.querySelector('#admin-passcode') as HTMLInputElement).value;
      const injectedSecret = (typeof __CF_ADMIN_SECRET__ !== 'undefined' && __CF_ADMIN_SECRET__) ? __CF_ADMIN_SECRET__ : '';
      const expectedSecret = localStorage.getItem('WRITER_PANEL_SECRET') || injectedSecret || BUILD_INFO.adminSecretDefault || 'WRITER_PANEL_LOGIN';

      if (input === expectedSecret) {
        isAdminAuthenticated = true;
        logger.info('AUTH', 'Admin authenticated successfully');
        container.parentElement?.replaceChildren(renderAdminPanel());
      } else {
        logger.warn('AUTH', 'Failed admin login attempt');
        const err = container.querySelector('#login-error');
        err?.classList.remove('hidden');
      }
    });

    return container;
  }

  // Dashboard View
  const logs = logger.getLogs();
  const filteredLogs = currentFilter === 'ALL' ? logs : logs.filter((l: LogEntry) => l.level === currentFilter);

  let totalStorageBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || '';
    totalStorageBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
  }
  const storageKB = (totalStorageBytes / 1024).toFixed(2);
  const totalWords = store.stories.reduce((acc: number, s) => acc + countWords(s.content || ''), 0);
  const currentAutosaveSec = Math.round(getAutosaveDelayMs() / 1000);

  container.innerHTML = `
    <div class="min-h-screen bg-nordic-bgLight dark:bg-nordic-bgDark text-nordic-textLight dark:text-nordic-textDark p-4 md:p-8">
      <div class="max-w-6xl mx-auto space-y-6">
        
        <!-- Top Bar -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-nordic-borderLight dark:border-nordic-borderDark">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-2xl">⚡</span>
              <h1 class="text-2xl font-serif font-bold">CnG Writer Telemetry & Control Panel</h1>
            </div>
            <p class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark mt-1">
              Build: <code class="text-nordic-accentLight dark:text-nordic-accentDark font-bold">${BUILD_INFO.version}</code> · Deployed: <code class="font-bold">${BUILD_INFO.deployedAtIST}</code>
            </p>
          </div>
          
          <div class="flex items-center gap-3">
            <button id="btn-nuke-sw" class="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/20">
              💥 Nuke SW & Force Cache Bust
            </button>
            <a href="#/" class="px-4 py-1.5 rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold shadow hover:opacity-90">
              ← Exit to Writer
            </a>
          </div>
        </div>

        <!-- Diagnostics Cards Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark">
            <div class="text-[11px] uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Stories / Books</div>
            <div class="text-2xl font-bold mt-1 text-nordic-accentLight dark:text-nordic-accentDark">${store.stories.length}</div>
            <div class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark mt-1">${totalWords.toLocaleString()} total words</div>
          </div>

          <div class="p-4 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark">
            <div class="text-[11px] uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">LocalStorage Used</div>
            <div class="text-2xl font-bold mt-1 font-mono">${storageKB} KB</div>
            <div class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark mt-1">Quota: ~5-10 MB</div>
          </div>

          <div class="p-4 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark">
            <div class="text-[11px] uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Sanctuary Sync Mode</div>
            <div class="text-2xl font-bold mt-1 text-emerald-500 flex items-center gap-1.5 text-base">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span> 100% Local-First
            </div>
            <div class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark mt-1">Sandboxed in Browser</div>
          </div>

          <div class="p-4 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark">
            <div class="text-[11px] uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Active Theme</div>
            <div class="text-2xl font-bold mt-1 capitalize">${store.theme} Mode</div>
            <div class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark mt-1">Nordic Forest Palette</div>
          </div>
        </div>

        <!-- Autosave Debounce Interval Controller -->
        <div class="p-5 rounded-2xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark space-y-4">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-sm flex items-center gap-2">
                <span>⏱️</span> Autosave Debounce Interval
              </h3>
              <p class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark mt-1">Tune editor auto-save delay. 1–60 seconds. Current: <span class="font-mono font-semibold text-nordic-accentLight dark:text-nordic-accentDark">${currentAutosaveSec}s</span> → <span class="font-mono">${(currentAutosaveSec * 1000).toLocaleString()}ms</span></p>
            </div>
            <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">${currentAutosaveSec}s active</span>
          </div>
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div class="flex items-center gap-2">
              <input id="input-autosave-delay" type="number" min="1" max="60" step="1" value="${currentAutosaveSec}" class="w-20 px-3 py-2 rounded-lg bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark text-sm font-mono text-nordic-textLight dark:text-nordic-textDark focus:outline-none focus:border-nordic-accentLight dark:focus:border-nordic-accentDark" />
              <span class="text-xs font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">seconds</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button data-preset="2" class="preset-btn px-3 py-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-xs font-mono hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">2s</button>
              <button data-preset="5" class="preset-btn px-3 py-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-xs font-mono hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">5s</button>
              <button data-preset="10" class="preset-btn px-3 py-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-xs font-mono hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">10s</button>
              <button data-preset="30" class="preset-btn px-3 py-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark text-xs font-mono hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">30s</button>
            </div>
            <button id="btn-save-autosave" class="sm:ml-auto px-4 py-2 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold shadow hover:opacity-90 transition-all">Save Interval</button>
          </div>
          <div id="autosave-status" class="text-xs font-mono hidden"></div>
        </div>

        <!-- Live Event Logs Viewer -->
        <div class="p-5 rounded-2xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark space-y-4">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-base flex items-center gap-2">
                <span>📜</span> Live System & Action Logs
              </h3>
              <p class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark">Auto-recorded ring buffer of internal actions and auto-saves</p>
            </div>

            <!-- Filter Pills -->
            <div class="flex flex-wrap items-center gap-1.5 text-xs">
              ${['ALL', 'ACTION', 'INFO', 'WARN', 'ERROR'].map((f) => `
                <button class="btn-filter px-2.5 py-1 rounded-lg border font-mono transition-colors ${currentFilter === f ? 'bg-nordic-accentLight text-white border-nordic-accentLight dark:bg-nordic-accentDark dark:text-nordic-bgDark' : 'border-nordic-borderLight dark:border-nordic-borderDark text-nordic-mutedLight dark:text-nordic-mutedDark'}" data-filter="${f}">
                  ${f}
                </button>
              `).join('')}
              <button id="btn-clear-logs" class="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20">Clear</button>
              <button id="btn-copy-logs" class="px-2.5 py-1 rounded-lg bg-nordic-borderLight/20 border border-nordic-borderLight dark:border-nordic-borderDark hover:opacity-80">Copy JSON</button>
            </div>
          </div>

          <!-- Terminal Window -->
          <div class="bg-[#090e0d] text-[#e3ebe6] p-4 rounded-xl font-mono text-xs max-h-96 overflow-y-auto space-y-2 border border-nordic-borderDark">
            ${filteredLogs.length === 0 ? '<div class="text-white/40 py-4 text-center">No logs found for this filter.</div>' : ''}
            ${filteredLogs.map((l: LogEntry) => {
              const badgeColor = l.level === 'ERROR' ? 'text-red-400 bg-red-950/60' : l.level === 'WARN' ? 'text-amber-400 bg-amber-950/60' : l.level === 'ACTION' ? 'text-cyan-400 bg-cyan-950/60' : 'text-emerald-400 bg-emerald-950/60';
              return `
                <div class="flex items-start gap-2 border-b border-white/5 pb-1">
                  <span class="text-white/40 shrink-0">[${l.timestamp}]</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${badgeColor}">${l.level}</span>
                  <span class="text-emerald-300 font-semibold shrink-0">[${l.tag}]</span>
                  <span class="text-white/90 break-all">${l.message}</span>
                  ${l.data ? `<span class="text-white/40 text-[11px] truncate">(${JSON.stringify(l.data)})</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Secret Passcode Changer -->
        <div class="p-5 rounded-2xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 class="font-bold text-sm">Custom Admin Secret</h4>
            <p class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark">Override the default secret <code class="bg-nordic-borderLight/40 px-1 py-0.5 rounded">WRITER_PANEL_LOGIN</code> with your own passcode.</p>
          </div>
          <div class="flex items-center gap-2 w-full md:w-auto">
            <input type="text" id="input-new-secret" placeholder="New Secret Passcode" class="px-3 py-1.5 rounded-lg bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark text-xs font-mono text-nordic-textLight dark:text-nordic-textDark" />
            <button id="btn-save-secret" class="px-3 py-1.5 rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold">Save</button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Attach Events
  container.querySelectorAll('.btn-filter').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      currentFilter = (e.currentTarget as HTMLElement).getAttribute('data-filter') || 'ALL';
      container.parentElement?.replaceChildren(renderAdminPanel());
    });
  });

  container.querySelector('#btn-clear-logs')?.addEventListener('click', () => {
    logger.clearLogs();
    container.parentElement?.replaceChildren(renderAdminPanel());
  });

  container.querySelector('#btn-copy-logs')?.addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(logger.getLogs(), null, 2));
    alert('Logs copied to clipboard!');
  });

  container.querySelector('#btn-nuke-sw')?.addEventListener('click', async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
    alert('Service Workers and Cache Storage nuked! Reloading fresh...');
    window.location.hash = '#/';
    window.location.reload();
  });

  container.querySelector('#btn-save-secret')?.addEventListener('click', () => {
    const input = (container.querySelector('#input-new-secret') as HTMLInputElement).value.trim();
    if (input) {
      localStorage.setItem('WRITER_PANEL_SECRET', input);
      alert(`Admin Secret updated to: ${input}`);
    }
  });

  // Autosave Interval Controller
  const autosaveInput = container.querySelector('#input-autosave-delay') as HTMLInputElement | null;
  const autosaveStatus = container.querySelector('#autosave-status') as HTMLElement | null;

  container.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetVal = (btn as HTMLElement).getAttribute('data-preset') || '5';
      if (autosaveInput) autosaveInput.value = presetVal;
      autosaveInput?.focus();
    });
  });

  container.querySelector('#btn-save-autosave')?.addEventListener('click', () => {
    if (!autosaveInput) return;
    let val = parseInt(autosaveInput.value, 10);
    if (Number.isNaN(val)) val = 5;
    val = Math.min(60, Math.max(1, Math.round(val)));
    autosaveInput.value = String(val);
    setAutosaveDelaySec(val);
    localStorage.setItem('cng_autosave_delay_sec', String(val));
    logger.info('CONFIG', `Autosave interval updated to ${val} seconds`);
    logger.action('CONFIG', `Autosave interval updated to ${val} seconds`);
    try { store.toast(`Autosave interval saved: ${val}s`, 'ok'); } catch {}
    if (autosaveStatus) {
      autosaveStatus.textContent = `✓ Saved: ${val}s (${val * 1000}ms) — editor will use new delay`;
      autosaveStatus.className = 'text-xs font-mono text-emerald-600 dark:text-emerald-400';
      autosaveStatus.classList.remove('hidden');
      setTimeout(() => autosaveStatus.classList.add('hidden'), 3000);
    }
    // Re-render admin panel to reflect new current value in header
    setTimeout(() => container.parentElement?.replaceChildren(renderAdminPanel()), 400);
  });

  return container;
}