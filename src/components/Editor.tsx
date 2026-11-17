import { ChevronLeft, Download, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { countWords, formatDate, readingMinutes } from "../lib/format";
import { getEffectiveShelfName } from "../lib/storage";
import { downloadFile, slugify, storyToMarkdown, storyToPlainText, stripMarkdown } from "../lib/backup";
import { useLibrary } from "../state/LibraryContext";

interface Props { storyId: string | null; onBack: () => void; }

export function Editor({ storyId, onBack }: Props) {
  const { stories, categories, updateStory, deleteStory, setStoryCategory } = useLibrary();
  const story = (() => {
    const safeId = (storyId && typeof storyId === "string") ? storyId : "";
    if (!safeId) return null;
    try { return stories.find((s) => s.id === safeId) ?? null; } catch { return null; }
  })();

  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const curTitle = (story?.title && typeof story.title === "string") ? story.title : "";
  const curContent = (story?.content && typeof story.content === "string") ? story.content : "";
  const [localTitle, setLocalTitle] = useState(curTitle);
  const [localContent, setLocalContent] = useState(curContent);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  const idRef = useRef<string | null | undefined>(undefined);
  const draftTitleRef = useRef<string>(curTitle);
  const draftContentRef = useRef<string>(curContent);
  const timerRef = useRef<number | null>(null);
  const savingTimerRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const titleTaRef = useRef<HTMLTextAreaElement | null>(null);

  // reset when story switches
  useEffect(() => {
    if (!story || typeof story !== "object") return;
    const safeId = (story.id && typeof story.id === "string") ? story.id : "";
    if (idRef.current !== safeId) {
      idRef.current = safeId;
      const t = (story.title && typeof story.title === "string") ? story.title : "";
      const c = (story.content && typeof story.content === "string") ? story.content : "";
      draftTitleRef.current = t;
      draftContentRef.current = c;
      try { setLocalTitle(t); } catch {}
      try { setLocalContent(c); } catch {}
      try { setSaveState("saved"); } catch {}
      if (timerRef.current !== null) { try { window.clearTimeout(timerRef.current); } catch {} timerRef.current = null; }
    }
    return () => {};
  }, [story]);

  // external cloud update sync (if not actively debouncing)
  useEffect(() => {
    const s = story;
    if (!s || typeof s !== "object") return;
    const safeId = (s.id && typeof s.id === "string") ? s.id : "";
    if (safeId !== idRef.current) return;
    const st = (s.title && typeof s.title === "string") ? s.title : "";
    const sc = (s.content && typeof s.content === "string") ? s.content : "";
    if (st !== draftTitleRef.current || sc !== draftContentRef.current) {
      if (timerRef.current === null) {
        draftTitleRef.current = st;
        draftContentRef.current = sc;
        try { setLocalTitle(st); } catch {}
        try { setLocalContent(sc); } catch {}
      }
    }
    return () => {};
  }, [story?.title, story?.content]);

  useEffect(() => {
    const handleOutside = (ev: MouseEvent) => {
      try {
        const target = ev.target as Node | null;
        if (menuRef.current && target && !menuRef.current.contains(target)) setExportOpen(false);
      } catch {}
    };
    if (exportOpen) document.addEventListener("mousedown", handleOutside);
    return () => { try { document.removeEventListener("mousedown", handleOutside); } catch {} };
  }, [exportOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) { try { window.clearTimeout(timerRef.current); } catch {} timerRef.current = null; }
      if (savingTimerRef.current !== null) { try { window.clearTimeout(savingTimerRef.current); } catch {} savingTimerRef.current = null; }
    };
  }, []);

  // auto-resize helper
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    try { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } catch {}
  };
  useEffect(() => { autoResize(taRef.current); return () => {}; }, [localContent]);
  useEffect(() => { autoResize(titleTaRef.current); return () => {}; }, [localTitle]);

  function scheduleSave(nextTitle: string, nextContent: string) {
    const safeTitle = (nextTitle && typeof nextTitle === "string") ? nextTitle : "";
    const safeContent = (nextContent && typeof nextContent === "string") ? nextContent : "";
    const id = story && typeof story === "object" && typeof story.id === "string" ? story.id : "";
    if (!id) return;
    try { setSaveState("saving"); } catch {}
    if (timerRef.current !== null) { try { window.clearTimeout(timerRef.current); } catch {} timerRef.current = null; }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      try { updateStory(id, { title: safeTitle, content: safeContent }); } catch {}
      try {
        if (savingTimerRef.current !== null) window.clearTimeout(savingTimerRef.current);
        savingTimerRef.current = window.setTimeout(() => { try { setSaveState("saved"); } catch {} savingTimerRef.current = null; }, 600);
      } catch {}
    }, 200);
  }

  function onChangeTitle(v: string) {
    const safe = (v && typeof v === "string") ? v : "";
    try {
      draftTitleRef.current = safe;
      setLocalTitle(safe);
      scheduleSave(safe, draftContentRef.current);
      autoResize(titleTaRef.current);
    } catch {}
  }
  function onChangeContent(v: string) {
    const safe = (v && typeof v === "string") ? v : "";
    try {
      draftContentRef.current = safe;
      setLocalContent(safe);
      scheduleSave(draftTitleRef.current, safe);
      autoResize(taRef.current);
    } catch {}
  }

  function flushNow() {
    if (timerRef.current !== null) { try { window.clearTimeout(timerRef.current); } catch {} timerRef.current = null; }
    const id = story && typeof story === "object" && typeof story.id === "string" ? story.id : "";
    if (!id) return;
    const t = (draftTitleRef.current && typeof draftTitleRef.current === "string") ? draftTitleRef.current : "";
    const c = (draftContentRef.current && typeof draftContentRef.current === "string") ? draftContentRef.current : "";
    try { updateStory(id, { title: t, content: c }); } catch {}
    try { setSaveState("saved"); } catch {}
  }

  function doExport(kind: "md" | "txt" | "pdf") {
    if (!story || typeof story !== "object") return;
    try { setExportOpen(false); } catch {}
    try {
      const shelf = getEffectiveShelfName(story, categories);
      const safeTitle = (story.title && typeof story.title === "string") ? story.title : "untitled";
      const slug = slugify(safeTitle || (stripMarkdown(story.content).slice(0, 32) || "untitled"));
      if (kind === "md") { downloadFile(`${slug}.md`, storyToMarkdown(story, shelf), "text/markdown"); return; }
      if (kind === "txt") { downloadFile(`${slug}.txt`, storyToPlainText(story, shelf), "text/plain"); return; }
      const w = window.open("", "_blank");
      if (!w) return;
      const plain = storyToPlainText(story, shelf);
      const safePlain = (plain && typeof plain === "string") ? plain : "";
      const esc = safePlain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
      const titleSafe = (safeTitle && typeof safeTitle === "string") ? safeTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "Untitled";
      const sShelf = (shelf && typeof shelf === "string") ? shelf : "Unshelved";
      w.document.write(`<!doctype html><title>${titleSafe}</title><meta charset="utf-8"><style>@media print{@page{margin:18mm}} body{font-family:ui-serif,Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#18181b} h1{font-size:28px;margin:0 0 8px} .meta{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin-bottom:16px} hr{border:none;border-top:1px solid #e4e4e7;margin:16px 0} pre{white-space:pre-wrap;font-family:inherit;font-size:15px;line-height:1.7}</style><h1>${titleSafe}</h1><div class="meta">${sShelf} · ${countWords(safePlain).toLocaleString()} words · ${formatDate(story.updatedAt)}</div><hr/><pre>${esc}</pre>`);
      w.document.close(); w.focus();
      w.setTimeout(() => { try { w.print(); } catch {} }, 320);
    } catch {}
  }

  if (!story || typeof story !== "object") {
    return (
      <div className="mx-auto grid max-w-6xl place-items-center px-5 py-16 bg-zinc-50 dark:bg-night-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Story not found — it may have been deleted.</p>
        <button onClick={() => { try { onBack(); } catch {} }} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] bg-zinc-50 dark:bg-night-950">Go back</button>
      </div>
    );
  }

  const words = countWords(localContent);
  const chars = (localContent && typeof localContent === "string") ? localContent.length : 0;
  const read = readingMinutes(localContent);
  const shelfName = getEffectiveShelfName(story, categories);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-night-950">
      {/* Fixed Top Nav */}
      <div className="sticky top-16 z-30 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-night-950/80 bg-zinc-50 dark:bg-night-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => { try { flushNow(); const a = document.activeElement as HTMLElement | null; try { a?.blur?.(); } catch {} window.setTimeout(() => { try { onBack(); } catch {} }, 0); } catch {} }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[13px] font-medium text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 bg-zinc-50 dark:bg-night-950">
              <ChevronLeft size={14} /> Shelf
            </button>
            <span className={`ml-1 hidden sm:inline-flex items-center gap-1 font-mono text-[11px] ${saveState === "saving" ? "text-amber-600 dark:text-amber-300" : "text-zinc-400 dark:text-zinc-500"} bg-zinc-50 dark:bg-night-950`}>
              <Save size={12} className={saveState === "saving" ? "animate-pulse" : ""} /> {saveState === "saving" ? "Saving..." : "Saved"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select value={(story.categoryId && typeof story.categoryId === "string") ? story.categoryId : ""} onChange={(e) => { try { const v = (e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : ""; setStoryCategory(story.id, v); } catch {} }} className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-[13px] text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 bg-zinc-50 dark:bg-night-950" title="Move to shelf">
              <option value="">Unshelved</option>
              {categories.map((c) => {
                const safeName = (c.name && typeof c.name === "string") ? c.name : "";
                const safeId = (c.id && typeof c.id === "string") ? c.id : "";
                return <option key={safeId} value={safeId}>{safeName}</option>;
              })}
            </select>
            <div ref={menuRef} className="relative">
              <button onClick={() => { try { setExportOpen((v) => !v); } catch {} }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 bg-zinc-50 dark:bg-night-950">
                <Download size={14} /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-zinc-900 bg-zinc-50 dark:bg-night-950">
                  <button onClick={() => doExport("md")} className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/10 bg-zinc-50 dark:bg-night-950">Markdown (.md)</button>
                  <button onClick={() => doExport("txt")} className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/10 bg-zinc-50 dark:bg-night-950">Plain text (.txt)</button>
                  <button onClick={() => doExport("pdf")} className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/10 bg-zinc-50 dark:bg-night-950">Print / PDF</button>
                </div>
              )}
            </div>
            <button onClick={() => { try { deleteStory(story.id); onBack(); } catch {} }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-red-600 hover:bg-red-600 hover:text-white dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 bg-zinc-50 dark:bg-night-950">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8 bg-zinc-50 dark:bg-night-950">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.02] bg-zinc-50 dark:bg-night-950">
          <textarea
            ref={titleTaRef}
            value={localTitle}
            onChange={(e) => onChangeTitle((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : "")}
            onBlur={() => { try { flushNow(); } catch {} }}
            placeholder="Untitled story"
            rows={1}
            className="w-full resize-none overflow-hidden bg-transparent font-serif text-[28px] font-semibold leading-tight tracking-tight text-zinc-900 outline-none placeholder:text-zinc-300 dark:text-zinc-100 dark:placeholder:text-zinc-600 bg-zinc-50 dark:bg-night-950"
          />
          <div className="mt-2 font-mono text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-night-950">{shelfName} · Last edited {formatDate(story.updatedAt)}</div>
          <div className="mt-4 h-px bg-zinc-200 dark:bg-white/10" />
          <textarea
            ref={taRef}
            value={localContent}
            onChange={(e) => onChangeContent((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : "")}
            onBlur={() => { try { flushNow(); } catch {} }}
            placeholder="Begin writing…"
            rows={12}
            className="mt-6 min-h-[420px] w-full resize-none overflow-hidden bg-transparent text-[16px] leading-7 text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 bg-zinc-50 dark:bg-night-950"
          />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02] bg-zinc-50 dark:bg-night-950">
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-night-950">{words.toLocaleString()} words · {chars.toLocaleString()} chars · {read} min reading</span>
            <span className={`font-mono text-[11px] ${saveState === "saving" ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"} bg-zinc-50 dark:bg-night-950`}>{saveState === "saving" ? "Saving…" : "Saved"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
