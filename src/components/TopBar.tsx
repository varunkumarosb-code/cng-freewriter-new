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
    const unsubscribe = pb.authStore.onChange(() => {
      setIsConnected(pb.authStore.isValid);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-[#fcfaf7]/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-amber-600/25 bg-amber-600/10 text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-400 transition-all duration-300">
            <Feather size={15} />
          </span>
          <span className="font-serif text-[22px] font-semibold italic leading-none text-zinc-900 dark:text-zinc-100 transition-all duration-300">CnG</span>
          <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-zinc-500 dark:text-zinc-400 sm:inline transition-all duration-300">Writer</span>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1 font-mono text-[10px] transition-all duration-300">
            {isConnected ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Cloud size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline text-emerald-700 dark:text-zinc-300">Live</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <CloudOff size={11} className="text-zinc-500 dark:text-zinc-400" />
                <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">Local</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { try { exportAll(); } catch {} }} className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:border-amber-600/50 hover:text-amber-600 dark:hover:border-amber-400/50 dark:hover:text-amber-400 transition-all duration-300">
            <Download size={14} /> Export All
          </button>
          <button onClick={() => { try { onImportClick(); } catch {} }} className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
            <Upload size={14} /> Import
          </button>
          <span className="mx-1 hidden sm:block h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button onClick={() => { try { onNewStory(); } catch {} }} className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-600 dark:bg-amber-400 px-3 pr-3.5 text-[13px] font-bold text-white dark:text-[#0d0d0d] hover:bg-amber-700 dark:hover:bg-amber-300 active:scale-[0.97] transition-all duration-300">
            <Plus size={15} strokeWidth={2.6} /> <span className="hidden sm:inline">New story</span><span className="sm:hidden">New</span>
          </button>
          <button onClick={() => { try { onOpenSettings(); } catch {} }} aria-label="Open settings" className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-300">
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
