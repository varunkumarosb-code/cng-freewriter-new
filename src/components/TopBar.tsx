import { Moon, PenLine, Plus, Settings2, Sun } from "lucide-react";
import type { ConnStatus } from "../lib/model";

interface Props {
  status: ConnStatus;
  statusDetail: string;
  authUser: string;
  onNew: () => void;
  onOpenSettings: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

const STATUS_META: Record<
  ConnStatus,
  { dot: string; label: string; ring: string }
> = {
  local: {
    dot: "bg-zinc-400",
    label: "Local mode",
    ring: "border-zinc-300/70 dark:border-white/10",
  },
  connecting: {
    dot: "bg-amber-400 lw-pulse-dot",
    label: "Connecting",
    ring: "border-amber-500/40",
  },
  connected: {
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    label: "PocketBase synced",
    ring: "border-emerald-500/40",
  },
  error: {
    dot: "bg-red-400",
    label: "Offline",
    ring: "border-red-500/40",
  },
};

export default function TopBar({
  status,
  statusDetail,
  authUser,
  onNew,
  onOpenSettings,
  theme,
  onToggleTheme,
}: Props) {
  const meta = STATUS_META[status];
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900/[0.07] bg-[#f6f3ee]/85 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#09090b]/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* wordmark */}
        <div className="flex items-center gap-2.5" title="CnG Writer">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_12px_rgba(245,158,11,0.35)]">
            <PenLine className="h-4 w-4 text-zinc-950" strokeWidth={2.4} />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            CnG Writer
          </span>
          <span className="hidden rounded-md border border-zinc-900/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:inline-block dark:border-white/10 dark:text-zinc-500">
            Ad-Free
          </span>
        </div>

        <div className="flex-1" />

        {/* connection status */}
        <button
          onClick={onOpenSettings}
          title={`${statusDetail}${authUser ? ` — ${authUser}` : ""}. Click to configure PocketBase.`}
          className={`group flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1.5 transition hover:bg-white dark:bg-white/[0.04] dark:hover:bg-white/[0.08] ${meta.ring}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          <span className="hidden font-mono text-[11px] text-zinc-500 group-hover:text-zinc-700 md:inline dark:text-zinc-400 dark:group-hover:text-zinc-200">
            {meta.label}
          </span>
          {status === "connected" && authUser && (
            <span className="hidden max-w-32 truncate font-mono text-[11px] text-zinc-400 lg:inline dark:text-zinc-500">
              {authUser}
            </span>
          )}
        </button>

        <button
          className="lw-btn-icon"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <button
          className="lw-btn-icon"
          onClick={onOpenSettings}
          title="PocketBase & data settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>

        <span className="hidden h-6 w-px bg-zinc-900/10 sm:block dark:bg-white/10" />

        <button onClick={onNew} className="lw-btn-primary" title="New story (N)">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          <span className="hidden sm:inline">New Story</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
}
