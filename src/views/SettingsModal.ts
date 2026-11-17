import { store } from "../state/store";

export function openSettingsModal() {
  const existing = document.getElementById("settings-modal-backdrop");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "settings-modal-backdrop";
  backdrop.className = "fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4";

  const isAuthed = !!store.authEmail;

  backdrop.innerHTML = `
    <div class="relative w-full max-w-md rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-4 border-b border-nordic-borderLight dark:border-nordic-borderDark">
        <h3 class="font-serif text-lg font-semibold text-nordic-textLight dark:text-nordic-textDark">Settings & Cloud</h3>
        <button id="modal-close" class="text-nordic-mutedLight hover:text-nordic-textLight dark:hover:text-nordic-textDark text-lg font-mono">✕</button>
      </div>

      <!-- Cloud Sync Section -->
      <div class="mt-4">
        <h4 class="font-mono text-[11px] font-semibold uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">PocketBase Cloud</h4>
        <p class="mt-1 text-xs text-nordic-mutedLight dark:text-nordic-mutedDark">Isolated collection: <code class="font-mono text-nordic-accentLight dark:text-nordic-accentDark">writer_users</code> / <code class="font-mono text-nordic-accentLight dark:text-nordic-accentDark">cng_stories</code></p>

        ${isAuthed ? `
          <div class="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p class="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Signed in as <strong>${store.authEmail}</strong></p>
            <button id="btn-logout" class="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">Sign out</button>
          </div>
        ` : `
          <form id="form-login" class="mt-3 space-y-2">
            <input id="login-email" type="email" placeholder="author@example.com" required class="w-full rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-3 py-2 text-xs text-nordic-textLight dark:text-nordic-textDark outline-none" />
            <input id="login-pass" type="password" placeholder="Password" required class="w-full rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-3 py-2 text-xs text-nordic-textLight dark:text-nordic-textDark outline-none" />
            <button type="submit" class="w-full rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark py-2 text-xs font-bold text-white dark:text-nordic-bgDark hover:opacity-90">Sign in to PocketBase</button>
          </form>
        `}
      </div>

      <!-- JSON Backup Section -->
      <div class="mt-6 border-t border-nordic-borderLight dark:border-nordic-borderDark pt-4">
        <h4 class="font-mono text-[11px] font-semibold uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Library Backup</h4>
        <div class="mt-3 flex gap-2">
          <button id="modal-export" class="flex-1 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark py-2 text-xs font-medium text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight">Export JSON</button>
          <button id="modal-import" class="flex-1 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark py-2 text-xs font-medium text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight">Import JSON</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector("#modal-close")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  backdrop.querySelector("#btn-logout")?.addEventListener("click", () => {
    store.logout();
    backdrop.remove();
  });

  const loginForm = backdrop.querySelector("#form-login") as HTMLFormElement;
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (backdrop.querySelector("#login-email") as HTMLInputElement).value;
    const pass = (backdrop.querySelector("#login-pass") as HTMLInputElement).value;
    try {
      await store.login(email, pass);
      backdrop.remove();
    } catch (err) {
      alert("Login failed: " + (err instanceof Error ? err.message : String(err)));
    }
  });

  backdrop.querySelector("#modal-export")?.addEventListener("click", () => store.exportAllBackup());
  backdrop.querySelector("#modal-import")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const text = await file.text();
        store.importBackupText(text);
        backdrop.remove();
      }
    };
    input.click();
  });
}
