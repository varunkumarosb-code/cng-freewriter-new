import { Braces, ChevronDown, Download, FileText } from "lucide-react";
import type { Story } from "../lib/types";
import { useLibrary } from "../state/LibraryContext";
import { Menu, MenuDivider, MenuLabel } from "./Menu";

interface ExportMenuProps {
  story: Story;
}

/**
 * Feature 3 — in-editor export dropdown.
 * Downloads the current manuscript as Plain Text (.txt) or Markdown (.md),
 * plus a shortcut to the full-library JSON backup (Feature 1).
 */
export function ExportMenu({ story }: ExportMenuProps) {
  const { exportSingle, exportAll } = useLibrary();

  const item =
    "group flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-white/[0.05]";

  return (
    <Menu
      align="end"
      panel={(close) => (
        <>
          <MenuLabel>
          Export “{(story.title || "Untitled").slice(0, 22)}{(story.title || "").length > 22 ? "…" : ""}”
          </MenuLabel>

          <button
            className={item}
            onClick={() => {
              exportSingle(story, "txt");
              close();
            }}
          >
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition group-hover:border-ember-400/30 group-hover:text-ember-300">
              <FileText size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-zinc-200">
                Plain Text <span className="font-mono text-[10.5px] text-zinc-500">.txt</span>
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-zinc-500">
                Clean reading copy — Markdown styling stripped.
              </span>
            </span>
          </button>

          <button
            className={item}
            onClick={() => {
              exportSingle(story, "md");
              close();
            }}
          >
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition group-hover:border-ember-400/30 group-hover:text-ember-300">
              <Braces size={14} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-zinc-200">
                Markdown <span className="font-mono text-[10.5px] text-zinc-500">.md</span>
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-zinc-500">
                Source with headings, emphasis &amp; byline intact.
              </span>
            </span>
          </button>

          <MenuDivider />
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
            onClick={() => {
              exportAll();
              close();
            }}
          >
            <Download size={13} className="shrink-0" />
            Full library backup
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-ember-300/70">
              .json
            </span>
          </button>
        </>
      )}
    >
      {({ toggle, open }) => (
        <button
          onClick={toggle}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-ember-400/30 bg-ember-400/[0.08] px-3 text-[13px] font-semibold text-ember-300 transition hover:border-ember-400/50 hover:bg-ember-400/[0.14]"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </Menu>
  );
}
