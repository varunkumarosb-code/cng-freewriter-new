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

  /* --- initial cloud sync on startup ------------------------------ */
  useEffect(() => {
    import("../lib/storage").then(({ fetchRemoteStories }) => {
      fetchRemoteStories().then((remote) => {
        if (remote && remote.length > 0) {
          setStories((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            for (const r of remote) {
              if (!map.has(r.id)) map.set(r.id, r);
            }
            return Array.from(map.values());
          });
        }
      });
    });
  }, []);

  /* --- persistence (debounced, skip first render) ----------------- */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = window.setTimeout(() => persistLibrary({ stories, categories, settings }), 250);
    return () => window.clearTimeout(t);
  }, [stories, categories, settings]);

  /* --- story / category CRUD -------------------------------------- */
  const createStory = useCallback((categoryId: string | null = null): string => {
    const id = crypto.randomUUID();
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
        prev.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
        ),
      );
    },
    [],
  );

  const deleteStory = useCallback(
    (id: string) => {
      setStories((prev) => {
        const target = prev.find((s) => s.id === id);
        if (target?.remoteId) {
          import("../lib/storage").then(({ deleteRemoteStory }) => {
            deleteRemoteStory(target.remoteId!);
          });
        }
        return prev.filter((s) => s.id !== id);
      });
      notify("info", "Story deleted", "It was removed from this device.");
    },
    [notify],
  );

  const createCategory = useCallback(
    (name: string): string => {
      const trimmed = name.trim();
      if (!trimmed) return "";
      
      const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return existing.id;

      const newId = crypto.randomUUID();
      const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
      setCategories((prev) => [...prev, { id: newId, name: trimmed, color }]);
      return newId;
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
    setSettings({ writerName: settings.writerName, lastBackupAt: null });
    notify("info", "Library erased", "Everything on this device was removed.");
  }, [notify, settings.writerName]);

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
