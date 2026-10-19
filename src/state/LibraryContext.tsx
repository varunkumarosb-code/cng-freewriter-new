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

  const dismissToast = useCallback((id: number) => {
    try { setToasts((prev) => prev.filter((t) => t.id !== id)); } catch {}
  }, []);

  const notify = useCallback(
    (type: ToastType, title: string, message?: string) => {
      let newId: number | null = null;
      try {
        newId = ++toastId.current;
        setToasts((prev) => [...prev.slice(-3), { id: newId as number, type, title, message }]);
      } catch {}
      try {
        if (newId !== null) {
          window.setTimeout(() => {
            try { dismissToast(newId as number); } catch {}
          }, 4600);
        }
      } catch {}
    },
    [dismissToast],
  );

  useEffect(() => {
    let cancelled = false;

    try {
      import("../lib/storage").then(({ fetchRemoteStories }) => {
        try {
          fetchRemoteStories().then((remote) => {
            try {
              if (cancelled) return;
              if (remote && remote.length > 0) {
                setStories((prev) => {
                  try {
                    const byRemoteId = new Map(prev.filter((s) => s.remoteId).map((s) => [s.remoteId!, s]));
                    const byId = new Map(prev.map((s) => [s.id, s]));
                    const toAdd: Story[] = [];
                    for (const r of remote) {
                      const existsByRemote = r.remoteId ? byRemoteId.get(r.remoteId) : undefined;
                      const existsById = byId.get(r.id);
                      if (!existsByRemote && !existsById) {
                        toAdd.push(r);
                      }
                    }
                    if (toAdd.length === 0) return prev;
                    return [...prev, ...toAdd];
                  } catch { return prev; }
                });
              }
            } catch {}
          }).catch(() => {});
        } catch {}
      });
    } catch {}

    return () => {
      try {
        cancelled = true;
      } catch (e) {
        console.warn("Cleanup error guarded:", e);
      }
    };
  }, []);

  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      try { firstRun.current = false; } catch {}
      return;
    }

    let timerId: number | null = null;

    try {
      timerId = window.setTimeout(() => {
        try {
          persistLibrary({ stories, categories, settings });
        } catch {}
        try {
          import("../lib/storage").then(({ syncToPocketBase }) => {
            try {
              syncToPocketBase(stories, (localId, remoteId) => {
                try {
                  setStories((prev) =>
                    prev.map((s) => (s.id === localId ? { ...s, remoteId } : s))
                  );
                } catch {}
              });
            } catch {}
          });
        } catch {}
      }, 250);
    } catch {}

    return () => {
      try {
        if (timerId !== null && typeof timerId !== 'undefined') {
          clearTimeout(timerId);
        }
      } catch (e) {
        console.warn("Cleanup error guarded:", e);
      }
    };
  }, [stories, categories, settings]);

  const createStory = useCallback((categoryId: string | null = null): string => {
    const id = safeId();
    const now = new Date().toISOString();
    try {
      setStories((prev) => [
        { id, title: "", content: "", categoryId, createdAt: now, updatedAt: now },
        ...prev,
      ]);
    } catch {}
    return id;
  }, []);

  const updateStory = useCallback(
    (id: string, patch: Partial<Pick<Story, "title" | "content" | "categoryId">>) => {
      try {
        setStories((prev) =>
          prev.map((s) => {
            try {
              if (s.id !== id) return s;
              return { ...s, ...patch, updatedAt: new Date().toISOString() };
            } catch { return s; }
          }),
        );
      } catch {}
    },
    [],
  );

  const deleteStory = useCallback(
    (id: string) => {
      let remoteId: string | undefined;
      try {
        setStories((prev) => {
          try {
            const target = prev.find((s) => s.id === id);
            remoteId = target?.remoteId;
            return prev.filter((s) => s.id !== id);
          } catch { return prev; }
        });
      } catch {}
      if (remoteId) {
        try {
          import("../lib/storage").then(({ deleteRemoteStory }) => {
            try {
              deleteRemoteStory(remoteId as string)
                .then(() => {})
                .catch((err: unknown) => {
                  try {
                    const msg = err instanceof Error ? err.message : String(err);
                    notify("error", "Cloud delete failed", msg || "Story was removed locally but not from cloud.");
                  } catch {}
                });
            } catch {}
          });
        } catch {}
      }
      try { notify("info", "Story deleted", "It was removed from this device."); } catch {}
    },
    [notify],
  );

  const createCategory = useCallback(
    (name: string): string => {
      const trimmed = name.trim();
      if (!trimmed) return "";
      let returnedId = "";
      try {
        setCategories((prev) => {
          try {
            const existing = prev.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
            if (existing) {
              returnedId = existing.id;
              return prev;
            }
            const newId = safeId();
            const color = CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length];
            returnedId = newId;
            return [...prev, { id: newId, name: trimmed, color }];
          } catch { return prev; }
        });
      } catch {}
      if (!returnedId) {
        try {
          const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
          if (existing) return existing.id;
          const newId = safeId();
          return newId;
        } catch { return ""; }
      }
      return returnedId;
    },
    [categories],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    try { setSettings((prev) => ({ ...prev, ...patch })); } catch {}
  }, []);

  const exportAll = useCallback(() => {
    try {
      const filename = exportAllData(stories, categories, settings);
      setSettings((prev) => ({ ...prev, lastBackupAt: new Date().toISOString() }));
      notify(
        "success",
        "Backup exported",
        `${filename} — ${stories.length} stories, ${categories.length} categories.`,
      );
    } catch {}
  }, [stories, categories, settings, notify]);

  const importBackup = useCallback(
    async (file: File) => {
      try {
        const backup = await readBackupFile(file);
        const merged = mergeBackup({ stories, categories }, backup);
        try { setStories(merged.stories); } catch {}
        try { setCategories(merged.categories); } catch {}

        const { report } = merged;
        if (report.added + report.updated === 0) {
          try { notify(
            "info",
            "Nothing new to import",
            `All ${report.skipped} ${report.skipped === 1 ? "story was" : "stories were"} already up to date.`,
          ); } catch {}
        } else {
          try {
            const parts = [
              `${report.added} added`,
              `${report.updated} updated`,
              report.skipped ? `${report.skipped} already current` : null,
              report.categoriesAdded ? `${report.categoriesAdded} new categories` : null,
            ].filter(Boolean);
            notify("success", "Backup restored — bookshelf updated", parts.join(" · "));
          } catch {}
        }
      } catch (err) {
        try {
          notify(
            "error",
            "Import failed",
            err instanceof BackupError ? err.message : "That file couldn't be read as JSON.",
          );
        } catch {}
      }
    },
    [stories, categories, notify],
  );

  const exportSingle = useCallback(
    (story: Story, format: StoryExportFormat) => {
      try {
        const shelf = categories.find((c) => c.id === story.categoryId)?.name ?? null;
        const filename = exportStory(story, format, shelf);
        notify(
          "success",
          format === "md" ? "Exported as Markdown" : "Exported as Plain Text",
          filename,
        );
      } catch {}
    },
    [categories, notify],
  );

  const restoreSamples = useCallback(() => {
    try {
      const seeded = seedLibrary();
      try { setStories(seeded.stories); } catch {}
      try { setCategories(seeded.categories); } catch {}
      try { setSettings((prev) => ({ ...prev })); } catch {}
      try { notify("info", "Sample library restored", "Four stories returned to the bookshelf."); } catch {}
    } catch {}
  }, [notify]);

  const eraseAll = useCallback(() => {
    try { setStories([]); } catch {}
    try { setCategories([]); } catch {}
    try { setSettings((prev) => ({ writerName: prev.writerName, lastBackupAt: null })); } catch {}
    try { notify("info", "Library erased", "Everything on this device was removed."); } catch {}
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
