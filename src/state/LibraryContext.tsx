import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppSettings, Category, Story } from "../lib/types";
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

export interface ToastItem { id: string; message: string; tone: "ok" | "error" | "info"; }

interface LibraryValue {
  stories: Story[];
  categories: Category[];
  settings: AppSettings;
  theme: "light" | "dark";
  toasts: ToastItem[];
  authEmail: string | null;
  syncing: boolean;
  isAuthed: boolean;
  createStory: (initialCategoryId?: string) => Story;
  updateStory: (id: string, patch: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  setStoryCategory: (id: string, categoryId: string) => void;
  addCategory: (name: string) => Category | null;
  exportAll: () => void;
  importBackup: (text: string) => { ok: boolean; msg: string };
  setTheme: (t: "light" | "dark") => void;
  setWriterName: (name: string) => void;
  toast: (msg: string, tone?: ToastItem["tone"]) => void;
  dismissToast: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshFromCloud: () => Promise<void>;
}

const Ctx = createContext<LibraryValue | null>(null);

export function useLibrary(): LibraryValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLibrary must be inside LibraryProvider");
  return v;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [stories, setStories] = useState<Story[]>(() => { try { return loadStories(); } catch { return []; } });
  const [categories, setCategories] = useState<Category[]>(() => { try { return loadCategories(); } catch { return []; } });
  const [settings, setSettings] = useState<AppSettings>(() => { try { return loadSettings(); } catch { return { writerName: "Writer", lastBackupAt: null }; } });
  const [theme, setThemeState] = useState<"light" | "dark">(() => { try { return loadTheme(); } catch { return "light"; } });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(() => {
    try { return (pb.authStore.model as unknown as { email?: string })?.email ?? null; } catch { return null; }
  });

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

