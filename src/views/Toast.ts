import { store } from "../state/store";

export function renderToasts(): HTMLElement {
  const container = document.createElement("div");
  container.className = "pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2";

  store.toasts.forEach((t) => {
    const el = document.createElement("div");
    el.className = `pointer-events-auto min-w-[200px] max-w-[320px] rounded-xl border px-3.5 py-2.5 text-xs shadow-lg backdrop-blur bg-nordic-cardLight/95 dark:bg-nordic-cardDark/95 transition-all ${
      t.tone === "error"
        ? "border-red-500/40 text-red-600 dark:text-red-400"
        : "border-nordic-accentLight/40 dark:border-nordic-accentDark/40 text-nordic-textLight dark:text-nordic-textDark"
    }`;
    el.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span>${t.message}</span>
        <button class="font-mono text-xs opacity-60 hover:opacity-100">✕</button>
      </div>
    `;
    el.querySelector("button")?.addEventListener("click", () => store.dismissToast(t.id));
    container.appendChild(el);
  });

  return container;
}
