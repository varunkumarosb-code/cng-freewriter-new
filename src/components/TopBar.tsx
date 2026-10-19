import { Cloud, CloudOff, Download, Feather, Plus, Settings } from "lucide-react";
import { useLibrary } from "../state/LibraryContext";
import { ImportButton } from "./ImportButton";
import { pb } from "../lib/pocketbase";

interface TopBarProps {
  onNewStory: () => void;
  onOpenSettings: () => void;
}

/**
 * App chrome for the Bookshelf — wordmark, plus the Backup & Export
 * actions: Export All Stories (JSON) and Import Backup (.json).
 */
import { useEffect, useState } from "react";

export function TopBar({ onNewStory, onOpenSettings }: TopBarProps) {
  const { exportAll } = useLibrary();
  const [isConnected, setIsConnected] = useState(pb.authStore.isValid);

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setIsConnected(pb.authStore.isValid);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-night-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        
        {/* Wordmark & Cloud Status */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-ember-400/25 bg-ember-400/10 text-ember-600 dark:text-ember-300">
            <Feather size={15} />
          </span>
          <span className="font-serif text-[22px] font-semibold italic leading-none text-zinc-900 dark:text-zinc-100">
            CnG
          </span>
          <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-zinc-500 sm:inline">
            Writer
          </span>
          
          {/* Cloud Sync Status Indicator */}
          <button
            onClick={onOpenSettings}
            title={isConnected ? `Synced as ${pb.authStore.model?.email}` : "Click to connect PocketBase cloud"}
            className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-black/[0.03] px-2.5 py-1 font-mono text-[10px] transition hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
          >
            {isConnected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Cloud size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span className="hidden text-emerald-700 dark:text-emerald-300 sm:inline">Synced</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <CloudOff size={11} className="text-zinc-400 dark:text-zinc-500" />
                <span className="hidden text-zinc-600 dark:text-zinc-400 sm:inline">Local</span>
              </>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ImportButton />
          <button
            onClick={exportAll}
            title="Download every story, category & setting as one .json"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-[13px] font-medium text-zinc-600 transition hover:border-ember-400/50 hover:text-ember-600 dark:border-white/10 dark:text-zinc-400 dark:hover:border-ember-400/40 dark:hover:text-ember-300"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export all</span>
          </button>

          <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-white/10" />

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
            className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-100"
          >
            <Settings size={15} />
          </button>
        </div>

      </div>
    </header>
  );
}