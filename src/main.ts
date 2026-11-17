import "./style.css";
import { store } from "./state/store";
import { renderTopBar } from "./views/TopBar";
import { renderBookshelf } from "./views/Bookshelf";
import { renderEditor } from "./views/Editor";
import { renderToasts } from "./views/Toast";

const appRoot = document.getElementById("app")!;

function renderApp() {
  // Apply theme class
  if (store.theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  appRoot.replaceChildren();

  // Top Bar
  appRoot.appendChild(renderTopBar());

  // Main View: Bookshelf OR Zen Editor
  if (store.activeStoryId) {
    appRoot.appendChild(renderEditor(store.activeStoryId));
  } else {
    appRoot.appendChild(renderBookshelf());
  }

  // Floating Toasts
  appRoot.appendChild(renderToasts());
}

// Initial boot
renderApp();

// Subscribe to store updates
store.subscribe(() => {
  renderApp();
});
