import { useEffect, useMemo, useState } from "react";
import { TopBar } from "./components/TopBar";
import { Bookshelf } from "./components/Bookshelf";
import { Editor } from "./components/Editor";
import { SettingsModal } from "./components/SettingsModal";
import { Toast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useLibrary } from "./state/LibraryContext";
import { countWords } from "./lib/format";

type ViewMode = "shelf" | "editor";

export default function App() {
  const { stories, theme, setTheme, createStory, exportAll, refreshFromCloud } = useLibrary();
  const [activeView, setActiveView] = useState<ViewMode>("shelf");
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // theme already handled in LibraryContext but we keep local toggle sync
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    } catch {}
    return () => {};
  }, [theme]);

  // pull on mount if needed (LibraryContext already does one, this is secondary UI sync indicator)
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      try {
        // trigger refresh via context and show syncing UI
        setSyncing(true);
        refreshFromCloud().finally(() => { if (!cancelled) setSyncing(false); });
      } catch {}
    }, 800);
    return () => {
      try { cancelled = true; window.clearTimeout(t); } catch {}
    };
  }, [refreshFromCloud]);

  const handleCreateStory = () => {
    try {
      const s = createStory();
      setActiveStoryId(s.id);
      setActiveView("editor");
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

  const handleExportAll = () => { try { exportAll(); } catch {} };

  const wordTotal = useMemo(() => {
    try { return stories.reduce((n, s) => n + countWords(s.content || ""), 0); } catch { return 0; }
  }, [stories]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-night-950 dark:text-zinc-100 bg-zinc-50 dark:bg-night-950">
      <ErrorBoundary fallbackTitle="Top bar crashed">
        <TopBar onNewStory={handleCreateStory} onOpenSettings={() => { try { setSettingsOpen(true); } catch {} }} onExportAll={handleExportAll} />
      </ErrorBoundary>

      <div className="border-b border-zinc-200 bg-white/60 py-2 text-center font-mono text-[11px] text-zinc-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400 bg-zinc-50 dark:bg-night-950">
        {syncing ? "Syncing…" : `${stories.length} stories · ${wordTotal.toLocaleString()} words`} — theme{" "}
        <button
          onClick={() => { try { const cur = document.documentElement.classList.contains("dark") ? "light" : "dark"; setTheme(cur as "light" | "dark"); } catch {} }}
          className="underline decoration-zinc-300 underline-offset-4 dark:decoration-white/30"
        >
          toggle
        </button>
      </div>

      <ErrorBoundary fallbackTitle="Something crashed while rendering">
        {activeView === "shelf" ? (
          <Bookshelf onSelectStory={handleSelectStory} />
        ) : (
          <Editor storyId={activeStoryId} onBack={handleBack} />
        )}
      </ErrorBoundary>

      <SettingsModal open={settingsOpen} onClose={() => { try { setSettingsOpen(false); } catch {} }} />

      <Toast />

      <footer className="mx-auto max-w-6xl px-5 py-8 text-center font-mono text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-night-950">
        CnG Writer · local-first · PocketBase optional
      </footer>
    </div>
  );
}
