import { Download, Feather, Plus, Settings } from "lucide-react";
import { useLibrary } from "../state/LibraryContext";
import { ImportButton } from "./ImportButton";

interface TopBarProps {
  onNewStory: () => void;
  onOpenSettings: () => void;
}

/**
 * App chrome for the Bookshelf — wordmark, plus the Backup & Export
 * actions: Export All Stories (JSON) and Import Backup (.json).
 */
export function TopBar({ onNewStory, onOpenSettings }: TopBarProps) {
  const { exportAll } = useLibrary();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-night-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        {/* Wordmark */}
        <div className="flex items-baseline gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-ember-400/25 bg-ember-400/10 text-ember-300">
            <Feather size={15} />
          </span>
          <span className="font-serif text-[22px] font-semibold italic leading-none text-zinc-100">
            CnG
          </span>
          <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-zinc-500 sm:inline">
            Writer
          </span>
          <span className="ml-1 hidden border-l border-white/10 pl-3 font-mono text-[10px] text-zinc-600 md:inline">
            distraction-free · local-first
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ImportButton />
          <button
            onClick={exportAll}
            title="Download every story, category & setting as one .json"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-[13px] font-medium text-zinc-400 transition hover:border-ember-400/40 hover:text-ember-300"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export all</span>
          </button>

          <span className="mx-1 h-4 w-px bg-white/10" />

          <button
            onClick={onNewStory}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember-400 px-3 pr-3.5 text-[13px] font-bold text-night-950 transition hover:bg-ember-300 active:scale-[0.97]"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span className="hidden sm:inline">New story</span>
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings — backup, restore & preferences"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-zinc-100"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
