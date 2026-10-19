import { useCallback, useEffect, useState } from "react";
import { LibraryProvider, useLibrary } from "./state/LibraryContext";
import { TopBar } from "./components/TopBar";
import { Bookshelf } from "./components/Bookshelf";
import { Editor } from "./components/Editor";
import { SettingsModal } from "./components/SettingsModal";
import { ToastStack } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";

type View = { name: "shelf" } | { name: "editor"; id: string };

function Shell() {
  const [view, setView] = useState<View>({ name: "shelf" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { createStory, stories } = useLibrary();

  const openNewStory = useCallback(() => {
    const id = createStory();
    setView({ name: "editor", id });
  }, [createStory]);

  const goToShelf = useCallback(() => setView({ name: "shelf" }), []);

  const openStory = useCallback((id: string) => setView({ name: "editor", id }), []);

  /* Reflect the current story in the tab title */
  useEffect(() => {
    if (view.name === "editor") {
      const story = stories.find((s) => s.id === view.id);
      document.title = story?.title
        ? `${story.title} — CnG Writer`
        : "Untitled — CnG Writer";
    } else {
      document.title = "CnG Writer — Distraction-Free Writing";
    }
  }, [view, stories]);

  return (
    <div className="min-h-screen">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(1100px_480px_at_50%_-12%,rgba(229,177,104,0.055),transparent_65%),radial-gradient(900px_600px_at_100%_110%,rgba(143,166,201,0.04),transparent_60%)]"
      />

      {view.name === "shelf" ? (
        <ErrorBoundary>
          <TopBar onNewStory={openNewStory} onOpenSettings={() => setSettingsOpen(true)} />
          <Bookshelf
            onOpenStory={openStory}
            onNewStory={openNewStory}
          />
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <Editor storyId={view.id} onBack={goToShelf} />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <div className="grain" aria-hidden />
      <ErrorBoundary>
        <Shell />
      </ErrorBoundary>
      <ToastStack />
    </LibraryProvider>
  );
}
