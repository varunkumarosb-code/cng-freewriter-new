/**
 * LibraryContext — single source of truth for stories, categories and
 * settings, plus the toast bus used by every Backup & Export surface.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings, Category, Story } from "../lib/types";
import { loadLibrary, persistLibrary, seedLibrary } from "../lib/storage";
import {
  BackupError,
  exportAllData,
  exportStory,
  mergeBackup,
  readBackupFile,
  type StoryExportFormat,
} from "../lib/backup";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface LibraryValue {
  stories: Story[];
  categories: Category[];
  settings: AppSettings;

  toasts: ToastItem[];
  notify: (type: ToastType, title: string, message?: string) => void;
  dismissToast: (id: number) => void;

  createStory: (categoryId?: string | null) => string;
  updateStory: (id: string, patch: Partial<Pick<Story, "title" | "content" | "categoryId">>) => void;
  deleteStory: (id: string) => void;
  createCategory: (name: string) => string;
  updateSettings: (patch: Partial<AppSettings>) => void;

  /** Feature 1 — full-library `.json` backup download. */
  exportAll: () => void;
  /** Feature 2 — merged restore from an uploaded backup file. */
  importBackup: (file: File) => Promise<void>;
  /** Feature 3 — single-story `.txt` / `.md` export from the editor. */
  exportSingle: (story: Story, format: StoryExportFormat) => void;

  restoreSamples: () => void;
  eraseAll: () => void;
}

const LibraryContext = createContext<LibraryValue | null>(null);

const CATEGORY_COLORS = ["#e5b168", "#8fa6c9", "#c49ad6", "#93bfa4", "#d98f8f", "#9fb8d4"];

