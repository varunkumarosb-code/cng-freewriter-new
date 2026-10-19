import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Download,
  HardDrive,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useLibrary } from "../state/LibraryContext";
import { librarySizeBytes } from "../lib/storage";
import { countWords, formatBytes, plural, timeAgo } from "../lib/format";

/**
 * Settings → "Backup & Export" panel.
 * Feature 1 (Export All Stories as JSON) + Feature 2 (Import backup,
 * with click-to-browse and drag-&-drop) + library maintenance.
 */
export function BackupPanel() {
  const {
    stories,
    categories,
    settings,
    exportAll,
    importBackup,
    restoreSamples,
    eraseAll,
    notify,
  } = useLibrary();

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  const stats = useMemo(() => {
    const words = stories.reduce((n, s) => n + countWords(s.content), 0);
    const size = formatBytes(librarySizeBytes({ stories, categories, settings }));
    return { words, size };
  }, [stories, categories, settings]);

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      notify("error", "Import failed", "Please choose a .json backup file.");
      return;
    }
    setBusy(true);
    importBackup(file).finally(() => {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0]);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
          <HardDrive size={15} className="text-ember-500 dark:text-ember-400" />
          Backup &amp; Export
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-500">
          Your words live only in this browser. Keep a portable copy somewhere safe —
          restoring one never deletes anything.
        </p>
      </div>

      {/* Storage stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: String(stories.length), label: plural(stories.length, "story", "stories") },
          { value: stats.words.toLocaleString(), label: "words" },
          { value: stats.size, label: "on device" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]"
          >
            <p className="font-mono text-[17px] font-semibold leading-none text-zinc-900 dark:text-zinc-100">
              {s.value}
            </p>
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Export card */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-ember-400/25 bg-ember-400/10 text-ember-600 dark:text-ember-300">
            <Download size={15} />
          </span>
          <p className="mt-3 text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-100">Export all stories</p>
          <p className="mt-1 flex-1 text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-500">
            One <span className="font-mono text-zinc-500 dark:text-zinc-400">.json</span> with every story, category
            and setting — versioned and human-readable.
          </p>
          <button
            onClick={exportAll}
            className="mt-3.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ember-400 text-[12.5px] font-bold text-night-950 transition hover:bg-ember-300 active:scale-[0.98]"
          >
            <Download size={14} strokeWidth={2.4} />
            Download .json
          </button>
          <p className="mt-2 text-center font-mono text-[9.5px] text-zinc-500 dark:text-zinc-400">
            {settings.lastBackupAt ? `last backup ${timeAgo(settings.lastBackupAt)}` : "no backup yet"}
          </p>
        </div>

        {/* Import dropzone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Import a CnG Writer backup"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition ${
            dragging
              ? "border-ember-400/70 bg-ember-400/[0.06]"
              : "border-zinc-300 bg-white hover:border-ember-400/40 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-transparent dark:hover:border-ember-400/40 dark:hover:bg-white/[0.02]"
          }`}
        >
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={onInput} />
          <span
            className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
              dragging
                ? "border-ember-400/40 bg-ember-400/15 text-ember-600 dark:text-ember-300"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400"
            }`}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          </span>
          <p className="mt-3 text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
            {dragging ? "Drop to restore" : "Drop a backup here"}
          </p>
          <p className="mt-1 text-[11.5px] text-zinc-600 dark:text-zinc-500">
            or <span className="font-medium text-ember-600 dark:text-ember-300 underline underline-offset-2">browse files</span> —{" "}
            <span className="font-mono">.json</span> only
          </p>
        </div>
      </div>

      <p className="flex items-start gap-2 font-mono text-[10px] leading-relaxed text-zinc-700 dark:text-zinc-600">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400/70" />
        Import merges by ID — when both copies exist, the newer edit wins. Existing work is never deleted.
      </p>

      {/* Danger zone */}
      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-white/[0.05]">
        <div>
          <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-300">Start over</p>
          <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-500">Restore the samples, or wipe this device clean.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={restoreSamples}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-[11.5px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-100"
          >
            <RotateCcw size={12.5} />
            Samples
          </button>
          <button
            onClick={() => {
              if (!confirmErase) {
                setConfirmErase(true);
                window.setTimeout(() => setConfirmErase(false), 3200);
              } else {
                eraseAll();
                setConfirmErase(false);
              }
            }}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-semibold transition ${
              confirmErase
                ? "border-rose-400/60 bg-rose-400/15 text-rose-600 dark:text-rose-300"
                : "border-zinc-200 text-zinc-600 hover:border-rose-400/40 hover:text-rose-600 dark:border-white/10 dark:text-zinc-500 dark:hover:text-rose-300"
            }`}
          >
            <Trash2 size={12.5} />
            {confirmErase ? "Sure?" : "Erase"}
          </button>
        </div>
      </div>
    </section>
  );
}
