import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useLibrary, type ToastType } from "../state/LibraryContext";

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const ACCENTS: Record<ToastType, string> = {
  success: "text-emerald-600 bg-emerald-400/10 border-emerald-400/25 dark:text-emerald-300 dark:border-emerald-400/20",
  error: "text-rose-600 bg-rose-400/10 border-rose-400/25 dark:text-rose-300",
  info: "text-ember-600 bg-ember-400/10 border-ember-400/25 dark:text-ember-300",
};

/** Fixed toast stack — success / error reports for exports & imports. */
export function ToastStack() {
  const { toasts, dismissToast } = useLibrary();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(92vw,370px)] flex-col gap-2.5"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto animate-toast-in rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xl backdrop-blur-md dark:border-white/[0.08] dark:bg-night-850/95 dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${ACCENTS[toast.type]}`}
              >
                <Icon size={14} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-zinc-500">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
