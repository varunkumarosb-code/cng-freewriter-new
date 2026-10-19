import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useLibrary } from "../state/LibraryContext";
import { Menu, MenuDivider, MenuLabel } from "./Menu";
import { ExportMenu } from "./ExportMenu";
import { countWords, formatDate, formatTime, readingMinutes } from "../lib/format";

interface EditorProps {
  storyId: string;
  onBack: () => void;
}

export function Editor({ storyId, onBack }: EditorProps) {
  const { stories, categories, updateStory, deleteStory, createCategory, notify } = useLibrary();
  const story = stories.find((s) => s.id === storyId);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [savedAt, setSavedAt] = useState<Date>(new Date());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newShelf, setNewShelf] = useState("");

  /* Route guard + scroll reset */
  useEffect(() => {
    if (!story) onBack();
  }, [story, onBack]);
  useEffect(() => window.scrollTo(0, 0), [storyId]);

  /* Autosize the two textareas */
  useLayoutEffect(() => {
    for (const el of [titleRef.current, bodyRef.current]) {
      if (!el) continue;
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [story?.title, story?.content, storyId]);

  /* § Autosave indicator (persistence itself happens in the context) */
  useEffect(() => {
    setSaveState("saving");
    const t = window.setTimeout(() => {
      setSaveState("saved");
      setSavedAt(new Date());
    }, 650);
    return () => window.clearTimeout(t);
  }, [story?.title, story?.content, story?.categoryId]);

  /* ⌘/Ctrl+S — reassure, don't reload */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        notify("info", "Autosave is always on", "Every keystroke is stored locally.");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [notify]);

  if (!story) return null;

  const category = categories.find((c) => c.id === story.categoryId);
  const words = countWords(story.content);
  const chars = story.content.length;

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.05]";

  return (
    <div className="min-h-screen">
      {/* ------- floating chrome ------- */}
      <div className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-zinc-50 via-zinc-50/85 to-transparent pb-5 dark:from-night-950 dark:via-night-950/85">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 opacity-90 transition-opacity duration-500 hover:opacity-100 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-[13px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-100"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Shelf</span>
            </button>
            <span className="hidden items-center gap-1.5 font-mono text-[10.5px] text-zinc-500 sm:flex">
              {saveState === "saving" ? (
                <>
                  <Loader2 size={11} className="animate-spin text-ember-400" /> Saving…
                </>
              ) : (
                <>
                  <Check size={11} className="text-emerald-400/80" /> Saved {formatTime(savedAt)}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Shelf picker */}
            <Menu
              align="end"
              panel={(close) => (
                <>
                  <MenuLabel>Move to shelf</MenuLabel>
                  <button
                    className={item}
                    onClick={() => {
                      updateStory(story.id, { categoryId: null });
                      close();
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                    Unshelved
                    {!story.categoryId && <Check size={13} className="ml-auto text-ember-300" />}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      className={item}
                      onClick={() => {
                        updateStory(story.id, { categoryId: c.id });
                        close();
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                      {story.categoryId === c.id && (
                        <Check size={13} className="ml-auto text-ember-300" />
                      )}
                    </button>
                  ))}
                  <MenuDivider />
                  <div className="flex items-center gap-1.5 px-1.5 py-1">
                    <input
                      value={newShelf}
                      onChange={(e) => setNewShelf(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newShelf.trim()) {
                          const id = createCategory(newShelf);
                          if (id) updateStory(story.id, { categoryId: id });
                          setNewShelf("");
                          close();
                        }
                      }}
                      placeholder="New shelf…"
                      className="h-8 min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-[12px] text-zinc-800 placeholder:text-zinc-400 focus:border-ember-400/40 focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200 dark:placeholder:text-zinc-600"
                    />
                    <button
                      aria-label="Add shelf"
                      onClick={() => {
                        const id = createCategory(newShelf);
                        if (id) updateStory(story.id, { categoryId: id });
                        setNewShelf("");
                        close();
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-ember-400/40 hover:text-ember-600 dark:border-white/10 dark:text-zinc-400 dark:hover:text-ember-300"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </>
              )}
            >
              {({ toggle }) => (
                <button
                  onClick={toggle}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-[13px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-100"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: category?.color ?? "#71717a" }}
                  />
                  <span className="hidden sm:inline">{category?.name ?? "Unshelved"}</span>
                  <ChevronDown size={13} className="text-zinc-400 dark:text-zinc-600" />
                </button>
              )}
            </Menu>

            {/* Feature 3 — single-story export */}
            <ExportMenu story={story} />

            {/* Overflow */}
            <Menu
              align="end"
              panel={(close) => (
                <>
                  <MenuLabel>Story</MenuLabel>
                  <button
                    className={`${item} ${confirmDelete ? "text-rose-300" : ""}`}
                    onClick={() => {
                      if (!confirmDelete) {
                        setConfirmDelete(true);
                        window.setTimeout(() => setConfirmDelete(false), 3200);
                        return;
                      }
                      close();
                      deleteStory(story.id);
                      onBack();
                    }}
                  >
                    <Trash2 size={14} className={confirmDelete ? "text-rose-300" : "text-zinc-500"} />
                    {confirmDelete ? "Click again to delete" : "Delete story"}
                  </button>
                </>
              )}
            >
              {({ toggle }) => (
                <button
                  onClick={toggle}
                  aria-label="More actions"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-100"
                >
                  <MoreHorizontal size={16} />
                </button>
              )}
            </Menu>
          </div>
        </div>
      </div>

      {/* ------- writing surface ------- */}
      <div className="mx-auto w-full max-w-[700px] px-6 pb-[32vh] pt-32">
        <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-400 dark:text-zinc-600">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: category?.color ?? "#52525b" }}
          />
          {category?.name ?? "Unshelved"}
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          begun {formatDate(story.createdAt)}
        </p>

        <textarea
          ref={titleRef}
          rows={1}
          value={story.title}
          onChange={(e) => updateStory(story.id, { title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              bodyRef.current?.focus();
            }
          }}
          placeholder="Untitled"
          spellCheck={false}
          className="mt-4 w-full resize-none overflow-hidden bg-transparent font-serif text-[clamp(30px,5.5vw,42px)] font-medium leading-[1.15] text-zinc-900 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-700"
        />

        <div className="my-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-zinc-200 dark:bg-white/[0.06]" />
          <span className="h-1.5 w-1.5 rotate-45 bg-ember-400/70" />
          <span className="h-px flex-1 bg-zinc-200 dark:bg-white/[0.06]" />
        </div>

        <textarea
          ref={bodyRef}
          value={story.content}
          onChange={(e) => updateStory(story.id, { content: e.target.value })}
          placeholder="Begin writing… the page is patient."
          className="min-h-[52vh] w-full resize-none overflow-hidden bg-transparent font-serif text-[19px] leading-[1.9] text-zinc-700 placeholder:italic placeholder:text-zinc-300 focus:outline-none dark:text-zinc-300 dark:placeholder:text-zinc-700"
        />
      </div>

      {/* ------- bottom status ------- */}
      <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 opacity-45 transition-opacity duration-500 hover:opacity-100">
        <div className="flex h-9 items-center gap-3 rounded-full border border-zinc-200 bg-white/90 px-4 font-mono text-[10.5px] text-zinc-500 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-night-900/85 dark:shadow-none">
          <span className={`h-1.5 w-1.5 rounded-full ${saveState === "saving" ? "animate-pulse bg-ember-400" : "bg-emerald-400/70"}`} />
          <span>{words.toLocaleString()} words</span>
          <span className="text-zinc-700">·</span>
          <span>{chars.toLocaleString()} chars</span>
          <span className="text-zinc-700">·</span>
          <span>{readingMinutes(words)} min</span>
          <span className="hidden text-zinc-700 sm:inline">·</span>
          <span className="hidden text-ember-300/80 sm:inline">Markdown</span>
        </div>
      </div>
    </div>
  );
}
