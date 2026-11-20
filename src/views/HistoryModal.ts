import { store } from "../state/store";
import { getSnapshots, createSnapshot, formatRelativeTimestamp, formatAbsoluteTimestamp } from "../lib/historyManager";
import type { TextSnapshot } from "../lib/historyManager";
import { countWords } from "../lib/format";

export interface HistoryModalOptions {
  storyId: string;
  onRestore?: (snapshot: TextSnapshot) => void;
}

export function openHistoryModal(options: HistoryModalOptions): void {
  const { storyId, onRestore } = options;
  const story = store.stories.find((s) => s.id === storyId);
  const storyTitle = story?.title || "Untitled Story";

  // Remove existing if any
  const existing = document.getElementById("history-modal-backdrop");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "history-modal-backdrop";
  backdrop.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4";

  const snapshots = getSnapshots(storyId).slice().reverse(); // newest first

  const snapshotCards = snapshots.length
    ? snapshots
        .map((snap) => {
          const rel = formatRelativeTimestamp(snap.timestamp);
          const abs = formatAbsoluteTimestamp(snap.timestamp);
          const preview = (snap.content || "").slice(0, 220).replace(/\n/g, " ").trim() || "(empty)";
          const previewEsc = preview
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `
            <div class="rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-4 space-y-2 shadow-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-nordic-accentLight dark:text-nordic-accentDark font-mono">${rel}</span>
                <span class="text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark" title="${abs}">${abs}</span>
              </div>
              <div class="flex flex-wrap gap-2 text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">
                <span class="px-2 py-1 rounded-full bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark">${snap.wordCount.toLocaleString()} words</span>
                <span class="px-2 py-1 rounded-full bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark">${snap.charCount.toLocaleString()} chars</span>
                <span class="px-2 py-1 rounded-full bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark truncate max-w-[160px]">${(snap.title || "Untitled").replace(/</g, "&lt;")}</span>
              </div>
              <div class="rounded-lg bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark p-3">
                <p class="text-xs leading-relaxed text-nordic-textLight dark:text-nordic-textDark line-clamp-3">${previewEsc || "(empty snapshot)"}</p>
              </div>
              <button data-snap-id="${snap.id}" class="btn-restore w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-nordic-accentLight dark:bg-nordic-accentDark text-white dark:text-nordic-bgDark text-xs font-bold hover:opacity-90 transition-opacity">
                Restore this version
              </button>
            </div>
          `;
        })
        .join("")
    : `
      <div class="rounded-xl border border-dashed border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark p-8 text-center space-y-2">
        <div class="text-2xl">🕒</div>
        <p class="text-sm font-semibold text-nordic-textLight dark:text-nordic-textDark">No earlier snapshots recorded for this document yet.</p>
        <p class="text-xs text-nordic-mutedLight dark:text-nordic-mutedDark">Snapshots will appear automatically as you type and save.</p>
      </div>
    `;

  backdrop.innerHTML = `
    <div class="bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <div class="flex items-center justify-between px-6 py-4 border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/50 dark:bg-nordic-bgDark/50">
        <div class="flex items-center gap-3">
          <span class="text-xl">🕒</span>
          <div>
            <h3 class="font-serif text-base font-bold text-nordic-textLight dark:text-nordic-textDark">Document History</h3>
            <p class="text-xs font-mono text-nordic-mutedLight dark:text-nordic-mutedDark truncate max-w-[220px]">${storyTitle.replace(/</g, "&lt;")}</p>
          </div>
        </div>
        <button id="btn-close-history" class="h-8 w-8 inline-flex items-center justify-center rounded-full bg-nordic-bgLight dark:bg-nordic-bgDark border border-nordic-borderLight dark:border-nordic-borderDark text-nordic-mutedLight dark:text-nordic-mutedDark hover:text-nordic-textLight dark:hover:text-nordic-textDark">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="px-6 py-3 flex items-center justify-between gap-2 border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/30 dark:bg-nordic-bgDark/30">
        <span class="text-[11px] font-mono text-nordic-mutedLight dark:text-nordic-mutedDark">${snapshots.length} snapshot${snapshots.length === 1 ? "" : "s"} · last 15 kept</span>
        <button id="btn-manual-snapshot" class="px-3 py-1.5 rounded-full bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark text-xs font-semibold text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark">Save snapshot now</button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-nordic-bgLight dark:bg-nordic-bgDark">
        ${snapshotCards}
      </div>

      <div class="px-6 py-3 border-t border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/50 dark:bg-nordic-bgDark/50 flex justify-end">
        <button id="btn-close-history-bottom" class="px-4 py-2 rounded-xl bg-nordic-cardLight dark:bg-nordic-cardDark border border-nordic-borderLight dark:border-nordic-borderDark text-xs font-semibold text-nordic-textLight dark:text-nordic-textDark">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.querySelector("#btn-close-history")?.addEventListener("click", close);
  backdrop.querySelector("#btn-close-history-bottom")?.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  // Manual snapshot
  backdrop.querySelector("#btn-manual-snapshot")?.addEventListener("click", () => {
    if (!story) return;
    // Get current editor content if available
    const editorEl = document.getElementById("editor-content") as HTMLElement | null;
    let currentContent = story.content;
    let currentTitle = story.title;
    const titleEl = document.getElementById("story-title") as HTMLInputElement | null;
    if (titleEl) currentTitle = titleEl.value;
    if (editorEl) {
      // Try to serialize from editor (contenteditable)
      try {
        const paras = editorEl.querySelectorAll("p.zen-paragraph");
        if (paras.length > 0) {
          const texts: string[] = [];
          paras.forEach((p) => {
            let html = (p as HTMLElement).innerHTML.replace(/<br\s*\/?>/gi, "\n");
            const tmp = document.createElement("div");
            tmp.innerHTML = html;
            texts.push(tmp.textContent || tmp.innerText || (p.textContent || ""));
          });
          currentContent = texts.join("\n\n");
        } else {
          currentContent = (editorEl as HTMLElement).innerText || currentContent;
        }
      } catch {}
    }
    const snap = createSnapshot(storyId, currentContent, currentTitle);
    store.toast(`Snapshot saved (${snap.wordCount} words)`, "ok");
    // Refresh modal
    backdrop.remove();
    openHistoryModal({ storyId, onRestore });
  });

  // Restore handlers
  backdrop.querySelectorAll(".btn-restore").forEach((btn) => {
    btn.addEventListener("click", () => {
      const snapId = (btn as HTMLElement).getAttribute("data-snap-id");
      const snap = snapshots.find((s) => s.id === snapId);
      if (!snap) return;
      const confirmed = confirm("Restore this version? Your current draft will be saved as a new snapshot.");
      if (!confirmed) return;

      // Save current state as snapshot first (zero data loss)
      let currentContent = "";
      let currentTitle = "";
      const editorEl = document.getElementById("editor-content") as HTMLElement | null;
      const titleEl = document.getElementById("story-title") as HTMLInputElement | null;
      if (story) {
        // Prefer live editor values
        if (editorEl) {
          try {
            const paras = editorEl.querySelectorAll("p.zen-paragraph");
            if (paras.length > 0) {
              const texts: string[] = [];
              paras.forEach((p) => {
                let html = (p as HTMLElement).innerHTML.replace(/<br\s*\/?>/gi, "\n");
                const tmp = document.createElement("div");
                tmp.innerHTML = html;
                texts.push(tmp.textContent || tmp.innerText || (p.textContent || ""));
              });
              currentContent = texts.join("\n\n");
            } else {
              currentContent = (editorEl as HTMLElement).innerText || story.content;
            }
          } catch {
            currentContent = story.content;
          }
        } else {
          currentContent = story.content;
        }
        currentTitle = titleEl ? titleEl.value : story.title;
        // Save current as snapshot before restore
        createSnapshot(storyId, currentContent, currentTitle);
      }

      // Update store
      store.updateStory(storyId, { content: snap.content, title: snap.title });

      // Update editor DOM if present
      if (editorEl) {
        // Re-render paragraphs
        const escapeHtml = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const paragraphsToHtml = (text: string): string => {
          if (!text || text.trim() === "") return `<p class="zen-paragraph"><br></p>`;
          const paras = text.split(/\n\s*\n/);
          return paras
            .map((para) => {
              if (para.trim() === "") return `<p class="zen-paragraph"><br></p>`;
              const inner = escapeHtml(para).replace(/\n/g, "<br>");
              return `<p class="zen-paragraph">${inner}</p>`;
            })
            .join("");
        };
        editorEl.innerHTML = paragraphsToHtml(snap.content);
        // Update stats bar
        const statsEl = document.getElementById("stats-text") as HTMLElement | null;
        if (statsEl) {
          const words = countWords(snap.content);
          const chars = snap.content.length;
          const mins = Math.max(1, Math.ceil(words / 200));
          statsEl.innerText = `${words.toLocaleString()} words · ${chars.toLocaleString()} chars · ${mins} min read`;
        }
        // Update title input
        if (titleEl) titleEl.value = snap.title;

        // Trigger autosave UI feedback is handled by store, but we can also ensure focus mode re-applies
        // Preserve selection/caret at end
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          if (sel) {
            range.selectNodeContents(editorEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch {}
      }

      // Update title if callback provided
      if (onRestore) {
        try {
          onRestore(snap);
        } catch {}
      }

      store.toast(`Restored version from ${formatRelativeTimestamp(snap.timestamp)}`, "ok");
      backdrop.remove();
    });
  });
}
