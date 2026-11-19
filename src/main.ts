import './style.css';
import { store } from './state/store';
import { renderTopBar } from './views/TopBar';
import { renderBookshelf } from './views/Bookshelf';
import { renderEditor } from './views/Editor';
import { renderAdminPanel } from './views/AdminPanelView';
import { logger } from './utils/logger';
import { renderToasts } from './views/Toast';

// 1. Force Unregister Legacy Service Workers (prevents cached old builds)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister().then(() => {
        logger.info('SYSTEM', 'Unregistered legacy service worker');
      });
    }
  });
}

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

// Initial boot
logger.info('APP', 'CnG Writer initialized');
renderApp(true);
