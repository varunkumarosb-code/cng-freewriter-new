import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Plus, Search } from "lucide-react";
import type { Story } from "../lib/types";
import { useLibrary } from "../state/LibraryContext";
import { stripMarkdown } from "../lib/backup";
import { countWords, formatLongDate, plural, timeAgo } from "../lib/format";

interface BookshelfProps {
  onOpenStory: (id: string) => void;
  onNewStory: () => void;
}

export function Bookshelf({ onOpenStory, onNewStory }: BookshelfProps) {
  const { stories, categories, restoreSamples } = useLibrary();
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState<string>("all");

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const totalWords = useMemo(
    () => stories.reduce((n, s) => n + countWords(s.content), 0),
    [stories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories
      .filter((s) => {
        if (shelf === "all") return true;
        if (shelf === "unshelved") return s.categoryId === null;
        return s.categoryId === shelf;
      })
      .filter((s) =>
        q ? (s.title + " " + s.content).toLowerCase().includes(q) : true,
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [stories, query, shelf]);

  const chips = useMemo(() => {
    const countFor = (id: string) =>
      id === "all"
        ? stories.length
        : id === "unshelved"
          ? stories.filter((s) => s.categoryId === null).length
          : stories.filter((s) => s.categoryId === id).length;
    return [
      { id: "all", name: "All", color: "#e5b168", count: countFor("all") },
      ...categories.map((c) => ({ ...c, count: countFor(c.id) })),
      ...(countFor("unshelved") > 0
        ? [{ id: "unshelved", name: "Unshelved", color: "#71717a", count: countFor("unshelved") }]
        : []),
    ];
  }, [stories, categories]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-28">
      {/* Header */}
      <div className="pt-14">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ember-400/90">
          {formatLongDate(new Date().toISOString())}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <h1 className="font-serif text-[clamp(36px,5.5vw,58px)] font-medium leading-[1.02] tracking-[-0.01em] text-zinc-50">
            The bookshelf<span className="text-ember-400">.</span>
          </h1>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles & text…"
              className="h-10 w-full rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-4 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-ember-400/40 focus:outline-none sm:w-60"
            />
          </div>
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          {stories.length} {plural(stories.length, "story", "stories")} · {totalWords.toLocaleString()} words ·{" "}
          {categories.length} {plural(categories.length, "shelf", "shelves")}
        </p>
      </div>

      {/* Shelf chips */}
      <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => {
          const active = shelf === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setShelf(chip.id)}
              className={`flex h-8 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12px] font-medium transition ${
                active
                  ? "border-ember-400/50 bg-ember-400/10 text-ember-200"
                  : "border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: chip.color }} />
              {chip.name}
              <span className={`font-mono text-[10px] ${active ? "text-ember-300/70" : "text-zinc-600"}`}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {stories.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-ember-400/25 bg-ember-400/10 text-ember-300">
            <BookOpen size={20} />
          </span>
          <h2 className="mt-5 font-serif text-2xl text-zinc-100">The shelf is empty</h2>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500">
            Start your first story, restore the samples, or import a{" "}
            <span className="font-mono text-zinc-400">.json</span> backup from the top bar.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              onClick={onNewStory}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ember-400 px-4 text-[13px] font-bold text-night-950 transition hover:bg-ember-300"
            >
              <Plus size={15} strokeWidth={2.6} /> Start writing
            </button>
            <button
              onClick={restoreSamples}
              className="inline-flex h-9 items-center rounded-lg border border-white/10 px-4 text-[13px] font-medium text-zinc-300 transition hover:border-white/20"
            >
              Restore samples
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((story, i) => (
            <StoryCard
              key={story.id}
              story={story}
              category={story.categoryId ? categoryById.get(story.categoryId) : undefined}
              onOpen={() => onOpenStory(story.id)}
              delay={Math.min(i, 9) * 45}
            />
          ))}

          {/* New story tile */}
          <button
            onClick={onNewStory}
            className="group flex min-h-[230px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 text-zinc-600 transition hover:border-ember-400/40 hover:text-ember-300"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full border border-current">
              <Plus size={18} />
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.28em]">
              New story
            </span>
          </button>
        </div>
      )}

      {stories.length > 0 && filtered.length === 0 && (
        <p className="mt-16 text-center font-serif text-xl italic text-zinc-500">
          Nothing on this shelf matches “{query}”.
        </p>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

interface StoryCardProps {
  story: Story;
  category?: { name: string; color: string };
  onOpen: () => void;
  delay: number;
}

function StoryCard({ story, category, onOpen, delay }: StoryCardProps) {
  const words = countWords(story.content);
  const excerpt = stripMarkdown(story.content).replace(/\n+/g, " ").slice(0, 220);

  return (
    <article
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      style={{ animationDelay: `${delay}ms` }}
      className="group flex animate-rise cursor-pointer flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/30 hover:bg-white/[0.035] hover:shadow-[0_24px_60px_-24px_rgba(229,177,104,0.18)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: category?.color ?? "#71717a" }}
          />
          {category?.name ?? "Unshelved"}
        </span>
        <ArrowUpRight
          size={15}
          className="text-ember-300 opacity-0 transition group-hover:opacity-100"
        />
      </div>

      <h2 className="mt-3 line-clamp-2 font-serif text-[22px] font-medium leading-snug text-zinc-100 transition group-hover:text-ember-100">
        {story.title || "Untitled"}
      </h2>

      <p className="mt-2 line-clamp-3 flex-1 font-serif text-[15px] leading-relaxed text-zinc-400/90">
        {excerpt || "A blank page, waiting."}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        <span>{words.toLocaleString()} words</span>
        <span>{timeAgo(story.updatedAt)}</span>
      </div>
    </article>
  );
}
