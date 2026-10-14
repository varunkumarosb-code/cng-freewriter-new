import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { library } from "./lib/library";
import { useLibrary } from "./lib/useLibrary";
import TopBar from "./components/TopBar";
import Bookshelf from "./components/Bookshelf";
import Editor from "./components/Editor";
import SettingsModal from "./components/SettingsModal";

interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "error";
}

type View = { v: "shelf" } | { v: "editor"; id: string };

const THEME_KEY = "cngwriter:theme";

export default function App() {
  const snap = useLibrary();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>({ v: "shelf" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    library.init();
    setReady(true);
  }, []);

  const toast = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      3600
    );
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const currentStory =
    view.v === "editor"
      ? snap.stories.find((s) => s.id === view.id)
      : undefined;

  useEffect(() => {
    if (ready && view.v === "editor" && !currentStory) setView({ v: "shelf" });
  }, [ready, view, currentStory]);

  const newStory = useCallback(() => {
    const s = library.create();
    setView({ v: "editor", id: s.id });
  }, []);

  /* press N anywhere (outside form fields) to draft something new */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (view.v !== "shelf" || settingsOpen) return;
      if (
        e.key.toLowerCase() !== "n" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey
      )
        return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      e.preventDefault();
      newStory();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, settingsOpen, newStory]);

  const onDelete = useCallback(
    (id: string) => {
      void library.remove(id).then(() => toast("Story deleted"));
    },
    [toast]
  );

  return (
    <div className="relative min-h-dvh bg-[#f6f3ee] font-sans text-zinc-800 antialiased dark:bg-[#09090b] dark:text-zinc-200">
      <div className="glow-amber pointer-events-none fixed inset-0" />

      <AnimatePresence mode="wait">
        {view.v === "shelf" || !currentStory ? (
          <motion.div
            key="shelf"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <TopBar
              status={snap.status}
              statusDetail={snap.statusDetail}
              authUser={snap.authUser}
              onNew={newStory}
              onOpenSettings={() => setSettingsOpen(true)}
              theme={theme}
              onToggleTheme={() =>
                setTheme((t) => (t === "dark" ? "light" : "dark"))
              }
            />
            <main>
              <Bookshelf
                stories={snap.stories}
                status={snap.status}
                onOpen={(s) => setView({ v: "editor", id: s.id })}
                onNew={newStory}
                onDelete={onDelete}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </main>
          </motion.div>
        ) : (
          <motion.div
            key={currentStory.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Editor
              story={currentStory}
              status={snap.status}
              onBack={() => setView({ v: "shelf" })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        snap={snap}
        toast={toast}
      />

      {/* film grain */}
      <div className="bg-grain pointer-events-none fixed inset-0 z-[90] opacity-[0.04] mix-blend-overlay dark:opacity-[0.06]" />

      {/* toasts */}
      <div className="fixed right-4 bottom-6 z-[95] flex w-72 flex-col gap-2 sm:right-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="flex items-center gap-2.5 rounded-xl border border-zinc-900/10 bg-white/95 px-3.5 py-2.5 text-[13px] text-zinc-700 shadow-xl shadow-black/[0.08] backdrop-blur dark:border-white/10 dark:bg-[#141416]/95 dark:text-zinc-200 dark:shadow-black/50"
            >
              {t.kind === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
              )}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
