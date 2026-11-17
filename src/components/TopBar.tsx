import { useEffect, useState } from "react";
import { Cloud, CloudOff, Download, Feather, Plus, Settings, Upload } from "lucide-react";
import { pb } from "../lib/pocketbase";
import { useLibrary } from "../state/LibraryContext";

interface Props {
  onNewStory: () => void;
  onOpenSettings: () => void;
  onImportClick: () => void;
}

export function TopBar({ onNewStory, onOpenSettings, onImportClick }: Props) {
  const { exportAll } = useLibrary();
  const [isConnected, setIsConnected] = useState(() => {
    try { return pb.authStore.isValid; } catch { return false; }
  });

  useEffect(() => {
    let unsub: unknown;
    try {
      unsub = pb.authStore.onChange(() => { try { setIsConnected(pb.authStore.isValid); } catch {} });
    } catch {}
    return () => { try { if (typeof unsub === "function") (unsub as () => void)(); } catch {} };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-night-950/80 bg-zinc-50 dark:bg-night-950">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-ember-400/25 bg-ember-400/10 text-ember-600 dark:text-ember-300">
            <Feather size={15} />
          </span>
          <span className="font-serif text-[22px] font-semibold italic leading-none text-zinc-900 dark:text-zinc-100">CnG</span>
          <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-zinc-500 sm:inline">Writer</span>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[10px] dark:border-white/10 dark:bg-white/[0.02] bg-zinc-50 dark:bg-night-950">
            {isConnected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Cloud size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline text-emerald-700 dark:text-emerald-300">Live</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <CloudOff size={11} className="text-zinc-400 dark:text-zinc-500" />
                <span className="hidden sm:inline text-zinc-600 dark:text-zinc-400">Local</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { try { exportAll(); } catch {} }} className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-600 hover:border-ember-400/50 hover:text-ember-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 bg-zinc-50 dark:bg-night-950">
            <Download size={14} /> Export All
          </button>
          <button onClick={() => { try { onImportClick(); } catch {} }} className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 bg-zinc-50 dark:bg-night-950">
            <Upload size={14} /> Import
          </button>
          <span className="mx-1 hidden sm:block h-4 w-px bg-zinc-200 dark:bg-white/10" />
          <button onClick={() => { try { onNewStory(); } catch {} }} className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember-400 px-3 pr-3.5 text-[13px] font-bold text-night-950 hover:bg-ember-300 active:scale-[0.97]">
            <Plus size={15} strokeWidth={2.6} /> <span className="hidden sm:inline">New story</span><span className="sm:hidden">New</span>
          </button>
          <button onClick={() => { try { onOpenSettings(); } catch {} }} aria-label="Open settings" className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:border-white/20 bg-zinc-50 dark:bg-night-950">
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
