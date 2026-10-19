import { useRef, useState, type ChangeEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { useLibrary } from "../state/LibraryContext";

/**
 * Feature 2 — "Import Backup (.json)" trigger.
 * A hidden file input + button; hands the file to
 * `importBackup()` which validates, merges and toasts the result.
 */
export function ImportButton({ compact = false }: { compact?: boolean }) {
  const { importBackup } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    importBackup(file).finally(() => {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // allow re-picking same file
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Restore from a CnG Writer backup (.json)"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-[13px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-100"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        <span className={compact ? "hidden" : "hidden sm:inline"}>Import</span>
      </button>
    </>
  );
}
