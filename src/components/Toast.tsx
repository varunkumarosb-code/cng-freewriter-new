import { useLibrary } from "../state/LibraryContext";

export function Toast() {
  const { toasts, dismissToast } = useLibrary();
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => {
        const tone = (t.tone && typeof t.tone === "string") ? t.tone : "ok";
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto min-w-[220px] max-w-[360px] rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur animate-toast-in bg-white dark:bg-zinc-900 transition-all duration-300 ${
                tone === "error" ? "border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : tone === "info" ? "border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                : "border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="leading-5">{t.message || ""}</span>
              <button onClick={() => { try { dismissToast(t.id); } catch {} }} className="shrink-0 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/10 px-2 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 transition-all duration-300">Dismiss</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
