import { Filter, Search, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { countWords, formatDate, timeAgo } from "../lib/format";
import { getEffectiveShelfName, getShelfCount } from "../lib/storage";
import { useLibrary } from "../state/LibraryContext";

interface Props { onSelectStory: (id: string) => void; }

export function Bookshelf({ onSelectStory }: Props) {
  const { stories, categories, deleteStory, createStory } = useLibrary();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("All");

  useEffect(() => { try { document.documentElement.style.scrollBehavior = ""; } catch {} return () => {}; }, []);

  const shelves = useMemo(() => {
    const custom = categories.map((c) => c.name);
    return ["All", "Unshelved", ...custom];
  }, [categories]);

  const filtered = useMemo(() => {
    const q = (search && typeof search === "string") ? search.toLowerCase().trim() : "";
    return stories.filter((s) => {
      const safeTitle = (s.title && typeof s.title === "string") ? s.title : "";
      const safeContent = (s.content && typeof s.content === "string") ? s.content : "";
      const shelfName = getEffectiveShelfName(s, categories) || "Unshelved";
      const catMatch = active === "All" || shelfName === active;
      const hay = `${safeTitle} ${safeContent} ${shelfName}`.toLowerCase();
      const textMatch = !q || hay.includes(q);
      return catMatch && textMatch;
    });
  }, [stories, categories, active, search]);

  return (
    <div className="mx-auto max-w-6xl px-5 bg-[#fcfaf7] dark:bg-[#0d0d0d] transition-all duration-300">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 py-6 transition-all duration-300">
        <div className="flex gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-500 text-white shadow-sm transition-all duration-300">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="font-serif text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 transition-all duration-300">Your library</h2>
            <p className="max-w-[52ch] text-[13px] leading-5 text-zinc-500 dark:text-zinc-400 transition-all duration-300">Stories live offline on this device and sync when cloud is connected. Tap a card to continue writing.</p>
            <p className="mt-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 transition-all duration-300">{stories.length} {stories.length === 1 ? "story" : "stories"}</p>
          </div>
        </div>
        <div className="max-w-[340px] text-left sm:text-right">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400 transition-all duration-300">CnG Writing Guide</p>
          <ol className="mt-2 list-decimal pl-4 text-left text-[13px] leading-6 text-zinc-500 dark:text-zinc-400 marker:text-zinc-400 sm:list-none sm:pl-0 transition-all duration-300">
            <li>1. Pick a story or start a new one.</li>
            <li>2. Write freely — changes save automatically.</li>
            <li>3. Add chapters as new stories in the same shelf.</li>
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 py-4 transition-all duration-300">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => { try { setSearch((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : ""); } catch {} }} placeholder="Filter by title, text, or shelf…" className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-amber-600/50 dark:focus:border-amber-400/50 transition-all duration-300" />
        </div>
        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 transition-all duration-300">
          <Filter size={13} className="ml-2 mr-0.5 text-zinc-400" />
          {shelves.map((name) => {
            const safeName = (name && typeof name === "string") ? name : "";
            const isActive = active === safeName;
            const count = safeName === "All" ? stories.length : safeName === "Unshelved" ? stories.filter((s) => !(s.categoryId && typeof s.categoryId === "string" ? s.categoryId : "").trim()).length : getShelfCount(stories, safeName);
            return (
              <button key={safeName} onClick={() => { try { setActive(safeName); } catch {} }} className={`px-3.5 py-1.5 text-[13px] font-medium transition-all duration-300 whitespace-nowrap ${isActive ? "rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400"}`}>
                {safeName} <span className="ml-1 font-mono text-[11px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => { try { const s = createStory(active !== "All" && active !== "Unshelved" ? categories.find((c) => c.name === active)?.id : undefined); onSelectStory(s.id); } catch {} }} className="ml-auto inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:border-amber-500/50 hover:text-amber-600 dark:hover:border-amber-400/50 dark:hover:text-amber-400 transition-all duration-300">
          Start writing
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-14 transition-all duration-300">
          <p className="max-w-[42ch] text-center text-sm leading-6 text-zinc-500 dark:text-zinc-400">No stories match. Clear the search, switch shelf, or start a new draft — it will appear here right after the first save.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const safeTitle = (s.title && typeof s.title === "string") ? s.title : "Untitled";
            const safeContent = (s.content && typeof s.content === "string") ? s.content : "";
            const words = countWords(safeContent);
            const shelfName = getEffectiveShelfName(s, categories);
            const remoteBadge = s.remoteId ? "· cloud" : "";
            return (
              <button key={s.id} type="button" onClick={() => { try { onSelectStory(s.id); } catch {} }} className="group relative flex min-h-[200px] flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 pb-4 pt-5 text-left transition-all duration-300 hover:border-amber-500/50 dark:hover:border-amber-400/50 hover:shadow-sm hover:-translate-y-0.5">
                <span className="line-clamp-2 pr-2 font-serif text-[17px] font-semibold leading-6 tracking-tight text-zinc-900 dark:text-zinc-100 transition-all duration-300">{safeTitle}</span>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400 transition-all duration-300">{shelfName} {remoteBadge}</span>
                <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-zinc-600 dark:text-zinc-400 transition-all duration-300">{(safeContent || "No content yet — tap to start writing.").slice(0, 220)}</p>
                <div className="mt-auto flex items-center justify-between pt-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 transition-all duration-300">
                  <span>{words.toLocaleString()} words</span>
                  <span className="flex items-center gap-2">
                    <span className="hidden sm:inline" title={formatDate(s.updatedAt)}>{timeAgo(s.updatedAt)} · {formatDate(s.updatedAt)}</span>
                    <span role="button" tabIndex={0} onClick={(e) => { try { e.stopPropagation(); deleteStory(s.id); } catch {} }} onKeyDown={(e) => { try { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); deleteStory(s.id); } } catch {} }} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-600 dark:hover:border-red-800 transition-all duration-300" title="Delete">
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
