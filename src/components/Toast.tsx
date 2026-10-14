import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useLibrary, type ToastType } from "../state/LibraryContext";

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const ACCENTS: Record<ToastType, string> = {
  success: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  error: "text-rose-300 bg-rose-400/10 border-rose-400/25",
  info: "text-ember-300 bg-ember-400/10 border-ember-400/25",
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
            className="pointer-events-auto animate-toast-in rounded-xl border border-white/[0.08] bg-night-850/95 p-3.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)] backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${ACCENTS[toast.type]}`}
              >
                <Icon size={14} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight text-zinc-100">
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
                className="rounded-md p-1 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-300"
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
