import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppSettings, Category, Story, ToastItem } from "../lib/types";
import {
  buildBackup,
  createCategory as mkCategory,
  downloadJson,
  loadCategories,
  loadSettings,
  loadStories,
  loadTheme,
  mergeByUpdatedAt,
  parseBackup,
  saveCategories,
  saveSettings,
  saveStories,
  saveTheme,
} from "../lib/storage";
import { deleteRemoteStory, fetchRemoteStories, pb, queueSyncToPB } from "../lib/pocketbase";

interface LibraryValue {
  stories: Story[];
  categories: Category[];
  settings: AppSettings;
  theme: "light" | "dark";
  toasts: ToastItem[];
  // stories
  createStory: (initialCategory?: string) => Story;
  updateStory: (id: string, patch: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  setStoryCategory: (id: string, category: string) => void;
  // categories
  addCategory: (name: string) => Category | null;
  // backup
  exportAll: () => void;
  importBackup: (text: string) => { ok: boolean; msg: string };
  // settings/theme
  setTheme: (t: "light" | "dark") => void;
  setWriterName: (name: string) => void;
  // toasts
  toast: (msg: string, tone?: ToastItem["tone"]) => void;
  dismissToast: (id: string) => void;
  // pb
  syncing: boolean;
  refreshFromCloud: () => Promise<void>;
}

const Ctx = createContext<LibraryValue | null>(null);

export function useLibrary(): LibraryValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLibrary must be inside LibraryProvider");
  return v;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [stories, setStories] = useState<Story[]>(() => {
    try { return loadStories(); } catch { return []; }
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    try { return loadCategories(); } catch { return []; }
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try { return loadSettings(); } catch { return { writerName: "Writer", lastBackupAt: null, theme: "light" }; }
  });
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    try { return loadTheme(); } catch { return "light"; }
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  // persist
  useEffect(() => {
    let t: number | null = null;
    try { t = window.setTimeout(() => { try { saveStories(stories); } catch {} }, 180); } catch {}
    return () => { try { if (t !== null) window.clearTimeout(t); } catch {} };
  }, [stories]);

  useEffect(() => {
    let t: number | null = null;
    try { t = window.setTimeout(() => { try { saveCategories(categories); } catch {} }, 180); } catch {}
    return () => { try { if (t !== null) window.clearTimeout(t); } catch {} };
  }, [categories]);

