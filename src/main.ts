import './style.css';
import { store } from './state/store';
import { renderTopBar } from './views/TopBar';
import { renderBookshelf } from './views/Bookshelf';
import { renderEditor } from './views/Editor';
import { renderAdminPanel } from './views/AdminPanelView';
import { logger } from './utils/logger';

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

function renderApp() {
  syncTheme();
  const appRoot = document.getElementById('app') || document.body;
  appRoot.innerHTML = '';

  const hash = window.location.hash || '';

  // 1. Admin Panel Route
  if (hash === '#/adminpanel') {
    logger.action('ROUTER', 'Viewing /adminpanel');
    appRoot.appendChild(renderAdminPanel());
    return;
  }

  // 2. Main App (TopBar + View)
  appRoot.appendChild(renderTopBar());

  if (store.activeStoryId) {
    logger.action('ROUTER', `Editing story ${store.activeStoryId}`);
    appRoot.appendChild(renderEditor(store.activeStoryId));
  } else {
    logger.action('ROUTER', 'Viewing Bookshelf');
    appRoot.appendChild(renderBookshelf());
  }
}

// Subscribe to store changes & hash routing
store.subscribe(() => {
  renderApp();
});

window.addEventListener('hashchange', () => {
  renderApp();
});

// Initial boot
logger.info('APP', 'CnG Writer initialized');
renderApp();