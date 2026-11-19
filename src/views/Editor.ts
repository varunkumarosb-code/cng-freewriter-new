import { store } from "../state/store";
import { countWords, formatDate, readingMinutes, slugify } from "../lib/format";
import { downloadFile, printStoryPDF, storyToMarkdown, storyToPlainText } from "../lib/backup";
import { getEffectiveShelfName, getAutosaveDelayMs } from "../lib/storage";
import { loadEditorSettings, saveEditorSettings } from "../lib/editorSettings";

export function renderEditor(storyId: string): HTMLElement {
  const story = store.stories.find((s) => s.id === storyId);

  const container = document.createElement("div");
  container.className = "w-full max-w-full overflow-x-hidden box-border px-3 md:px-8 min-h-[calc(100vh-4rem)] bg-nordic-bgLight dark:bg-nordic-bgDark transition-colors duration-200";
  container.setAttribute("data-editor-id", storyId);

  if (!story) {
    container.innerHTML = `
      <div class="mx-auto max-w-lg px-5 py-20 text-center">
        <p class="text-nordic-mutedLight dark:text-nordic-mutedDark">Story not found or deleted.</p>
        <button id="btn-back-shelf" class="mt-4 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-4 py-2 text-sm text-nordic-textLight dark:text-nordic-textDark">Return to Shelf</button>
      </div>
    `;
    container.querySelector("#btn-back-shelf")?.addEventListener("click", () => store.setActiveStory(null));
    return container;
  }

  let localTitle = story.title;
  let localContent = story.content;
  let saveStatus = "Saved";
  let autosaveTimer: number | null = null;
  let exportMenuOpen = false;

  const shelfName = getEffectiveShelfName(story, store.categories);
  const editorSettings = loadEditorSettings();

  // Helper to escape HTML for initial render
  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const paragraphsToHtml = (text: string): string => {
    if (!text || text.trim() === "") {
      return `<p class="zen-paragraph"><br></p>`;
    }
    // Split by double newline as paragraph separator
    const paras = text.split(/\n\s*\n/);
    return paras
      .map((para) => {
        if (para.trim() === "") return `<p class="zen-paragraph"><br></p>`;
        // Inside paragraph, preserve single newlines as <br>
        const inner = escapeHtml(para).replace(/\n/g, "<br>");
        return `<p class="zen-paragraph">${inner}</p>`;
      })
      .join("");
  };

  const serializeEditorContent = (el: HTMLElement): string => {
    // Collect paragraphs
    const paras = el.querySelectorAll("p.zen-paragraph");
    if (paras.length > 0) {
      const texts: string[] = [];
      paras.forEach((p) => {
        // Convert <br> back to \n, handle inner text
        let html = (p as HTMLElement).innerHTML;
        // Handle <br> tags
        html = html.replace(/<br\s*\/?>/gi, "\n");
        // Strip any remaining tags (shouldn't happen)
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        let txt = tmp.textContent || tmp.innerText || "";
        // Also handle direct textContent fallback
        if (!txt) txt = (p.textContent || "");
        texts.push(txt);
      });
      return texts.join("\n\n");
    }
    // Fallback: innerText with double newline approximation
    const raw = (el as HTMLElement).innerText || "";
    return raw;
  };

  const isFocusActive = editorSettings.focusModeEnabled;
  const isTypewriterActive = editorSettings.typewriterModeEnabled;

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div class="sticky top-16 z-30 w-full max-w-full overflow-x-hidden box-border border-b border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight/70 dark:bg-nordic-bgDark/70 backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-1.5 px-3 md:px-5 py-3">
        <div class="flex min-w-0 items-center gap-2">
          <button id="btn-back" class="inline-flex h-7 md:h-8 shrink-0 items-center gap-1 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2 md:px-2.5 py-1 text-xs md:text-[13px] font-medium text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark transition-all">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span class="hidden xs:inline">Shelf</span>
          </button>
          <span id="save-indicator" class="font-mono text-[10px] md:text-[11px] truncate text-nordic-mutedLight dark:text-nordic-mutedDark">${saveStatus}</span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 min-w-0">
          <select id="select-shelf" class="h-7 md:h-8 max-w-[110px] truncate rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2 text-xs text-nordic-textLight dark:text-nordic-textDark outline-none">
            <option value="">Unshelved</option>
            ${store.categories.map((c) => `<option value="${c.id}" ${c.id === story.categoryId ? "selected" : ""}>${c.name}</option>`).join("")}
          </select>

          <!-- Focus & Typewriter Toggles -->
          <button id="btn-focus-toggle" title="Focus Mode (Dim surrounding text)" aria-label="Focus Mode" class="inline-flex h-7 md:h-8 w-7 md:w-8 items-center justify-center rounded-lg border transition-all text-xs ${
            isFocusActive
              ? "bg-nordic-accentLight dark:bg-nordic-accentDark border-nordic-accentLight dark:border-nordic-accentDark text-white dark:text-nordic-bgDark shadow-sm ring-1 ring-nordic-accentLight/30"
              : "bg-nordic-cardLight dark:bg-nordic-cardDark border-nordic-borderLight dark:border-nordic-borderDark text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark"
          }">🧘</button>
          <button id="btn-typewriter-toggle" title="Typewriter Scrolling (Center Line)" aria-label="Typewriter Mode" class="inline-flex h-7 md:h-8 w-7 md:w-8 items-center justify-center rounded-lg border transition-all text-xs ${
            isTypewriterActive
              ? "bg-nordic-accentLight dark:bg-nordic-accentDark border-nordic-accentLight dark:border-nordic-accentDark text-white dark:text-nordic-bgDark shadow-sm ring-1 ring-nordic-accentLight/30"
              : "bg-nordic-cardLight dark:bg-nordic-cardDark border-nordic-borderLight dark:border-nordic-borderDark text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark"
          }">🎯</button>

          <div class="relative shrink-0">
            <button id="btn-export-dropdown" class="inline-flex h-7 md:h-8 items-center gap-1 rounded-lg border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark px-2 md:px-3 py-1 text-xs md:text-[12px] font-medium text-nordic-textLight dark:text-nordic-textDark transition-all">
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span class="hidden sm:inline">Export</span>
            </button>
            <div id="export-menu" class="hidden absolute right-0 z-40 mt-1 w-44 rounded-xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark py-1 shadow-lg">
              <button id="exp-md" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Markdown (.md)</button>
              <button id="exp-txt" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Plain text (.txt)</button>
              <button id="exp-pdf" class="w-full px-3 py-1.5 text-left text-xs text-nordic-textLight dark:text-nordic-textDark hover:bg-nordic-bgLight dark:hover:bg-nordic-bgDark">Print / PDF</button>
            </div>
          </div>

          <button id="btn-delete" class="inline-flex h-7 md:h-8 shrink-0 items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-2 md:px-3 py-1 text-xs md:text-[12px] font-medium text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span class="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Zen Writing Pad -->
    <div class="mx-auto w-full max-w-3xl max-w-full overflow-x-hidden box-border px-3 md:px-8 py-10">
      <div class="w-full max-w-full overflow-x-hidden box-border rounded-2xl border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-cardLight dark:bg-nordic-cardDark p-4 md:p-8 shadow-sm">
        <input 
          id="story-title" 
          type="text" 
          placeholder="Story Title..." 
          value="" 
          class="w-full max-w-full box-border min-w-0 bg-transparent font-serif text-xl md:text-3xl font-bold text-nordic-textLight dark:text-nordic-textDark outline-none mb-3 placeholder:opacity-30 focus:border-b focus:border-nordic-accentLight dark:focus:border-nordic-accentDark transition-all"
        />

        <div class="mt-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          ${shelfName} · Last edited ${formatDate(story.updatedAt)}
        </div>
        <div class="mt-6 h-px bg-nordic-borderLight dark:bg-nordic-borderDark"></div>

        <div
          id="editor-content"
          contenteditable="true"
          data-placeholder="Begin writing your story here…"
          class="mt-8 min-h-[420px] w-full max-w-full box-border min-w-0 bg-transparent font-serif text-lg leading-loose text-nordic-textLight dark:text-nordic-textDark outline-none placeholder:text-nordic-mutedLight/50 dark:placeholder:text-nordic-mutedDark/50 ${isTypewriterActive ? "typewriter-active" : ""} typewriter-container"
          style="white-space: pre-wrap; word-break: break-word;"
        >${paragraphsToHtml(localContent)}</div>

        <!-- Stats Bar -->
        <div class="mt-8 flex flex-wrap items-center justify-between gap-2 rounded-full border border-nordic-borderLight dark:border-nordic-borderDark bg-nordic-bgLight dark:bg-nordic-bgDark px-4 py-2 font-mono text-[11px] text-nordic-mutedLight dark:text-nordic-mutedDark">
          <span id="stats-text">${countWords(localContent).toLocaleString()} words · ${localContent.length.toLocaleString()} chars · ${readingMinutes(localContent)} min read</span>
          <span class="text-nordic-accentLight dark:text-nordic-accentDark font-semibold">Zen Active</span>
        </div>
      </div>
    </div>
  `;

  const titleEl = container.querySelector("#story-title") as HTMLInputElement;
  const contentEl = container.querySelector("#editor-content") as HTMLElement;
  const saveIndEl = container.querySelector("#save-indicator") as HTMLElement;
  const statsEl = container.querySelector("#stats-text") as HTMLElement;
  const focusToggle = container.querySelector("#btn-focus-toggle") as HTMLElement;
  const typewriterToggle = container.querySelector("#btn-typewriter-toggle") as HTMLElement;

  // Set title input value safely (avoid HTML escaping issues)
  if (titleEl) {
    titleEl.value = localTitle || "";
  }

  // --- Editor Settings State ---
  let settings = loadEditorSettings();

  // Apply initial typewriter padding if enabled
  if (settings.typewriterModeEnabled) {
    contentEl.classList.add("typewriter-active");
  }

  // --- Focus Mode Logic ---
  const updateFocusMode = () => {
    const paragraphs = contentEl.querySelectorAll("p.zen-paragraph");
    if (!settings.focusModeEnabled) {
      paragraphs.forEach((p) => {
        p.classList.remove("zen-active", "zen-dimmed");
        // Ensure full opacity when disabled
        (p as HTMLElement).style.opacity = "";
      });
      return;
    }
    // When enabled, find active paragraph
    let activeEl: HTMLElement | null = null;
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const anchorNode = sel.anchorNode;
        if (anchorNode) {
          const el = anchorNode.nodeType === 1 ? (anchorNode as HTMLElement) : (anchorNode.parentElement as HTMLElement | null);
          if (el) {
            // If selection is inside editor-content, find closest paragraph
            if (contentEl.contains(el) || el === contentEl) {
              activeEl = el.closest("p.zen-paragraph") as HTMLElement | null;
              // If caret is directly inside contentEl (empty), fallback to first paragraph
              if (!activeEl && el === contentEl) {
                // Find paragraph at caret offset? Use last paragraph
                const all = contentEl.querySelectorAll("p.zen-paragraph");
                if (all.length > 0) activeEl = all[all.length - 1] as HTMLElement;
              }
            }
          }
        }
      }
    } catch {}
    // If no active found (blurred), keep first as active or dim none? We'll dim none and keep all active if no selection
    if (!activeEl) {
      // If editor has focus but no selection, default to focused element or first paragraph
      if (document.activeElement === contentEl) {
        const first = contentEl.querySelector("p.zen-paragraph") as HTMLElement | null;
        activeEl = first;
      } else {
        // No caret inside editor — show all at full opacity (don't dim) or dim all except first?
        // For better UX, when blurred, show all at full opacity if focus mode but not editing
        // We'll treat as no active, so remove dimming
        paragraphs.forEach((p) => {
          p.classList.remove("zen-dimmed");
          p.classList.add("zen-active");
        });
        return;
      }
    }

    paragraphs.forEach((p) => {
      const para = p as HTMLElement;
      if (para === activeEl) {
        para.classList.add("zen-active");
        para.classList.remove("zen-dimmed");
      } else {
        para.classList.add("zen-dimmed");
        para.classList.remove("zen-active");
      }
    });
  };

  // --- Typewriter Mode Logic ---
  let typewriterRaf: number | null = null;
  let lastScrollTop = window.scrollY;
  let keyboardOpen = false;

  // Detect virtual keyboard open via visualViewport
  const checkKeyboard = () => {
    try {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        // If viewport is significantly smaller than window, keyboard is open
        keyboardOpen = viewportHeight < windowHeight * 0.75;
      } else {
        // Fallback: check via userAgent + window height
        keyboardOpen = window.innerHeight < 500 && /Android|iPhone|iPad/i.test(navigator.userAgent);
      }
    } catch {
      keyboardOpen = false;
    }
  };
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", checkKeyboard);
  }
  window.addEventListener("resize", checkKeyboard);
  checkKeyboard();

  const centerActiveLine = () => {
    if (!settings.typewriterModeEnabled) return;
    if (keyboardOpen) return; // Avoid jitter when keyboard opening
    if (typewriterRaf !== null) cancelAnimationFrame(typewriterRaf);
    typewriterRaf = requestAnimationFrame(() => {
      try {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0).cloneRange();
        let rect = range.getBoundingClientRect();

        // Fallback: if rect is empty (collapsed at line end), use anchorNode's rect
        if (rect.width === 0 && rect.height === 0) {
          const node = sel.anchorNode as HTMLElement | null;
          if (node) {
            const parent = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
            if (parent && contentEl.contains(parent)) {
              rect = parent.getBoundingClientRect();
            } else if (contentEl.contains(node as Node)) {
              rect = (node.parentElement as HTMLElement)?.getBoundingClientRect() || rect;
            }
          }
          // If still empty, try to get caret via selection anchor offset
          if (rect.top === 0 && rect.left === 0) {
            // Use contentEl's current scroll position as fallback
            const elRect = contentEl.getBoundingClientRect();
            rect = { top: elRect.bottom - 20, bottom: elRect.bottom, left: elRect.left, right: elRect.right, width: elRect.width, height: 20, x: elRect.left, y: elRect.bottom - 20, toJSON: () => ({}) } as DOMRect;
          }
        }

        if (!rect || rect.top === 0 && rect.bottom === 0) return;

        const viewportCenter = window.innerHeight / 2;
        const currentScrollY = window.scrollY;
        const elementTopInDoc = rect.top + currentScrollY;
        const targetY = elementTopInDoc - viewportCenter;

        // Mobile safety: only scroll if distance is significant to avoid micro-jitters
        const distance = Math.abs(rect.top - viewportCenter);
        const isMobile = window.innerWidth < 768 || /Capacitor|Android|iPhone/i.test(navigator.userAgent);
        if (isMobile && distance < 30) return;
        if (Math.abs(targetY - currentScrollY) < 20) return;

        // Avoid scrolling if user is at top already and target would be negative
        if (targetY < 0) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        // Use window.scrollTo for overall page, or container.scrollTo if container is scrollable
        // Prefer window.scrollTo for full-page editor, but also try scrollIntoView on active paragraph for smoother centering
        const activePara = contentEl.querySelector("p.zen-active") as HTMLElement | null;
        if (activePara) {
          // Use scrollIntoView with block center for paragraph centering (more reliable for contenteditable)
          try {
            activePara.scrollIntoView({ block: "center", behavior: "smooth" });
            return;
          } catch {}
        }

        // Fallback to window scroll
        window.scrollTo({ top: targetY, behavior: "smooth" });
        lastScrollTop = targetY;
      } catch {}
      typewriterRaf = null;
    });
  };

  // --- Toggle Handlers ---
  const updateToggleUI = () => {
    if (focusToggle) {
      if (settings.focusModeEnabled) {
        focusToggle.className = "inline-flex h-7 md:h-8 w-7 md:w-8 items-center justify-center rounded-lg border transition-all text-xs bg-nordic-accentLight dark:bg-nordic-accentDark border-nordic-accentLight dark:border-nordic-accentDark text-white dark:text-nordic-bgDark shadow-sm ring-1 ring-nordic-accentLight/30";
      } else {
        focusToggle.className = "inline-flex h-7 md:h-8 w-7 md:w-8 items-center justify-center rounded-lg border transition-all text-xs bg-nordic-cardLight dark:bg-nordic-cardDark border-nordic-borderLight dark:border-nordic-borderDark text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark";
      }
    }
    if (typewriterToggle) {
      if (settings.typewriterModeEnabled) {
        typewriterToggle.className = "inline-flex h-7 md:h-8 w-7 md:w-8 items-center justify-center rounded-lg border transition-all text-xs bg-nordic-accentLight dark:bg-nordic-accentDark border-nordic-accentLight dark:border-nordic-accentDark text-white dark:text-nordic-bgDark shadow-sm ring-1 ring-nordic-accentLight/30";
      } else {
        typewriterToggle.className = "inline-flex h-7 md:h-8 w-7 md:w-8 items-center justify-center rounded-lg border transition-all text-xs bg-nordic-cardLight dark:bg-nordic-cardDark border-nordic-borderLight dark:border-nordic-borderDark text-nordic-textLight dark:text-nordic-textDark hover:border-nordic-accentLight dark:hover:border-nordic-accentDark";
      }
    }
  };

  focusToggle?.addEventListener("click", () => {
    settings = { ...settings, focusModeEnabled: !settings.focusModeEnabled };
    saveEditorSettings(settings);
    updateToggleUI();
    updateFocusMode();
    // If enabling, immediately apply dimming
    // If disabling, clear classes
  });

  typewriterToggle?.addEventListener("click", () => {
    settings = { ...settings, typewriterModeEnabled: !settings.typewriterModeEnabled };
    saveEditorSettings(settings);
    updateToggleUI();
    if (settings.typewriterModeEnabled) {
      contentEl.classList.add("typewriter-active");
      // Trigger centering immediately
      centerActiveLine();
    } else {
      contentEl.classList.remove("typewriter-active");
    }
  });

  // --- Autosave Logic (preserved) ---
  const flushSave = () => {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    const finalTitle = localTitle.trim() ? localTitle.trim() : "Untitled Story";
    store.updateStory(storyId, { title: finalTitle, content: localContent });
    saveIndEl.innerText = "Saved";
    saveIndEl.className = "font-mono text-[11px] text-nordic-accentLight dark:text-nordic-accentDark";
  };

  const scheduleSave = () => {
    saveIndEl.innerText = "Unsaved changes";
    saveIndEl.className = "font-mono text-[11px] text-amber-500 animate-pulse";
    if (autosaveTimer !== null) clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      flushSave();
    }, getAutosaveDelayMs());
  };

  titleEl?.addEventListener("input", (e) => {
    localTitle = (e.target as HTMLInputElement).value;
    scheduleSave();
  });

  // Ensure editor has at least one paragraph on focus if empty
  const ensureParagraphStructure = () => {
    if (contentEl.innerHTML.trim() === "" || contentEl.innerHTML === "<br>") {
      contentEl.innerHTML = `<p class="zen-paragraph"><br></p>`;
      // Place caret at start
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        const firstP = contentEl.querySelector("p");
        if (firstP && sel) {
          range.setStart(firstP, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {}
    } else {
      // Ensure all top-level children are paragraphs with zen-paragraph class
      const children = Array.from(contentEl.childNodes);
      let needsRebuild = false;
      for (const child of children) {
        if (child.nodeType === 3) {
          // Text node directly under contenteditable — should be inside <p>
          if ((child.textContent || "").trim() !== "") needsRebuild = true;
        } else if (child.nodeType === 1) {
          const el = child as HTMLElement;
          if (el.tagName.toLowerCase() !== "p" && !el.classList.contains("zen-paragraph")) {
            // Browser may create <div> on Enter
            needsRebuild = true;
          }
        }
      }
      if (needsRebuild) {
        // Normalize: split by <div> and re-wrap as <p>
        const html = contentEl.innerHTML;
        // Simple: replace <div> with <p class="zen-paragraph">
        let normalized = html
          .replace(/<div[^>]*>/gi, '<p class="zen-paragraph">')
          .replace(/<\/div>/gi, "</p>")
          .replace(/<p(?![^>]*class)/gi, '<p class="zen-paragraph"');
        // Ensure empty paragraphs have <br>
        if (!normalized.includes("zen-paragraph")) {
          // Fallback: wrap text nodes
          const text = contentEl.innerText || "";
          normalized = paragraphsToHtml(text);
        }
        // Only update if changed to avoid caret jump
        if (normalized !== contentEl.innerHTML) {
          const sel = window.getSelection();
          const hadFocus = document.activeElement === contentEl;
          // Save caret position via range?
          contentEl.innerHTML = normalized;
          if (hadFocus) contentEl.focus();
          // Restore selection roughly — not critical for now
          if (sel && hadFocus) {
            try {
              // Try to keep selection at end if we had no range
            } catch {}
          }
        }
      }
    }
  };

  contentEl?.addEventListener("input", () => {
    // Ensure structure
    ensureParagraphStructure();
    // Serialize back to localContent
    localContent = serializeEditorContent(contentEl);
    statsEl.innerText = `${countWords(localContent).toLocaleString()} words · ${localContent.length.toLocaleString()} chars · ${readingMinutes(localContent)} min read`;
    scheduleSave();
    // Trigger focus mode update and typewriter centering
    if (settings.focusModeEnabled) updateFocusMode();
    if (settings.typewriterModeEnabled) centerActiveLine();
  });

  // Also handle keyup for navigation keys (arrow, enter) that don't trigger input
  contentEl?.addEventListener("keyup", () => {
    if (settings.focusModeEnabled) updateFocusMode();
    if (settings.typewriterModeEnabled) centerActiveLine();
  });

  contentEl?.addEventListener("click", () => {
    if (settings.focusModeEnabled) updateFocusMode();
    if (settings.typewriterModeEnabled) centerActiveLine();
  });

  // Selection change for caret movement (arrow keys, mouse)
  const onSelectionChange = () => {
    if (!document.contains(contentEl)) return; // Editor not in DOM anymore
    if (settings.focusModeEnabled) updateFocusMode();
    if (settings.typewriterModeEnabled) {
      // Only center if selection is inside editor
      const sel = window.getSelection();
      if (sel && sel.anchorNode && contentEl.contains(sel.anchorNode as Node)) {
        centerActiveLine();
      }
    }
  };
  document.addEventListener("selectionchange", onSelectionChange);

  // Initial focus mode application
  if (settings.focusModeEnabled) {
    // Delay slightly to ensure DOM rendered
    setTimeout(() => updateFocusMode(), 50);
  }

  // Cleanup on container removal (when navigating back)
  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", checkKeyboard);
      window.removeEventListener("resize", checkKeyboard);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Back to Shelf — flush pending save before navigating
  container.querySelector("#btn-back")?.addEventListener("click", () => {
    if (autosaveTimer !== null) {
      flushSave();
    }
    document.removeEventListener("selectionchange", onSelectionChange);
    store.setActiveStory(null);
  });

  // Shelf Dropdown — flush title/content first, then update category
  const selectShelf = container.querySelector("#select-shelf") as HTMLSelectElement;
  selectShelf?.addEventListener("change", () => {
    if (autosaveTimer !== null) {
      flushSave();
    }
    store.updateStory(storyId, { categoryId: selectShelf.value });
  });

  // Export Menu
  const expBtn = container.querySelector("#btn-export-dropdown");
  const expMenu = container.querySelector("#export-menu");
  expBtn?.addEventListener("click", () => {
    exportMenuOpen = !exportMenuOpen;
    expMenu?.classList.toggle("hidden", !exportMenuOpen);
  });

  const getSlug = () => slugify(localTitle?.trim() || "untitled");
  container.querySelector("#exp-md")?.addEventListener("click", () => {
    downloadFile(`${getSlug()}.md`, storyToMarkdown({ ...story, title: localTitle, content: localContent }, shelfName), "text/markdown");
    expMenu?.classList.add("hidden");
  });
  container.querySelector("#exp-txt")?.addEventListener("click", () => {
    downloadFile(`${getSlug()}.txt`, storyToPlainText({ ...story, title: localTitle, content: localContent }, shelfName), "text/plain");
    expMenu?.classList.add("hidden");
  });
  container.querySelector("#exp-pdf")?.addEventListener("click", () => {
    printStoryPDF({ ...story, title: localTitle, content: localContent }, shelfName);
    expMenu?.classList.add("hidden");
  });

  // Delete — flush not needed, just delete
  container.querySelector("#btn-delete")?.addEventListener("click", () => {
    if (confirm("Delete this story?")) {
      if (autosaveTimer !== null) clearTimeout(autosaveTimer);
      document.removeEventListener("selectionchange", onSelectionChange);
      store.deleteStory(storyId);
    }
  });

  // Also flush on page unload / hash change protection
  const handleBeforeUnload = () => {
    if (autosaveTimer !== null) {
      const finalTitle = localTitle.trim() ? localTitle.trim() : "Untitled Story";
      store.updateStory(storyId, { title: finalTitle, content: localContent });
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload, { once: true });

  // Focus editor on load for better UX
  setTimeout(() => {
    try {
      contentEl.focus();
      // Place caret at end
      const range = document.createRange();
      const sel = window.getSelection();
      if (sel) {
        range.selectNodeContents(contentEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        if (settings.focusModeEnabled) updateFocusMode();
        if (settings.typewriterModeEnabled) centerActiveLine();
      }
    } catch {}
  }, 100);

  return container;
}