  useEffect(() => {
    try { saveSettings(settings); } catch {}
    return () => {};
  }, [settings]);

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
      try { saveTheme(theme); } catch {}
      try { setSettings((prev) => ({ ...prev, theme })); } catch {}
    } catch {}
    return () => {};
  }, [theme]);

  // toast helper
  const toast = useCallback((msg: string, tone: ToastItem["tone"] = "ok") => {
    try {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message: msg, tone }]);
      window.setTimeout(() => {
        try { setToasts((prev) => prev.filter((t) => t.id !== id)); } catch {}
      }, 2600);
    } catch {}
  }, []);

  const dismissToast = useCallback((id: string) => {
    try { setToasts((prev) => prev.filter((t) => t.id !== id)); } catch {}
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    try { setThemeState(t); } catch {}
  }, []);

  const setWriterName = useCallback((name: string) => {
    try { setSettings((prev) => ({ ...prev, writerName: name })); } catch {}
  }, []);

  // stories
  const createStory = useCallback((initialCategory?: string): Story => {
    const id = (() => {
      try { return crypto.randomUUID(); } catch { return `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
    })();
    const now = new Date().toISOString();
    const next: Story = {
      id,
      title: "Untitled",
      content: "",
      category: initialCategory || categories[0]?.name || "",
      createdAt: now,
      updatedAt: now,
    };
    try { setStories((prev) => [next, ...prev]); } catch {}
    try { toast("New story created", "ok"); } catch {}
    return next;
  }, [categories, toast]);

  const updateStory = useCallback((id: string, patch: Partial<Story>) => {
    const now = new Date().toISOString();
    setStories((prev) => {
      try {
        return prev.map((s) => {
          if (s.id !== id) return s;
          const title = patch.title !== undefined ? String(patch.title || "") : s.title;
          const content = patch.content !== undefined ? String(patch.content || "") : s.content;
          const category = patch.category !== undefined ? String(patch.category || "") : s.category;
          return { ...s, title, content, category, updatedAt: now, remoteId: patch.remoteId !== undefined ? patch.remoteId : s.remoteId };
        });
      } catch { return prev; }
    });
    // queue PB sync (fire-and-forget)
    try {
      // need latest story snapshot; defer to next tick from current state
      window.setTimeout(() => {
        try {
          setStories((curr) => {
            const found = curr.find((s) => s.id === id);
            if (found) {
              try {
                queueSyncToPB(found, (localId, remoteId) => {
                  try {
                    setStories((p) => p.map((s) => s.id === localId ? { ...s, remoteId } : s));
                  } catch {}
                });
              } catch {}
            }
            return curr;
          });
        } catch {}
      }, 80);
    } catch {}
  }, []);

  const deleteStory = useCallback((id: string) => {
    let toDeleteRemote: string | undefined;
    try {
      setStories((prev) => {
        const found = prev.find((s) => s.id === id);
        if (found?.remoteId) toDeleteRemote = found.remoteId;
        return prev.filter((s) => s.id !== id);
      });
    } catch {}
    try { toast("Story deleted", "ok"); } catch {}
    if (toDeleteRemote) {
      try { void deleteRemoteStory(toDeleteRemote); } catch {}
    }
  }, [toast]);

  const setStoryCategory = useCallback((id: string, category: string) => {
    try { updateStory(id, { category }); } catch {}
  }, [updateStory]);

  const addCategory = useCallback((name: string): Category | null => {
    const trimmed = (name || "").trim();
    if (!trimmed) return null;
    const exists = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return exists;
    const cat = mkCategory(categories as unknown as Category[], trimmed);
    if (!cat) return null;
    // mkCategory expects Category[] with name match; our helper wraps storage logic
    // but storage.createCategory returns Category | null with generated id
    try {
      // rebuild correctly using storage helper signature
      const created = cat as Category;
      setCategories((prev) => [...prev, created]);
      try { toast(`Shelf "${trimmed}" added`, "ok"); } catch {}
      return created;
    } catch { return null; }
  }, [categories, toast]);

  const exportAll = useCallback(() => {
    try {
      const backup = buildBackup(stories, categories, settings);
      downloadJson(backup, `cng-writer-library-${new Date().toISOString().slice(0, 10)}.json`);
      try { toast("Library exported", "ok"); } catch {}
    } catch {}
  }, [stories, categories, settings, toast]);

  const importBackup = useCallback((text: string): { ok: boolean; msg: string } => {
    try {
      const parsed = parseBackup(text);
      if (!parsed) {
        try { toast("Invalid backup file", "error"); } catch {}
        return { ok: false, msg: "Invalid backup file" };
      }
      // merge by id newer updatedAt wins
      try {
        setStories((prev) => mergeByUpdatedAt(prev, parsed.stories));
        setCategories((prev) => {
          const byName = new Map(prev.map((c) => [c.name.toLowerCase(), c] as const));
          for (const c of parsed.categories) {
            const key = c.name.toLowerCase();
            if (!byName.has(key)) byName.set(key, c);
          }
          return Array.from(byName.values());
        });
        if (parsed.settings) {
          setSettings((prev) => ({ ...prev, ...parsed.settings!, lastBackupAt: new Date().toISOString() }));
        }
        try { toast(`Imported ${parsed.stories.length} stories`, "ok"); } catch {}
        return { ok: true, msg: `Imported ${parsed.stories.length} stories` };
      } catch (e) {
        return { ok: false, msg: String(e) };
      }
    } catch (e) {
      try { toast("Import failed", "error"); } catch {}
      return { ok: false, msg: String(e) };
    }
  }, [toast]);

  const refreshFromCloud = useCallback(async () => {
    try {
      if (!pb.authStore.isValid) return;
      try { setSyncing(true); } catch {}
      const remote = await fetchRemoteStories();
      if (!remote || remote.length === 0) return;
      // remote stories have random local ids + remoteId; merge by remoteId
      setStories((prev) => {
        try {
          const byRemote = new Map<string, Story>();
          for (const s of prev) if (s.remoteId) byRemote.set(s.remoteId, s);
          const byId = new Map(prev.map((s) => [s.id, s] as const));
          let changed = false;
          for (const r of remote) {
            if (!r.remoteId) continue;
            const existingByRemote = byRemote.get(r.remoteId);
            if (existingByRemote) {
              const rt = new Date(r.updatedAt).getTime();
              const lt = new Date(existingByRemote.updatedAt).getTime();
              if (rt > lt) {
                byId.set(existingByRemote.id, { ...existingByRemote, title: r.title, content: r.content, category: r.category, updatedAt: r.updatedAt, remoteId: r.remoteId });
                changed = true;
              }
              continue;
            }
            // no local match → add as new local story with its own id preserved as remote's generated local id
            // but we want stable local id = remoteId-based? We'll keep r.id as local id (random) and remoteId
            if (!byId.has(r.id)) {
              byId.set(r.id, r);
              changed = true;
            }
          }
          if (changed) return Array.from(byId.values());
          return prev;
        } catch { return prev; }
      });
    } catch {} finally {
      try { setSyncing(false); } catch {}
    }
  }, []);

  // auto pull on mount if authed
  const didInitialSync = useRef(false);
  useEffect(() => {
    if (didInitialSync.current) return;
    didInitialSync.current = true;
    try {
      if (pb.authStore.isValid) {
        const t = window.setTimeout(() => { void refreshFromCloud(); }, 700);
        return () => { try { window.clearTimeout(t); } catch {} };
      }
    } catch {}
    return () => {};
  }, [refreshFromCloud]);

  const value = useMemo<LibraryValue>(() => ({
    stories, categories, settings, theme, toasts,
    createStory, updateStory, deleteStory, setStoryCategory,
    addCategory, exportAll, importBackup, setTheme, setWriterName, toast, dismissToast, syncing, refreshFromCloud,
  }), [stories, categories, settings, theme, toasts, createStory, updateStory, deleteStory, setStoryCategory, addCategory, exportAll, importBackup, setTheme, setWriterName, toast, dismissToast, syncing, refreshFromCloud]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
