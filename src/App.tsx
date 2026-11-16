import { useEffect, useMemo, useState } from "react";
import { TopBar } from "./components/TopBar";
import { Bookshelf } from "./components/Bookshelf";
import { Editor } from "./components/Editor";
import { SettingsModal } from "./components/SettingsModal";
import { buildBackup, downloadJson, loadCategories, loadStories, saveCategories, saveStories } from "./lib/storage";
import { fetchRemoteStories, pb } from "./lib/pocketbase";
import { countWords } from "./lib/format";
import type { Story } from "./types";

type ViewMode = "shelf" | "editor";

function useTheme(): [string, (v: string) => void] {
  const [theme, setTheme] = useState<string>(() => {
    try {
      const raw = localStorage.getItem("cngwriter:theme");
      if (raw === "light" || raw === "dark") return raw;
      const prefers = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      return prefers;
    } catch { return "light"; }
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
      localStorage.setItem("cngwriter:theme", theme);
    } catch {}
    return () => {};
  }, [theme]);

  return [theme, setTheme];
}

export default function App() {
  const [, setTheme] = useTheme();
  const [stories, setStories] = useState(() => { try { return loadStories(); } catch { return []; } });
  const [categories, setCategories] = useState(() => { try { return loadCategories(); } catch { return []; } });
  const [activeView, setActiveView] = useState<ViewMode>("shelf");
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const activeStory = useMemo(() => {
    try {
      if (!activeStoryId) return null;
      return stories.find(s => s.id === activeStoryId) ?? null;
    } catch { return null; }
  }, [stories, activeStoryId]);

  useEffect(() => {
    let timer: number | null = null;
    try {
      timer = window.setTimeout(() => {
        try { saveStories(stories); } catch {}
      }, 180);
    } catch {}
    return () => {
      try {
        if (timer !== null) window.clearTimeout(timer);
      } catch (e) { console.warn("Cleanup error guarded:", e); }
    };
  }, [stories]);

  useEffect(() => {
    let timer: number | null = null;
    try {
      timer = window.setTimeout(() => {
        try { saveCategories(categories); } catch {}
      }, 180);
    } catch {}
    return () => {
      try { if (timer !== null) window.clearTimeout(timer); } catch (e) { console.warn("Cleanup error guarded:", e); }
    };
  }, [categories]);

  // Optional PB pull on mount if authed; explicit no-async-effect wrapper
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      try {
        if (!pb.authStore.isValid) return;
        try { setSyncing(true); } catch {}
        fetchRemoteStories().then((remote: Story[] | null) => {
          if (cancelled) return;
          if (!remote || remote.length === 0) return;
          // Merge remote wins on newer updated timestamp; preserve local-only
          try {
            const byId = new Map(stories.map(s => [s.id, s] as const));
            for (const r of remote) {
              const local = byId.get(r.id);
              if (!local) { byId.set(r.id, r as unknown as typeof local & {}); continue; }
              const rt = new Date((r as unknown as { updated?: string }).updated ?? (r as unknown as { updatedAt?: string }).updatedAt ?? 0).getTime();
              const lt = new Date((local as unknown as { updatedAt?: string }).updatedAt ?? 0).getTime();
              if (!Number.isNaN(rt) && !Number.isNaN(lt) && rt > lt) byId.set(r.id, r as unknown as typeof local & {});
            }
            const merged = Array.from(byId.values()).filter(Boolean) as typeof stories;
            if (merged.length !== stories.length) { try { setStories(merged); } catch {} }
          } catch {}
        }).catch(() => {}).finally(() => {
          if (!cancelled) { try { setSyncing(false); } catch {} }
        });
      } catch {}
    };
    // Defer one tick so initial load paints
    const t = window.setTimeout(run, 600);
    return () => {
      try { cancelled = true; window.clearTimeout(t); if (syncing) setSyncing(false); } catch (e) { console.warn("Cleanup error guarded:", e); }
    };
  }, []); // run once

  const handleCreateStory = () => {
    try {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const title = "Untitled";
      const next: Story = { id, title, content: "", categoryId: categories[0]?.id ?? "fiction", createdAt: now, updatedAt: now };
      setStories(prev => {
        try { return [next as unknown as typeof prev[number], ...prev]; } catch { return prev; }
      });
      try { setActiveStoryId(id); } catch {}
      try { setActiveView("editor"); } catch {}
    } catch {}
  };

  const handleSelectStory = (id: string) => {
    try { setActiveStoryId(id); setActiveView("editor"); } catch {}
  };

  const handleBack = () => {
    try {
      const active = document.activeElement as HTMLElement | null;
      try { active?.blur?.(); } catch {}
      window.setTimeout(() => {
        try { setActiveView("shelf"); } catch {}
        try { setActiveStoryId(null); } catch {}
      }, 0);
    } catch {}
  };

  const handleUpdateStory = (id: string, patch: Partial<Story>) => {
    try {
      const now = new Date().toISOString();
      setStories(prev => {
        try {
          return prev.map(s => {
            if (s.id !== id) return s;
            const nextTitle = patch.title !== undefined ? String(patch.title) : s.title;
            const nextContent = patch.content !== undefined ? String(patch.content) : s.content;
            const nextCategoryId = (patch as unknown as { categoryId?: string; category?: string }).categoryId !== undefined
              ? String((patch as unknown as { categoryId?: string }).categoryId)
              : (patch as unknown as { category?: string }).category !== undefined
                ? String((patch as unknown as { category?: string }).category)
                : (s.categoryId ?? (s as unknown as { category?: string }).category ?? null);
            return { ...s, title: nextTitle, content: nextContent, categoryId: nextCategoryId as string | null, updatedAt: now } as typeof s;
          });
        } catch { return prev; }
      });
      try {
        const cur = stories.find(s => s.id === id);
        const title = (patch.title ?? cur?.title ?? "").toString();
        const content = (patch.content ?? cur?.content ?? "").toString();
        const categoryId = ((patch as unknown as { categoryId?: string }).categoryId ?? (patch as unknown as { category?: string }).category ?? cur?.categoryId ?? categories[0]?.id ?? "fiction") as string;
        import("./lib/storage").then(m => {
          try { (m as unknown as { queueSyncToPB: (p: unknown) => void }).queueSyncToPB({ id, title, content, categoryId, category: categoryId, updated: now }); } catch {}
        }).catch(() => {});
      } catch {}
    } catch {}
  };

  const handleDeleteStory = (id: string) => {
    try {
      if (!window.confirm("Delete this story? This cannot be undone on this device.")) return;
      setStories(prev => { try { return prev.filter(s => s.id !== id); } catch { return prev; } });
      try { if (activeStoryId === id) { setActiveView("shelf"); setActiveStoryId(null); } } catch {}
      try {
        import("./lib/storage").then(m => { try { m.deleteRemoteStory(id).catch(() => {}); } catch {} }).catch(() => {});
      } catch {}
    } catch {}
  };

  const handleExportAll = () => {
    try { downloadJson(buildBackup(stories, categories)); } catch {}
  };

  const wordTotal = useMemo(() => {
    try { return stories.reduce((n, s) => n + countWords(s.content), 0); } catch { return 0; }
  }, [stories]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-night-950 dark:text-zinc-100">
      <TopBar
        onNewStory={handleCreateStory}
        onOpenSettings={() => { try { setSettingsOpen(true); } catch {} }}
        onExportAll={handleExportAll}
      />
      <div className="border-b border-zinc-200 bg-white/60 py-2 text-center font-mono text-[11px] text-zinc-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400">
        {syncing ? "Syncing…" : `${stories.length} stories · ${wordTotal.toLocaleString()} words`} — theme{" "}
        <button onClick={() => { try { const cur = document.documentElement.classList.contains("dark") ? "light" : "dark"; setTheme(cur); } catch {} }} className="underline decoration-zinc-300 underline-offset-4 dark:decoration-white/30">toggle</button>
      </div>

      {activeView === "shelf" ? (
        <Bookshelf
          stories={stories}
          categories={categories}
          onSelectStory={handleSelectStory}
          onCreateStory={handleCreateStory}
          onDeleteStory={handleDeleteStory}
        />
      ) : (
        <Editor
          story={activeStory}
          categories={categories}
          onBack={handleBack}
          onUpdateStory={handleUpdateStory}
          onDeleteStory={handleDeleteStory}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => { try { setSettingsOpen(false); } catch {} }}
        stories={stories}
        categories={categories}
        onImported={(s, c) => {
          try { setStories(s); } catch {}
          try { setCategories(c); } catch {}
        }}
        onClearLocal={() => {
          try {
            if (!window.confirm("Clear all stories on this device? Export first if needed.")) return;
            setStories([]); setCategories([]); setActiveView("shelf"); setActiveStoryId(null);
          } catch {}
        }}
      />

      <footer className="mx-auto max-w-6xl px-5 py-8 text-center font-mono text-[11px] text-zinc-400 dark:text-zinc-500">CnG Writer · local-first · PocketBase optional</footer>
    </div>
  );
}
