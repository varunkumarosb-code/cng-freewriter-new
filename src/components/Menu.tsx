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
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      {children({ toggle: () => setOpen((v) => !v), open })}
      {open && (
        <div
          className={`absolute ${align === "end" ? "right-0" : "left-0"} top-[calc(100%+8px)] z-50 min-w-[248px] origin-top animate-menu rounded-xl border border-white/[0.08] bg-night-850/[0.97] p-1.5 shadow-[0_28px_70px_-16px_rgba(0,0,0,0.85)] backdrop-blur-md ${panelClassName}`}
        >
          {panel(close)}
        </div>
      )}
    </div>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1.5 pt-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-zinc-600">
      {children}
    </p>
  );
}

export function MenuDivider() {
  return <div className="mx-2 my-1.5 h-px bg-white/[0.06]" />;
}
