import { useEffect, useRef, useState } from "react";
import { ChevronLeft, PenLine, Trash2, Download, Save } from "lucide-react";
import type { Category, Story } from "../types";
import { countWords, formatDate, readingMinutes } from "../lib/format";
import { getEffectiveShelfName, isDeletableCategory } from "../lib/storage";
import { stripMarkdown, storyToMarkdown, storyToPlainText, slugify, downloadFile } from "../lib/backup";

interface EditorProps {
  story: Story | null | undefined;
  categories: Category[];
  onBack: () => void;
  onUpdateStory: (id: string, patch: Partial<Story>) => void;
  onDeleteStory: (id: string) => void;
}

export function Editor({ story, categories, onBack, onUpdateStory, onDeleteStory }: EditorProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const curTitle = (story?.title ?? "").toString();
  const curContent = (story?.content ?? "").toString();
  const [localTitle, setLocalTitle] = useState<string>(curTitle);
  const [localContent, setLocalContent] = useState<string>(curContent);

  const idRef = useRef<string | null | undefined>(undefined);
  const draftTitleRef = useRef<string>(curTitle);
  const draftContentRef = useRef<string>(curContent);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!story) return;
    if (idRef.current !== story.id) {
      idRef.current = story.id;
      const t = (story.title ?? "").toString();
      const c = (story.content ?? "").toString();
      draftTitleRef.current = t;
      draftContentRef.current = c;
      try { setLocalTitle(t); } catch {}
      try { setLocalContent(c); } catch {}
      if (timerRef.current !== null) {
        try { window.clearTimeout(timerRef.current); } catch (e) { console.warn("Cleanup error guarded:", e); }
        timerRef.current = null;
      }
    }
    return () => {};
  }, [story?.id]);

  useEffect(() => {
    const s = story;
    if (!s) return;
    if (s.id !== idRef.current) return;
    const st = (s.title ?? "").toString();
    const sc = (s.content ?? "").toString();
    if (st !== draftTitleRef.current || sc !== draftContentRef.current) {
      draftTitleRef.current = st;
      draftContentRef.current = sc;
      try { setLocalTitle(st); } catch {}
      try { setLocalContent(sc); } catch {}
    }
    return () => {};
  }, [story?.title, story?.content, story?.id]);

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      try {
        const target = ev.target as Node | null;
        if (menuRef.current && target && !menuRef.current.contains(target)) setExportOpen(false);
      } catch {}
    };
    if (exportOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => {
      try { document.removeEventListener('mousedown', handleClickOutside); } catch (e) { console.warn("Cleanup error guarded:", e); }
    };
  }, [exportOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        try { window.clearTimeout(timerRef.current); } catch (e) { console.warn("Cleanup error guarded:", e); }
        timerRef.current = null;
      }
    };
  }, []);

  function scheduleSave(nextTitle: string, nextContent: string) {
    const id = story?.id;
    if (!id) return;
    if (timerRef.current !== null) {
      try { window.clearTimeout(timerRef.current); } catch {}
      timerRef.current = null;
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      try { if (typeof onUpdateStory === 'function') onUpdateStory(id, { title: nextTitle, content: nextContent }); } catch {}
    }, 200);
  }

  function onChangeTitle(v: string) {
    try {
      draftTitleRef.current = v;
      setLocalTitle(v);
      scheduleSave(v, draftContentRef.current);
    } catch {}
  }

  function onChangeContent(v: string) {
    try {
      draftContentRef.current = v;
      setLocalContent(v);
      scheduleSave(draftTitleRef.current, v);
    } catch {}
  }

  function flushNow() {
    if (timerRef.current !== null) {
      try { window.clearTimeout(timerRef.current); } catch {}
      timerRef.current = null;
    }
    const id = story?.id;
    if (!id) return;
    try { if (typeof onUpdateStory === 'function') onUpdateStory(id, { title: draftTitleRef.current, content: draftContentRef.current }); } catch {}
  }

  function doExport(kind: 'md' | 'txt' | 'pdf') {
    if (!story) return;
    try { setExportOpen(false); } catch {}
    try {
      const shelf = getEffectiveShelfName(story, categories);
      const slug = slugify(story.title || (stripMarkdown(story.content).slice(0, 32) || 'untitled'));
      if (kind === 'md') {
        downloadFile(`${slug}.md`, storyToMarkdown(story, shelf), "text/markdown");
        return;
      }
      if (kind === 'txt') {
        downloadFile(`${slug}.txt`, storyToPlainText(story, shelf), "text/plain");
        return;
      }
      const w = window.open("", "_blank");
      if (!w) return;
      const plain = storyToPlainText(story, shelf).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>");
      const titleSafe = (story.title || "Untitled").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      w.document.write(`<!doctype html><title>${titleSafe}</title><meta charset="utf-8"><style>@media print{@page{margin:18mm}} body{font-family:ui-serif,Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#18181b} h1{font-size:28px;margin:0 0 8px} .meta{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin-bottom:16px} hr{border:none;border-top:1px solid #e4e4e7;margin:16px 0} pre{white-space:pre-wrap;font-family:inherit;font-size:15px;line-height:1.7}</style><h1>${titleSafe}</h1><div class="meta">${shelf} · ${countWords(story.content).toLocaleString()} words · ${formatDate(story.updatedAt)}</div><hr/><pre>${plain}</pre>`);
      w.document.close();
      w.focus();
      w.setTimeout(() => { try { w.print(); } catch {} }, 320);
    } catch {}
  }

  if (!story) {
    return (
      <div className="mx-auto grid max-w-6xl place-items-center px-5 py-16">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Story not found.</p>
        <button onClick={() => { try { if (typeof onBack === 'function') onBack(); } catch {} }} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm dark:border-white/10">Go back</button>
      </div>
    );
  }

  const words = countWords(localContent);
  const chars = localContent.length;
  const read = readingMinutes(localContent);
  const shelfName = getEffectiveShelfName(story, categories);
  const isDeletable = isDeletableCategory(categories, story.categoryId);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="sticky top-16 z-30 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-night-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => {
                try {
                  flushNow();
                  if (typeof onBack === 'function') {
                    const active = document.activeElement as HTMLElement | null;
                    try { active?.blur?.(); } catch {}
                    try {
                      if (active && active instanceof HTMLElement && typeof active.blur === "function") {
                        (active as HTMLElement).blur();
                      }
                    } catch (e) { console.warn("Cleanup error guarded:", e); }
                    window.setTimeout(() => {
                      try { if (typeof onBack === 'function') onBack(); } catch {}
                    }, 0);
                  }
                } catch {}
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[13px] font-medium text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            >
              <ChevronLeft size={14} />
              Bookshelf
            </button>
            <span className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 sm:inline-flex">
              <PenLine size={12} /> {shelfName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 font-mono text-[11px] text-zinc-400 dark:text-zinc-500 sm:inline-flex"><Save size={12}/> Autosaves</span>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => { try { setExportOpen(v => !v); } catch {} }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
              >
                <Download size={14}/> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-zinc-900">
                  <button onClick={() => doExport('md')} className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/10">Markdown (.md)</button>
                  <button onClick={() => doExport('txt')} className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/10">Plain text (.txt)</button>
                  <button onClick={() => doExport('pdf')} className="flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/10">Print / PDF</button>
                </div>
              )}
            </div>
            {isDeletable && (
              <button
                onClick={() => { try { if (typeof onDeleteStory === 'function') onDeleteStory(story.id); } catch {} }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-red-600 hover:bg-red-600 hover:text-white dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
              >
                <Trash2 size={14}/> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.02]">
          <input
            ref={titleRef}
            value={localTitle}
            onChange={e => onChangeTitle(e.currentTarget.value)}
            onBlur={() => { try { flushNow(); } catch {} }}
            placeholder="Untitled story"
            className="w-full bg-transparent font-serif text-[28px] font-semibold leading-tight tracking-tight text-zinc-900 outline-none placeholder:text-zinc-300 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
            <span>{words.toLocaleString()} words</span>
            <span>·</span>
            <span>{chars.toLocaleString()} chars</span>
            <span>·</span>
            <span>{read} min read</span>
            <span>·</span>
            <span>Last edited {formatDate(story.updatedAt)}</span>
          </div>
          <div className="mt-4 h-px bg-zinc-200 dark:bg-white/10" />
          <textarea
            value={localContent}
            onChange={e => onChangeContent(e.currentTarget.value)}
            onBlur={() => { try { flushNow(); } catch {} }}
            placeholder="Begin writing…"
            rows={18}
            className="mt-6 min-h-[420px] w-full resize-y bg-transparent text-[16px] leading-7 text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
        <p className="mx-auto mt-3 max-w-[60ch] text-center font-mono text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">Tip: paste long drafts — autosave debounces every 200 ms. Use Export for shareable copies without leaving the editor.</p>
      </div>
    </div>
  );
}
