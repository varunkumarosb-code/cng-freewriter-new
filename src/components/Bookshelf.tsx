import { useEffect, useMemo, useState } from "react";
import { Sparkles, Search, Filter, Trash2 } from "lucide-react";
import type { Category, Story } from "../types";
import { countWords, formatDate, timeAgo } from "../lib/format";
import { getEffectiveShelfName, getShelfCount, isDeletableCategory } from "../lib/storage";

interface BookshelfProps {
  stories: Story[];
  categories: Category[];
  onSelectStory: (id: string) => void;
  onCreateStory: () => void;
  onDeleteStory: (id: string) => void;
}

export function Bookshelf({ stories, categories, onSelectStory, onCreateStory, onDeleteStory }: BookshelfProps) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string>("all");

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "";
    return () => {};
  }, []);

  const shelves = useMemo(() => {
    const base = [{ id: "all", name: "All stories" }];
    return [...base, ...categories.map(c => ({ id: c.id, name: c.name }))];
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return stories.filter(s => {
      const shelfName = getEffectiveShelfName(s, categories);
      const displayShelf = shelfName.toLowerCase();
      const catMatch = active === "all" || displayShelf === active.toLowerCase() || s.categoryId === active;
      const textMatch = !q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || displayShelf.includes(q);
      return catMatch && textMatch;
    });
  }, [stories, categories, active, search]);

  const countAll = stories.length;

  return (
    <div className="mx-auto max-w-6xl px-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 py-6 dark:border-white/[0.06]">
        <div className="flex gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ember-400 to-orange-400 text-ember-50 shadow-[0_8px_20px_-12px_rgba(251,146,60,0.7)]">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="font-serif text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">Your library</h2>
            <p className="max-w-[52ch] text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
              Stories live offline on this device and sync when cloud is connected. Tap a story card to continue writing.
            </p>
            <p className="mt-2 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{countAll} {countAll === 1 ? "story" : "stories"}</p>
          </div>
        </div>
        <div className="max-w-[340px] text-left sm:text-right">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">CnG Writing Guide</p>
          <ol className="mt-2 list-decimal pl-4 text-left text-[13px] leading-6 text-zinc-600 marker:text-zinc-400 dark:text-zinc-400 sm:list-none sm:pl-0">
            <li>1. Pick a story or start a new one.</li>
            <li>2. Write freely — changes save automatically.</li>
            <li>3. Add chapters as new stories in the same shelf.</li>
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 py-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => { const v = e.currentTarget.value; try { setSearch(v); } catch {} }}
            placeholder="Filter by title, text, or shelf…"
            className="h-9 rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 focus:border-ember-400/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100"
          />
        </div>
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-zinc-200 p-1 dark:border-white/10">
          <Filter size={13} className="ml-2 mr-0.5 text-zinc-400" />
          {shelves.map(s => {
            const isActive = active === s.id || (active === "all" && s.id === "all");
            const count = s.id === "all" ? countAll : getShelfCount(stories, s.id);
            return (
              <button
                key={s.id}
                onClick={() => { try { if (typeof setActive === 'function') setActive(s.id); } catch {} }}
                className={`px-3.5 py-1.5 text-[13px] font-medium transition whitespace-nowrap ${isActive ? "rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
              >
                {s.name} <span className="ml-1 font-mono text-[11px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { try { if (typeof onCreateStory === 'function') onCreateStory(); } catch {} }}
          className="ml-auto inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-black/[0.03] px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-white/20"
        >
          Start writing
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-200 bg-black/[0.01] px-6 py-14 dark:border-white/10">
          <p className="max-w-[42ch] text-center text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            No stories match. Clear the search, switch shelf, or start a new draft — it will appear here right after the first save.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => {
            const words = countWords(s.content);
            const shelfName = getEffectiveShelfName(s, categories);
            const isDeletable = s.categoryId ? isDeletableCategory(categories, s.categoryId) : false;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  try { if (typeof onSelectStory === 'function') onSelectStory(s.id); } catch {}
                }}
                className={`group relative flex min-h-[200px] flex-col rounded-2xl border px-5 pb-4 pt-5 text-left shadow-sm transition ${
                  isDeletable
                    ? "border-red-200 bg-red-50/40 dark:border-red-900/30 dark:bg-red-950/10"
                    : "border-zinc-200 bg-white dark:border-white/[0.07] dark:bg-white/[0.02]"
                } hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 pr-2 font-serif text-[17px] font-semibold leading-6 tracking-tight text-zinc-800 dark:text-zinc-100">
                    {s.title || "Untitled"}
                  </span>
                  {isDeletable && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-900/30 dark:text-red-300">Deletable</span>
                  )}
                </div>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-widest text-ember-600 dark:text-ember-300">{shelfName}</span>
                <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-zinc-500 dark:text-zinc-400">{(s.content || "No content yet — tap to start writing.").slice(0, 220)}</p>
                <div className="mt-auto flex items-center justify-between pt-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
                  <span>{words.toLocaleString()} words</span>
                  <span className="flex items-center gap-2">
                    <span className="hidden sm:inline" title={formatDate(s.updatedAt)}>{timeAgo(s.updatedAt)} · {formatDate(s.updatedAt)}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => {
                        try { e.stopPropagation(); if (typeof onDeleteStory === 'function') onDeleteStory(s.id); } catch {}
                      }}
                      onKeyDown={e => {
                        try {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (typeof onDeleteStory === 'function') onDeleteStory(s.id); }
                        } catch {}
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${isDeletable ? "border-red-200 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-800 dark:text-red-300" : "border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-zinc-500"}`}
                      title={isDeletable ? "Delete this story" : "Delete"}
                    >
                      <Trash2 size={13} />
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
