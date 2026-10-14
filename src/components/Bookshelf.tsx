import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  CloudCheck,
  CloudUpload,
  HardDrive,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  ConnStatus,
  GenreKey,
  Story,
  countChars,
  displayTitle,
  fmtNum,
  genreByKey,
  readingMinutes,
  rel,
} from "../lib/model";

interface Props {
  stories: Story[];
  status: ConnStatus;
  onOpen: (story: Story) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

type SortKey = "updated" | "title" | "words";

export default function Bookshelf({
  stories,
  status,
  onOpen,
  onNew,
  onDelete,
  onOpenSettings,
}: Props) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<"all" | GenreKey>("all");
  const [sort, setSort] = useState<SortKey>("updated");

  const totals = useMemo(() => {
    const words = stories.reduce((n, s) => n + s.word_count, 0);
    return { words, minutes: readingMinutes(words) };
  }, [stories]);

  const presentGenres = useMemo(
    () => [...new Set(stories.map((s) => s.genre))],
    [stories]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = stories.filter(
      (s) =>
        (genre === "all" || s.genre === genre) &&
        (!q ||
          s.title.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q))
    );
    if (sort === "title") {
      list = [...list].sort((a, b) =>
        displayTitle(a).localeCompare(displayTitle(b))
      );
    } else if (sort === "words") {
      list = [...list].sort((a, b) => b.word_count - a.word_count);
    } else {
      list = [...list].sort(
        (a, b) => +new Date(b.updated) - +new Date(a.updated)
      );
    }
    return list;
  }, [stories, query, genre, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
      {/* ---------- hero ---------- */}
      <section className="pt-10 pb-8 sm:pt-14">
        <p className="lw-kicker mb-3 flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-amber-500" />
          Library · Local-first
        </p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-zinc-900 sm:text-[44px] sm:leading-[1.05] dark:text-zinc-50">
          Your stories,{" "}
          <em className="font-light text-amber-600 dark:text-amber-300">
            uninterrupted.
          </em>
        </h1>
        <p className="mt-4 font-mono text-[11px] tracking-[0.14em] text-zinc-500 uppercase dark:text-zinc-500">
          {stories.length} {stories.length === 1 ? "story" : "stories"}
          <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
          {fmtNum(totals.words)} words
          <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
          {fmtNum(totals.minutes)} min of reading
        </p>
      </section>

      {/* ---------- toolbar ---------- */}
      <section className="mb-7 flex flex-wrap items-center gap-3">
        <div className="relative min-w-44 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles & drafts…"
            className="lw-input pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setGenre("all")}
            className={`lw-chip ${genre === "all" ? "lw-chip-active" : ""}`}
          >
            All
          </button>
          {presentGenres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`lw-chip ${genre === g ? "lw-chip-active" : ""}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: `hsl(${genreByKey(g).hue} 80% 60%)` }}
              />
              {genreByKey(g).label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="lw-select py-1.5 pl-3 text-[12.5px]"
            >
              <option value="updated">Recently edited</option>
              <option value="title">Title A–Z</option>
              <option value="words">Word count</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>
      </section>

      {/* ---------- grid ---------- */}
      {stories.length === 0 ? (
        <EmptyState onNew={onNew} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-20 text-center dark:border-white/10">
          <p className="font-display text-xl text-zinc-400 dark:text-zinc-500">
            Nothing matches that search.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setGenre("all");
            }}
            className="lw-btn-ghost mt-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <motion.section
          layout
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((s, i) => (
              <StoryCard
                key={s.id}
                story={s}
                index={i}
                onOpen={() => onOpen(s)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </AnimatePresence>

          {status !== "connected" && (
            <SyncSetupCard onOpenSettings={onOpenSettings} />
          )}
        </motion.section>
      )}

      {stories.length > 0 && (
        <p className="mt-14 text-center font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase dark:text-zinc-600">
          Autosaves locally · PocketBase sync optional · zero ads, forever
        </p>
      )}
    </div>
  );
}

/* ------------------------------ cards ------------------------------ */

function StoryCard({
  story,
  index,
  onOpen,
  onDelete,
}: {
  story: Story;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [armDelete, setArmDelete] = useState(false);
  const g = genreByKey(story.genre);
  const title = displayTitle(story);
  const kicker =
    story.content.trim().split("\n").filter(Boolean)[0]?.slice(0, 90) ?? "";

  const requestDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (armDelete) {
      onDelete();
    } else {
      setArmDelete(true);
      setTimeout(() => setArmDelete(false), 2600);
    }
  };

  const SyncIcon = story.pending
    ? CloudUpload
    : story.origin === "cloud"
      ? CloudCheck
      : HardDrive;
  const syncTint = story.pending
    ? "text-amber-300 bg-amber-400/15"
    : story.origin === "cloud"
      ? "text-emerald-300 bg-emerald-400/15"
      : "text-zinc-300 bg-black/35";
  const syncLabel = story.pending
    ? "Waiting to sync"
    : story.origin === "cloud"
      ? "Synced to PocketBase"
      : "Stored locally";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 320, damping: 30, delay: index * 0.04 }}
      onClick={onOpen}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-900/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/[0.07] dark:border-white/10 dark:bg-[#101013] dark:shadow-none dark:hover:shadow-2xl dark:hover:shadow-black/60"
    >
      {/* cover */}
      <div
        className="relative h-32 overflow-hidden border-b border-zinc-900/[0.06] dark:border-white/[0.06]"
        style={{
          background: `linear-gradient(135deg, hsl(${g.hue} 62% 52% / 0.16), hsl(${g.hue + 24} 70% 42% / 0.05))`,
        }}
      >
        <span className="lw-mono-badge absolute top-3 left-3 uppercase">
          {g.label}
        </span>
        <span
          className="font-display absolute -right-2 -bottom-5 text-[104px] leading-none font-light italic opacity-60 select-none"
          style={{ color: `hsl(${g.hue} 75% 62%)` }}
        >
          {title.charAt(0).toUpperCase()}
        </span>
        <span className="lw-mono-badge absolute bottom-3 left-3 gap-1.5">
          {fmtNum(story.word_count)} words
        </span>
        <span
          title={syncLabel}
          className={`absolute top-3 right-3 grid h-6 w-6 place-items-center rounded-md backdrop-blur-sm ${syncTint}`}
        >
          <SyncIcon className="h-3.5 w-3.5" />
        </span>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* body */}
      <div className="relative p-4 pt-3.5">
        <h3 className="font-display lw-clamp-2 min-h-11 text-[16.5px] leading-snug font-medium text-zinc-900 transition-colors group-hover:text-amber-700 dark:text-zinc-100 dark:group-hover:text-amber-300">
          {title}
        </h3>
        {kicker && (
          <p className="lw-clamp-2 mt-1.5 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-500">
            {kicker}
          </p>
        )}

        <div className="mt-3.5 flex items-center justify-between border-t border-zinc-900/[0.06] pt-3 dark:border-white/[0.07]">
          <span className="font-mono text-[10.5px] tracking-wide text-zinc-400 dark:text-zinc-500">
            {rel(story.updated)}
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">·</span>
            {fmtNum(countChars(story.content))} chars
          </span>
          <span className="flex items-center gap-1.5">
            <button
              onClick={requestDelete}
              title={armDelete ? "Click again to confirm deletion" : "Delete story"}
              className={`grid h-7 w-7 place-items-center rounded-lg border transition sm:opacity-0 sm:group-hover:opacity-100 ${
                armDelete
                  ? "border-red-500/60 bg-red-500/15 text-red-500 opacity-100"
                  : "border-transparent text-zinc-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-600"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <span className="grid h-7 w-7 place-items-center rounded-lg text-zinc-300 transition group-hover:text-amber-500 sm:opacity-0 sm:group-hover:opacity-100 dark:text-zinc-600 dark:group-hover:text-amber-400">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function SyncSetupCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpenSettings}
      className="group flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 p-6 text-center transition hover:border-amber-500/60 hover:bg-amber-500/[0.04] dark:border-white/12 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/[0.04]"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400 transition group-hover:border-amber-400/50 group-hover:text-amber-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-500 dark:group-hover:text-amber-300">
        <CloudUpload className="h-5 w-5" />
      </span>
      <p className="font-display text-lg text-zinc-700 dark:text-zinc-200">
        Add PocketBase sync
      </p>
      <p className="max-w-60 text-[12.5px] leading-relaxed text-zinc-500">
        Drafts already save to this browser. Point the app at your server to
        carry them everywhere.
      </p>
      <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-amber-600 uppercase dark:text-amber-400">
        Set up sync →
      </span>
    </motion.button>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-zinc-300 py-24 text-center dark:border-white/10">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_8px_30px_rgba(245,158,11,0.35)]">
        <BookOpen className="h-6 w-6 text-zinc-950" />
      </span>
      <h2 className="font-display text-2xl font-medium text-zinc-900 dark:text-zinc-100">
        The shelf is empty — a dangerous place for a writer.
      </h2>
      <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
        Open the first page. It can be a novel, a field note, or a single
        sentence that refuses to leave you alone.
      </p>
      <button onClick={onNew} className="lw-btn-primary mt-2 px-5 py-2.5">
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Start your first story
      </button>
    </div>
  );
}
