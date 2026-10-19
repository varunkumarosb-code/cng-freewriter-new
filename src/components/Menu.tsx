import { useEffect, useRef, useState, type ReactNode } from "react";

interface MenuProps {
  /** Render-prop trigger; call `toggle` from your button. */
  children: (controls: { toggle: () => void; open: boolean }) => ReactNode;
  /** Panel content; call `close` after an action. */
  panel: (close: () => void) => ReactNode;
  align?: "start" | "end";
  panelClassName?: string;
}

/** Lightweight dropdown: outside-click + Escape to close, pop animation. */
export function Menu({ children, panel, align = "end", panelClassName = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: MouseEvent) => {
      try {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
      } catch {}
    };
    const onKey = (e: KeyboardEvent) => {
      try { if (e.key === "Escape") setOpen(false); } catch {}
    };
    try {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("keydown", onKey);
    } catch {}
    return () => {
      try { document.removeEventListener("mousedown", onPointerDown); } catch {}
      try { document.removeEventListener("keydown", onKey); } catch {}
    };
  }, [open]);

  const close = () => {
    try { setOpen(false); } catch {}
  };
  const toggle = () => {
    try { setOpen((v) => !v); } catch {}
  };

  return (
    <div ref={rootRef} className="relative">
      {children({ toggle, open })}
      {open && (
        <div
          className={`absolute ${align === "end" ? "right-0" : "left-0"} top-[calc(100%+8px)] z-50 min-w-[248px] origin-top animate-menu rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-white/[0.08] dark:bg-night-850/[0.97] dark:shadow-[0_28px_70px_-16px_rgba(0,0,0,0.85)] ${panelClassName}`}
        >
          {panel(close)}
        </div>
      )}
    </div>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1.5 pt-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-600">
      {children}
    </p>
  );
}

export function MenuDivider() {
  return <div className="mx-2 my-1.5 h-px bg-zinc-200 dark:bg-white/[0.06]" />;
}
