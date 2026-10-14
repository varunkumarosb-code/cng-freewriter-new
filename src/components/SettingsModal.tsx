import { useEffect } from "react";
import { X } from "lucide-react";
import { useLibrary } from "../state/LibraryContext";
import { BackupPanel } from "./BackupPanel";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useLibrary();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
      />
      <div className="relative max-h-[86vh] w-full max-w-lg animate-rise overflow-y-auto rounded-2xl border border-white/[0.08] bg-night-900 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[26px] font-semibold text-zinc-50">Settings</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Pen name */}
          <div className="space-y-2">
            <label
              htmlFor="pen-name"
              className="block font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-zinc-600"
            >
              Pen name
            </label>
            <input
              id="pen-name"
              value={settings.writerName}
              onChange={(e) => updateSettings({ writerName: e.target.value })}
              placeholder="Writer"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-ember-400/50 focus:outline-none"
            />
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Feature 1 + 2 live here */}
          <BackupPanel />

          <div className="flex items-center justify-between border-t border-white/[0.05] pt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">
            <span>CnG Writer · v1.0</span>
            <span>backups are portable JSON</span>
          </div>
        </div>
      </div>
    </div>
  );
}
