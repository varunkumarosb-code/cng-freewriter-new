import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CloudCheck,
  CloudUpload,
  HardDrive,
  Loader2,
} from "lucide-react";
import { library, SaveOutcome } from "../lib/library";
import {
  ConnStatus,
  GENRES,
  GenreKey,
  Story,
  countChars,
  countWords,
  fmtNum,
  fmtTime,
  genreByKey,
  nowISO,
  readingMinutes,
} from "../lib/model";

interface Props {
  story: Story;
  status: ConnStatus;
  onBack: () => void;
}

type EditorFont = "serif" | "sans" | "mono";

const FONT_CLASSES: Record<EditorFont, string> = {
  serif: "font-prose text-[18px] leading-[1.9]",
  sans: "font-sans text-[17px] leading-[1.85]",
  mono: "font-mono text-[15.5px] leading-[1.85]",
};

const FS_KEY = "cngwriter:editorfont";

export default function Editor({ story, status, onBack }: Props) {
  const [title, setTitle] = useState(story.title);
  const [content, setContent] = useState(story.content);
  const [genre, setGenre] = useState<GenreKey>(story.genre);
  const [font, setFont] = useState<EditorFont>(() => {
    try {
      return (localStorage.getItem(FS_KEY) as EditorFont) || "serif";
    } catch {
      return "serif";
    }
  });
  const [saving, setSaving] = useState(false);
  const [lastSave, setLastSave] = useState<{
    at: string;
    outcome: SaveOutcome;
  } | null>(null);

  const savedRef = useRef({
    t: story.title,
    c: story.content,
    g: story.genre,
  });
  const timerRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const dirty =
    title !== savedRef.current.t ||
    content !== savedRef.current.c ||
    genre !== savedRef.current.g;

  const stats = useMemo(() => {
    const w = countWords(content);
    return { words: w, chars: countChars(content), mins: readingMinutes(w) };
  }, [content]);

  /* ------------------------------ actions ------------------------------ */

  const save = useCallback(async () => {
    if (saving) return;
    if (
      title === savedRef.current.t &&
      content === savedRef.current.c &&
      genre === savedRef.current.g
    )
      return;
    setSaving(true);
    const outcome = await library.upsert({
      id: story.id,
      title,
      content,
      genre,
    });
    savedRef.current = { t: title, c: content, g: genre };
    setLastSave({ at: nowISO(), outcome });
    setSaving(false);
  }, [title, content, genre, saving, story.id]);

  /* debounced autosave — a beat after the writer pauses */
  useEffect(() => {
    if (!dirty || saving) return;
    timerRef.current = window.setTimeout(() => void save(), 1400);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [title, content, genre, saving, dirty, save]);

  /* shortcuts: Ctrl/Cmd+S saves, Esc returns to the shelf */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (timerRef.current) window.clearTimeout(timerRef.current);
        void save().finally(onBack);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, onBack]);

  /* flush pending words when leaving */
  const goBack = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    void save().finally(onBack);
  };

  /* autosize the headline */
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    if (!story.title && !story.content) titleRef.current?.focus();
  }, [story.title, story.content]);

  useEffect(() => {
    try {
      localStorage.setItem(FS_KEY, font);
    } catch {
      /* ignore */
    }
  }, [font]);

  /* ------------------------------- status ------------------------------ */

  const pendingCloud = story.pending;
  const statusLine = saving
    ? "Saving…"
    : dirty
      ? "Unsaved changes…"
      : lastSave
        ? lastSave.outcome === "cloud"
          ? `Synced to PocketBase · ${fmtTime(lastSave.at)}`
          : lastSave.outcome === "pending"
            ? `Saved locally · syncs when connected`
            : `Saved to this browser · ${fmtTime(lastSave.at)}`
        : pendingCloud
          ? "Local copy ahead of PocketBase"
          : status === "connected"
            ? "Autosave on · cloud sync active"
            : "Autosave on · staying local";

  const OriginIcon = pendingCloud
    ? CloudUpload
    : story.origin === "cloud"
      ? CloudCheck
      : HardDrive;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="flex min-h-dvh flex-col"
    >
      {/* ------------------------- editor chrome ------------------------- */}
      <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-zinc-900/[0.06] bg-[#f6f3ee]/80 px-3 backdrop-blur-xl sm:px-4 dark:border-white/[0.06] dark:bg-[#09090b]/70">
        <button onClick={goBack} className="lw-btn-ghost !border-transparent !px-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Bookshelf</span>
        </button>

        <p className="mx-auto hidden truncate font-mono text-[10.5px] tracking-[0.14em] text-zinc-400 uppercase sm:block dark:text-zinc-500">
          <span
            className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${
              saving
                ? "lw-pulse-dot bg-amber-400"
                : dirty
                  ? "bg-amber-400"
                  : status === "connected" && !pendingCloud
                    ? "bg-emerald-400"
                    : "bg-zinc-400"
            }`}
          />
          {statusLine}
        </p>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {/* typeface switch */}
          <div className="flex items-center rounded-lg border border-zinc-300/70 p-0.5 dark:border-white/10">
            {(["serif", "sans", "mono"] as EditorFont[]).map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                title={`${f[0].toUpperCase()}${f.slice(1)} typeface`}
                className={`grid h-7 w-8 place-items-center rounded-md text-[13px] transition ${
                  font === f
                    ? "bg-amber-400/15 text-amber-600 dark:text-amber-300"
                    : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                } ${f === "serif" ? "font-display" : f === "mono" ? "font-mono text-[12px]" : "font-sans"}`}
              >
                Aa
              </button>
            ))}
          </div>

          <button onClick={() => void save()} className="lw-btn-primary">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !dirty ? (
              <Check className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <CloudCheck className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {saving ? "Saving…" : dirty ? "Save" : "Saved"}
            </span>
            <kbd className="hidden rounded border border-zinc-950/20 px-1 py-0.5 font-mono text-[9px] font-semibold lg:inline-block">
              ⌘S
            </kbd>
          </button>
        </div>
      </div>

      {/* --------------------------- page body --------------------------- */}
      <div className="mx-auto flex w-full max-w-[46rem] flex-1 flex-col px-5 pt-12 pb-32 sm:px-8">
        <textarea
          ref={titleRef}
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this story…"
          aria-label="Story title"
          className="lw-title-input lw-caret font-display w-full resize-none overflow-hidden bg-transparent text-4xl leading-[1.15] font-medium tracking-tight text-zinc-900 outline-none sm:text-[42px] dark:text-zinc-50"
        />

        {/* meta row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-900/[0.07] pb-6 dark:border-white/[0.07]">
          <div className="relative">
            <span
              className="pointer-events-none absolute top-1/2 left-2.5 h-2 w-2 -translate-y-1/2 rounded-full"
              style={{ background: `hsl(${genreByKey(genre).hue} 80% 60%)` }}
            />
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as GenreKey)}
              aria-label="Genre"
              className="cursor-pointer appearance-none rounded-full border border-zinc-300/70 bg-transparent py-1 pr-7 pl-7 font-mono text-[11px] text-zinc-500 transition outline-none hover:border-zinc-400 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/25 dark:hover:text-zinc-200"
            >
              {GENRES.map((g) => (
                <option key={g.key} value={g.key} className="bg-white dark:bg-[#141416]">
                  {g.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
          </div>

          <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
            <OriginIcon
              className={`h-3.5 w-3.5 ${pendingCloud ? "text-amber-400" : story.origin === "cloud" ? "text-emerald-400" : ""}`}
            />
            {pendingCloud
              ? "Waiting to sync"
              : story.origin === "cloud"
                ? "On PocketBase"
                : "On this device"}
          </span>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Begin anywhere. One true sentence — the truest you know…"
          aria-label="Story content"
          spellCheck
          className={`lw-caret min-h-[52vh] w-full flex-1 resize-none bg-transparent pt-8 text-zinc-800 outline-none placeholder:text-zinc-400/60 dark:text-zinc-200 dark:placeholder:text-zinc-600 ${FONT_CLASSES[font]}`}
          style={{ wordSpacing: "0.04em" }}
        />
      </div>

      {/* ------------------------ floating counters ---------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 26 }}
        className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2"
      >
        <div className="flex items-center gap-3 rounded-full border border-zinc-900/10 bg-white/85 px-4 py-2 shadow-lg shadow-black/[0.06] backdrop-blur-xl sm:gap-4 sm:px-5 dark:border-white/10 dark:bg-[#101013]/85 dark:shadow-black/50">
          <Stat label="Words" value={fmtNum(stats.words)} />
          <Dot />
          <Stat label="Chars" value={fmtNum(stats.chars)} />
          <Dot />
          <Stat
            label="Read"
            value={stats.words === 0 ? "—" : `~${fmtNum(stats.mins)} min`}
          />
          {stats.words === 0 && (
            <>
              <Dot />
              <span className="lw-caret-blink ml-0.5 h-3.5 w-1.5 rounded-[1px] bg-amber-400" />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-mono text-[9px] font-medium tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
        {label}
      </span>
      <span className="font-mono text-[12px] font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
        {value}
      </span>
    </span>
  );
}

const Dot = () => (
  <span className="h-3 w-px bg-zinc-900/10 dark:bg-white/10" />
);