  useEffect(() => { try { saveSettings(settings); } catch {} return () => {}; }, [settings]);

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
      try { saveTheme(theme); } catch {}
    } catch {}
    return () => {};
  }, [theme]);

  // auth listener for badge
  useEffect(() => {
    let unsub: unknown;
    try {
      unsub = pb.authStore.onChange(() => {
        try { setAuthEmail((pb.authStore.model as unknown as { email?: string })?.email ?? null); } catch {}
      });
    } catch {}
    return () => { try { if (typeof unsub === "function") (unsub as () => void)(); } catch {} };
  }, []);

  const toast = useCallback((msg: string, tone: ToastItem["tone"] = "ok") => {
    try {
      const safeMsg = (msg && typeof msg === "string") ? msg : String(msg || "");
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message: safeMsg, tone }]);
      window.setTimeout(() => { try { setToasts((prev) => prev.filter((t) => t.id !== id)); } catch {} }, 2600);
    } catch {}
  }, []);

  const dismissToast = useCallback((id: string) => {
    const safeId = (id && typeof id === "string") ? id : "";
    try { setToasts((prev) => prev.filter((t) => t.id !== safeId)); } catch {}
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    const safe = (t && typeof t === "string") ? t : "light";
    if (safe !== "light" && safe !== "dark") return;
    try { setThemeState(safe as "light" | "dark"); } catch {}
  }, []);

  const setWriterName = useCallback((name: string) => {
    const safe = (name && typeof name === "string") ? name : "";
    try { setSettings((prev) => ({ ...prev, writerName: safe })); } catch {}
  }, []);

  const createStory = useCallback((initialCategoryId?: string): Story => {
    const id = (() => { try { return crypto.randomUUID(); } catch { return `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; } })();
    const now = new Date().toISOString();
    const safeCat = (initialCategoryId && typeof initialCategoryId === "string") ? initialCategoryId : "";
    const next: Story = { id, title: "Untitled", content: "", categoryId: safeCat || categories[0]?.id || "", createdAt: now, updatedAt: now };
    try { setStories((prev) => [next, ...prev]); } catch {}
    try { toast("New story created", "ok"); } catch {}
    return next;
  }, [categories, toast]);

  const updateStory = useCallback((id: string, patch: Partial<Story>) => {
    const safeId = (id && typeof id === "string") ? id : "";
    if (!safeId) return;
    const now = new Date().toISOString();
    setStories((prev) => {
      try {
        return prev.map((s) => {
          if (s.id !== safeId) return s;
          const title = patch.title !== undefined ? String((patch.title && typeof patch.title === "string") ? patch.title : "") : s.title;
          const content = patch.content !== undefined ? String((patch.content && typeof patch.content === "string") ? patch.content : "") : s.content;
          const categoryId = patch.categoryId !== undefined ? String((patch.categoryId && typeof patch.categoryId === "string") ? patch.categoryId : "") : s.categoryId;
          return { ...s, title, content, categoryId, updatedAt: now, remoteId: patch.remoteId !== undefined ? patch.remoteId : s.remoteId };
        });
      } catch { return prev; }
    });
    // queue PB sync — NEVER send local id in payload, handled inside syncOneToPocketBase
    try {
      window.setTimeout(() => {
        try {
          setStories((curr) => {
            const found = curr.find((s) => s.id === safeId);
            if (found) {
              try {
                queueSyncToPB(found, (localId, remoteId) => {
                  try { setStories((p) => p.map((s) => s.id === localId ? { ...s, remoteId } : s)); } catch {}
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
    const safeId = (id && typeof id === "string") ? id : "";
    if (!safeId) return;
    let toDeleteRemote: string | undefined;
    try {
      setStories((prev) => {
        const found = prev.find((s) => s.id === safeId);
        if (found?.remoteId) toDeleteRemote = found.remoteId;
        return prev.filter((s) => s.id !== safeId);
      });
    } catch {}
    try { toast("Story deleted", "ok"); } catch {}
    if (toDeleteRemote) { try { void deleteRemoteStory(toDeleteRemote); } catch {} }
  }, [toast]);

  const setStoryCategory = useCallback((id: string, categoryId: string) => {
    const safeCat = (categoryId && typeof categoryId === "string") ? categoryId : "";
    try { updateStory(id, { categoryId: safeCat }); } catch {}
  }, [updateStory]);

  const addCategory = useCallback((name: string): Category | null => {
    const safeName = (name && typeof name === "string") ? name.trim() : "";
    if (!safeName) return null;
    const exists = categories.find((c) => c.name.toLowerCase() === safeName.toLowerCase());
    if (exists) return exists;
    const cat = mkCategory(categories, safeName);
    if (!cat) return null;
    try {
      setCategories((prev) => [...prev, cat]);
      try { toast(`Shelf "${safeName}" added`, "ok"); } catch {}
      return cat;
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
    const safeText = (text && typeof text === "string") ? text : "";
    if (!safeText) return { ok: false, msg: "Empty file" };
    try {
      const parsed = parseBackup(safeText);
      if (!parsed) { try { toast("Invalid backup file", "error"); } catch {} return { ok: false, msg: "Invalid backup file" }; }
      try {
        setStories((prev) => mergeByUpdatedAt(prev, parsed.stories));
        setCategories((prev) => {
          const byName = new Map(prev.map((c) => [c.name.toLowerCase(), c] as const));
          for (const c of parsed.categories) {
            const key = (c.name && typeof c.name === "string") ? c.name.toLowerCase() : "";
            if (key && !byName.has(key)) byName.set(key, c);
          }
          return Array.from(byName.values());
        });
        if (parsed.settings) setSettings((prev) => ({ ...prev, ...parsed.settings!, lastBackupAt: new Date().toISOString() }));
        try { toast(`Imported ${parsed.stories.length} stories`, "ok"); } catch {}
        return { ok: true, msg: `Imported ${parsed.stories.length} stories` };
      } catch (e) { return { ok: false, msg: String(e) }; }
    } catch (e) { try { toast("Import failed", "error"); } catch {} return { ok: false, msg: String(e) }; }
  }, [toast]);

  const login = useCallback(async (email: string, password: string) => {
    const safeEmail = (email && typeof email === "string") ? email.trim() : "";
    const safePass = (password && typeof password === "string") ? password : "";
    if (!safeEmail || !safePass) throw new Error("Email and password required");
    // CRITICAL: must use writer_users
    const auth = await pb.collection("writer_users").authWithPassword(safeEmail, safePass);
    try { const tok = (auth as unknown as { token: string }).token; if (tok) localStorage.setItem("cngwriter:pb_token", tok); } catch {}
    try { setAuthEmail((pb.authStore.model as unknown as { email?: string })?.email ?? safeEmail); } catch {}
    try { toast("Signed in", "ok"); } catch {}
  }, [toast]);

  const logout = useCallback(() => {
    try { pb.authStore.clear(); } catch {}
    try { localStorage.removeItem("cngwriter:pb_token"); } catch {}
    try { setAuthEmail(null); } catch {}
    try { toast("Signed out", "ok"); } catch {}
  }, [toast]);

  const refreshFromCloud = useCallback(async () => {
    try {
      if (!pb.authStore.isValid) return;
      try { setSyncing(true); } catch {}
      const remote = await fetchRemoteStories();
      if (!remote || remote.length === 0) return;
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
              const rt = new Date((r.updatedAt && typeof r.updatedAt === "string") ? r.updatedAt : 0).getTime();
              const lt = new Date(existingByRemote.updatedAt).getTime();
              if (rt > lt) {
                byId.set(existingByRemote.id, { ...existingByRemote, title: r.title, content: r.content, categoryId: r.categoryId, updatedAt: r.updatedAt, remoteId: r.remoteId });
                changed = true;
              }
              continue;
            }
            if (!byId.has(r.id)) { byId.set(r.id, r); changed = true; }
          }
          if (changed) return Array.from(byId.values());
          return prev;
        } catch { return prev; }
      });
    } catch {} finally { try { setSyncing(false); } catch {} }
  }, []);

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
    stories, categories, settings, theme, toasts, authEmail, syncing, isAuthed: !!pb.authStore.isValid,
    createStory, updateStory, deleteStory, setStoryCategory,
    addCategory, exportAll, importBackup, setTheme, setWriterName, toast, dismissToast, login, logout, refreshFromCloud,
  }), [stories, categories, settings, theme, toasts, authEmail, syncing, createStory, updateStory, deleteStory, setStoryCategory, addCategory, exportAll, importBackup, setTheme, setWriterName, toast, dismissToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
