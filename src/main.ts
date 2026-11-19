import './style.css';
import { store } from './state/store';
import { renderTopBar } from './views/TopBar';
import { renderBookshelf } from './views/Bookshelf';
import { renderEditor } from './views/Editor';
import { renderAdminPanel } from './views/AdminPanelView';
import { logger } from './utils/logger';
import { autoRecoverIfEmpty } from './lib/deviceBackup';
import { syncWithCloud } from './lib/cloudSync';
import { renderToasts } from './views/Toast';

// PWA: Register lightweight Service Worker (network-first, Cloudflare-friendly)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => logger.info('PWA', 'Service Worker registered'))
      .catch((err) => logger.warn('PWA', 'SW registration failed', err));
  });
}

// Optional native install banner — show when beforeinstallprompt is captured
let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as any;
  logger.info('PWA', 'beforeinstallprompt captured — install available');
  // Inject install banner if not already present
  if (!document.getElementById('pwa-install-banner')) {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className =
      'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark shadow-xl';
    banner.innerHTML = `
      <span class="text-sm font-semibold text-nordic-textLight dark:text-nordic-textDark">📲 Install CnG Writer</span>
      <button id="pwa-install-btn" class="px-3 py-1.5 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold hover:opacity-90">Install</button>
      <button id="pwa-dismiss-btn" class="text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight text-xs">✕</button>
    `;
    document.body.appendChild(banner);
    banner.querySelector('#pwa-install-btn')?.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice: any) => {
          logger.info('PWA', `Install choice: ${choice.outcome}`);
          deferredPrompt = null;
          banner.remove();
        });
      }
    });
    banner.querySelector('#pwa-dismiss-btn')?.addEventListener('click', () => banner.remove());
  }
});

window.addEventListener('appinstalled', () => {
  logger.info('PWA', 'App installed to standalone');
  deferredPrompt = null;
  document.getElementById('pwa-install-banner')?.remove();
});

function syncTheme() {
  if (store.theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
}

let lastHash: string | null = null;
let lastActiveStoryId: string | null = null;

function renderApp(force = false) {
  syncTheme();
  const hash = window.location.hash || '';
  const currentStoryId = store.activeStoryId;

  // Guard: do NOT wipe/re-render editor if we're already showing the same story
  // This prevents cursor loss on every keystroke — typing stays in local draft,
  // only 30s debounced save touches store
  if (!force && currentStoryId && lastActiveStoryId === currentStoryId && lastHash === hash && hash !== '#/adminpanel') {
    return;
  }

  lastHash = hash;
  lastActiveStoryId = currentStoryId;

  const appRoot = document.getElementById('app') || document.body;
  appRoot.innerHTML = '';

  // 1. Admin Panel Route
  if (hash === '#/adminpanel') {
    logger.action('ROUTER', 'Viewing /adminpanel');
    appRoot.appendChild(renderAdminPanel());
    return;
  }

  // 2. Main App (TopBar + View)
  appRoot.appendChild(renderTopBar());

  if (currentStoryId) {
    logger.action('ROUTER', `Editing story ${currentStoryId}`);
    appRoot.appendChild(renderEditor(currentStoryId));
  } else {
    logger.action('ROUTER', 'Viewing Bookshelf');
    appRoot.appendChild(renderBookshelf());
  }

  // Toasts overlay — rendered as part of appRoot so they survive navigation
  const toastOverlay = renderToasts();
  if (toastOverlay.childElementCount > 0) {
    appRoot.appendChild(toastOverlay);
  }
}

// Subscribe to store changes & hash routing
store.subscribe(() => {
  const hash = window.location.hash || '';
  const currentStoryId = store.activeStoryId;

  // In editor for same story: don't nuke DOM, just handle toasts overlay
  if (currentStoryId && lastActiveStoryId === currentStoryId && lastHash === hash && hash !== '#/adminpanel') {
    syncTheme();
    // Update toasts without destroying editor DOM
    const existing = document.getElementById('toast-overlay');
    if (existing) existing.remove();
    const overlay = renderToasts();
    if (overlay.childElementCount > 0) {
      overlay.id = 'toast-overlay';
      document.body.appendChild(overlay);
    }
    return;
  }

  renderApp();
});

window.addEventListener('hashchange', () => {
  renderApp(true);
});

// Initial boot — attempt device auto-recover then render
logger.info('APP', 'CnG Writer initialized');
void autoRecoverIfEmpty().finally(() => {
  renderApp(true);
  // Initial cloud sync on boot
  void syncWithCloud().catch(() => {});
});