function safeId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadLibrary);
  const [stories, setStories] = useState<Story[]>(initial.stories);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [settings, setSettings] = useState<AppSettings>(initial.settings);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  /* --- toasts ----------------------------------------------------- */
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
      window.setTimeout(() => dismissToast(id), 4600);
    },
    [dismissToast],
  );

  /* --- initial cloud sync on startup — P4: match by remoteId first --- */
  useEffect(() => {
    import("../lib/storage").then(({ fetchRemoteStories }) => {
      fetchRemoteStories().then((remote) => {
        if (remote && remote.length > 0) {
          setStories((prev) => {
            // Build lookup by both remoteId and id to avoid duplicates
            const byRemoteId = new Map(prev.filter((s) => s.remoteId).map((s) => [s.remoteId!, s]));
            const byId = new Map(prev.map((s) => [s.id, s]));
            const toAdd: Story[] = [];
            for (const r of remote) {
              const existsByRemote = r.remoteId ? byRemoteId.get(r.remoteId) : undefined;
              const existsById = byId.get(r.id);
              if (!existsByRemote && !existsById) {
                toAdd.push(r);
              }
              // If exists, we keep local version (last-write-wins is handled on sync, not here)
            }
            if (toAdd.length === 0) return prev;
            return [...prev, ...toAdd];
          });
        }
      }).catch(() => {});
    });
  }, []);

  /* --- persistence (debounced, skip first render) + PB sync with proper remoteId callback — P4 --- */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      persistLibrary({ stories, categories, settings });
      // Trigger PB sync with state callback instead of direct mutation
      import("../lib/storage").then(({ syncToPocketBase }) => {
        syncToPocketBase(stories, (localId, remoteId) => {
          setStories((prev) =>
            prev.map((s) => (s.id === localId ? { ...s, remoteId } : s))
          );
        });
      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [stories, categories, settings]);

  /* --- story / category CRUD -------------------------------------- */
  const createStory = useCallback((categoryId: string | null = null): string => {
    const id = safeId();
    const now = new Date().toISOString();
    setStories((prev) => [
      { id, title: "", content: "", categoryId, createdAt: now, updatedAt: now },
      ...prev,
    ]);
    return id;
  }, []);

  const updateStory = useCallback(
    (id: string, patch: Partial<Pick<Story, "title" | "content" | "categoryId">>) => {
      setStories((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          // P9: seed stories get new UUID on first edit to avoid cloud merge weirdness
          // We handle it by keeping same id but marking as non-syncable until edit;
          // Alternative approach: if seed ID and patch changes content/title, assign new UUID
          // For now we keep seed ID but syncToPocketBase will skip it (treated local-only)
          // until it has remoteId. This avoids breaking Editor's storyId reference.
          // If user explicitly edits a seed story, we keep its ID but allow future sync
          // by not skipping after first edit — storage.ts skips only if id startsWith story- AND no remoteId.
          // So first edit still won't sync; second edit after we could consider assigning UUID.
          // Simpler: keep skip logic in storage.ts; no ID mutation needed here.
          return { ...s, ...patch, updatedAt: new Date().toISOString() };
        }),
      );
    },
    [],
  );

  const deleteStory = useCallback(
    (id: string) => {
      // Capture remoteId before filtering
      let remoteId: string | undefined;
      setStories((prev) => {
        const target = prev.find((s) => s.id === id);
        remoteId = target?.remoteId;
        return prev.filter((s) => s.id !== id);
      });
      // P3: verify delete sync with user-visible toast on failure
      if (remoteId) {
        import("../lib/storage").then(({ deleteRemoteStory }) => {
          deleteRemoteStory(remoteId!)
            .then(() => {
              // Optional success toast could be noisy; keep silent
            })
            .catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              notify("error", "Cloud delete failed", msg || "Story was removed locally but not from cloud.");
            });
        });
      }
      notify("info", "Story deleted", "It was removed from this device.");
    },
    [notify],
  );

  const createCategory = useCallback(
    (name: string): string => {
      const trimmed = name.trim();
      if (!trimmed) return "";
      // Use functional update to avoid stale closure (P10)
      let returnedId = "";
      setCategories((prev) => {
        const existing = prev.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
          returnedId = existing.id;
          return prev;
        }
        const newId = safeId();
        const color = CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length];
        returnedId = newId;
        return [...prev, { id: newId, name: trimmed, color }];
      });
      // For synchronous return, we need to check current categories synchronously too
      // Fallback: search in current state (may be stale) but functional update already set returnedId
      // If returnedId still empty due to batch, compute synchronously
      if (!returnedId) {
        // This path unlikely; compute fallback
        const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing.id;
        const newId = safeId();
        // Note: categories update already queued; return newId
        return newId;
      }
      return returnedId;
    },
    [categories],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  /* --- Feature 1: export everything ------------------------------- */
  const exportAll = useCallback(() => {
    const filename = exportAllData(stories, categories, settings);
    setSettings((prev) => ({ ...prev, lastBackupAt: new Date().toISOString() }));
    notify(
      "success",
      "Backup exported",
      `${filename} — ${stories.length} stories, ${categories.length} categories.`,
    );
  }, [stories, categories, settings, notify]);

  /* --- Feature 2: import & merge ---------------------------------- */
  const importBackup = useCallback(
    async (file: File) => {
      try {
        const backup = await readBackupFile(file);
        const merged = mergeBackup({ stories, categories }, backup);
        setStories(merged.stories);
        setCategories(merged.categories);

        const { report } = merged;
        if (report.added + report.updated === 0) {
          notify(
            "info",
            "Nothing new to import",
            `All ${report.skipped} ${report.skipped === 1 ? "story was" : "stories were"} already up to date.`,
          );
        } else {
          const parts = [
            `${report.added} added`,
            `${report.updated} updated`,
            report.skipped ? `${report.skipped} already current` : null,
            report.categoriesAdded ? `${report.categoriesAdded} new categories` : null,
          ].filter(Boolean);
          notify("success", "Backup restored — bookshelf updated", parts.join(" · "));
        }
      } catch (err) {
        notify(
          "error",
          "Import failed",
          err instanceof BackupError ? err.message : "That file couldn't be read as JSON.",
        );
      }
    },
    [stories, categories, notify],
  );

  /* --- Feature 3: single-story export ------------------------------ */
  const exportSingle = useCallback(
    (story: Story, format: StoryExportFormat) => {
      const shelf = categories.find((c) => c.id === story.categoryId)?.name ?? null;
      const filename = exportStory(story, format, shelf);
      notify(
        "success",
        format === "md" ? "Exported as Markdown" : "Exported as Plain Text",
        filename,
      );
    },
    [categories, notify],
  );

  /* --- maintenance -------------------------------------------------- */
  const restoreSamples = useCallback(() => {
    const seeded = seedLibrary();
    setStories(seeded.stories);
    setCategories(seeded.categories);
    setSettings((prev) => ({ ...prev }));
    notify("info", "Sample library restored", "Four stories returned to the bookshelf.");
  }, [notify]);

  const eraseAll = useCallback(() => {
    setStories([]);
    setCategories([]);
    setSettings((prev) => ({ writerName: prev.writerName, lastBackupAt: null }));
    notify("info", "Library erased", "Everything on this device was removed.");
  }, [notify]);

  const value = useMemo<LibraryValue>(
    () => ({
      stories,
      categories,
      settings,
      toasts,
      notify,
      dismissToast,
      createStory,
      updateStory,
      deleteStory,
      createCategory,
      updateSettings,
      exportAll,
      importBackup,
      exportSingle,
      restoreSamples,
      eraseAll,
    }),
    [
      stories,
      categories,
      settings,
      toasts,
      notify,
      dismissToast,
      createStory,
      updateStory,
      deleteStory,
      createCategory,
      updateSettings,
      exportAll,
      importBackup,
      exportSingle,
      restoreSamples,
      eraseAll,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}
