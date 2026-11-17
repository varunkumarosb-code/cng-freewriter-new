import { store } from "../state/store";

export function openSettingsModal() {
  const existing = document.getElementById("settings-modal-backdrop");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "settings-modal-backdrop";
  backdrop.className = "fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4";

  backdrop.innerHTML = `
    <div class="relative w-full max-w-md rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-4 border-b border-nordic-borderLight dark:border-nordic-borderDark">
        <h3 class="font-serif text-lg font-semibold text-nordic-textLight dark:text-nordic-textDark">Library Settings & Backup</h3>
        <button id="modal-close" class="text-nordic-mutedLight hover:text-nordic-textLight dark:hover:text-nordic-textDark text-lg font-mono">✕</button>
      </div>

      <!-- Writer Name / Local Sanctuary Info -->
      <div class="mt-5">
        <h4 class="font-mono text-[11px] font-semibold uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Writer Profile</h4>
        <p class="mt-1 text-xs text-nordic-mutedLight dark:text-nordic-mutedDark">Local Sanctuary · 100% Private on this device</p>
        <label class="mt-3 block text-xs font-medium text-nordic-mutedLight dark:text-nordic-mutedDark">Writer Name</label>
        <input id="input-writer-name" type="text" value="${store.settings.writerName || "Writer"}" placeholder="Writer" class="mt-1 w-full rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-3 py-2 text-sm text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight focus:border-nordic-accentLight dark:focus:border-nordic-accentDark" />
        <p class="mt-2 text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">Displayed in exports · stored locally only</p>
      </div>

      <!-- Library Backup Section -->
      <div class="mt-6 border-t border-nordic-borderLight dark:border-nordic-borderDark pt-5">
        <h4 class="font-mono text-[11px] font-semibold uppercase tracking-wider text-nordic-mutedLight dark:text-nordic-mutedDark">Library Backup</h4>
        <p class="mt-1 text-xs leading-5 text-nordic-mutedLight dark:text-nordic-mutedDark">Manual JSON backup — instant offline save, full control. Export your entire library or import a previous backup.</p>
        <div class="mt-4 flex gap-2">
          <button id="modal-export" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark py-2.5 text-xs font-semibold text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark hover:text-nordic-accentLight dark:hover:text-nordic-accentDark transition-all">Export JSON</button>
          <button id="modal-import" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-nordic-accentLight dark:bg-nordic-accentDark py-2.5 text-xs font-bold text-white dark:text-nordic-bgDark hover:opacity-90 transition-all">Import JSON</button>
        </div>
        <p class="mt-3 text-center font-mono text-[10px] text-nordic-mutedLight dark:text-nordic-mutedDark">Offline-first · No cloud · No tracking</p>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const writerInput = backdrop.querySelector("#input-writer-name") as HTMLInputElement;
  writerInput?.addEventListener("change", () => {
    const val = writerInput.value.trim() || "Writer";
    store.settings.writerName = val;
    // Persist via store's schedulePersist — trigger via dummy update
    // Use direct save to ensure immediate persistence
    try {
      const current = store.settings;
      // Trigger persist by touching settings through store API
      (store as unknown as { schedulePersist: () => void }).schedulePersist?.();
      // Fallback direct localStorage
      localStorage.setItem("cngwriter:settings", JSON.stringify(current));
    } catch {}
  });
  writerInput?.addEventListener("input", () => {
    const val = writerInput.value;
    store.settings.writerName = val || "Writer";
  });

  backdrop.querySelector("#modal-close")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
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
