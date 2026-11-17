import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "./components/TopBar";
import { Bookshelf } from "./components/Bookshelf";
import { Editor } from "./components/Editor";
import { SettingsModal } from "./components/SettingsModal";
import { Toast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useLibrary } from "./state/LibraryContext";
import { countWords } from "./lib/format";

export default function App() {
  const { stories, theme, setTheme, createStory, importBackup } = useLibrary();
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hiddenImportRef = useRef<HTMLInputElement | null>(null);

  // Theme → html.dark pairing
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    } catch {}
    return () => {};
  }, [theme]);

  const handleCreateStory = useCallback(() => {
    try {
      const s = createStory();
      const safeId = (s.id && typeof s.id === "string") ? s.id : "";
      if (safeId) setActiveStoryId(safeId);
    } catch {}
  }, [createStory]);

  const handleSelectStory = useCallback((id: string) => {
    const safeId = (id && typeof id === "string") ? id : "";
    if (!safeId) return;
    try { setActiveStoryId(safeId); } catch {}
  }, []);

  const handleBack = useCallback(() => {
    try {
      const active = document.activeElement as HTMLElement | null;
      try { active?.blur?.(); } catch {}
      setActiveStoryId(null);
    } catch {}
  }, []);

  const handleImportAllClick = useCallback(() => {
    try { hiddenImportRef.current?.click(); } catch {}
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const safeTxt = (txt && typeof txt === "string") ? txt : "";
      importBackup(safeTxt);
    } catch {} finally { try { e.currentTarget.value = ""; } catch {} }
  }, [importBackup]);

  const wordTotal = useMemo(() => {
    try { return stories.reduce((n, s) => n + countWords((s.content && typeof s.content === "string") ? s.content : ""), 0); } catch { return 0; }
  }, [stories]);

  const isEditor = (() => {
    const safe = (activeStoryId && typeof activeStoryId === "string") ? activeStoryId : "";
    return !!safe;
  })();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-night-950 dark:text-zinc-100 bg-zinc-50 dark:bg-night-950">
        {isEditor ? (
          // Editor view — no TopBar bookshelf chrome, only Editor's own fixed nav
          <ErrorBoundary>
            <Editor storyId={activeStoryId} onBack={handleBack} />
          </ErrorBoundary>
        ) : (
          <>
            <ErrorBoundary>
              <TopBar onNewStory={handleCreateStory} onOpenSettings={() => { try { setSettingsOpen(true); } catch {} }} onImportClick={handleImportAllClick} />
            </ErrorBoundary>

            <div className="border-b border-zinc-200 bg-white/60 py-2 text-center font-mono text-[11px] text-zinc-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400 bg-zinc-50 dark:bg-night-950">
              {stories.length} stories · {wordTotal.toLocaleString()} words — theme{" "}
              <button onClick={() => { try { const cur = document.documentElement.classList.contains("dark") ? "light" : "dark"; setTheme(cur as "light" | "dark"); } catch {} }} className="underline decoration-zinc-300 underline-offset-4 dark:decoration-white/30">toggle</button>
            </div>

            <ErrorBoundary>
              <Bookshelf onSelectStory={handleSelectStory} />
            </ErrorBoundary>
          </>
        )}

        <SettingsModal open={settingsOpen} onClose={() => { try { setSettingsOpen(false); } catch {} }} />
        <Toast />

        {/* hidden global import for TopBar */}
        <input ref={hiddenImportRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

        <footer className="mx-auto max-w-6xl px-5 py-8 text-center font-mono text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-night-950">CnG Writer · local-first · PocketBase optional (isolated writer_users / writer_stories)</footer>
      </div>
    </ErrorBoundary>
  );
}
