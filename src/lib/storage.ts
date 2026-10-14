/**
 * storage.ts — the persistence adapter.
 *
 * Everything funnels through `loadLibrary` / `persistLibrary`, which keep
 * the three collections in localStorage. To move CnG Writer onto
 * PocketBase later, only this file changes: fetch/insert records here and
 * the backup module (`lib/backup.ts`) works unchanged, since it operates
 * on plain Story/Category arrays.
 */
import type { AppSettings, Category, Story } from "./types";

const NS = "cng-writer";
const KEYS = {
  stories: `${NS}:v1:stories`,
  categories: `${NS}:v1:categories`,
  settings: `${NS}:v1:settings`,
} as const;

export interface LibrarySnapshot {
  stories: Story[];
  categories: Category[];
  settings: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  writerName: "Writer",
  lastBackupAt: null,
};

/* ------------------------------------------------------------------ */
/* Seed content — gives Backup & Export something real to chew on       */
/* ------------------------------------------------------------------ */

const daysAgo = (n: number, hours = 0): string =>
  new Date(Date.now() - n * 86_400_000 - hours * 3_600_000).toISOString();

export function seedLibrary(): LibrarySnapshot {
  const categories: Category[] = [
    { id: "cat-novel", name: "Novel", color: "#e5b168" },
    { id: "cat-essays", name: "Essays", color: "#8fa6c9" },
    { id: "cat-poetry", name: "Poetry", color: "#c49ad6" },
    { id: "cat-journal", name: "Journal", color: "#93bfa4" },
  ];

  const stories: Story[] = [
    {
      id: "story-lighthouse",
      title: "The Last Lighthouse",
      categoryId: "cat-novel",
      createdAt: daysAgo(21),
      updatedAt: daysAgo(0, 3),
      content: `## Chapter One — Salt and Static

The lighthouse at Cape Merrow had been automated for eleven years, but Elias still climbed the 112 steps every morning, out of what he told people was habit and what he knew, in truth, was grief.

The lamp room smelled of cold iron and the lemon oil he rubbed into the brass. Below, the town was waking: gulls arguing over the harbor, a radio murmuring the shipping forecast through an open window.

> A lighthouse does not save ships. It simply refuses to let the dark have the last word.

He found the letter on the third Tuesday of October, wedged behind the logbook drawer, in an envelope gone the color of weak tea. His father's handwriting. *For E., when the light is yours.*

Elias sat down on the iron steps and read it twice. Outside, the fog came in off the Atlantic like something that had been looking for him personally.

## Chapter Two — The Keeper's Log

*To be continued.*`,
    },
    {
      id: "story-beginnings",
      title: "On Beginnings",
      categoryId: "cat-essays",
      createdAt: daysAgo(12),
      updatedAt: daysAgo(1, 2),
      content: `Every craft has a superstition about starting. Potters center the clay before they think. Carpenters measure twice. Writers, mostly, make another cup of coffee and despair — but despair, I've learned, is just research wearing a coat.

The blank page is not empty. It is *charged*. Everything the piece could become is still alive in it, and the first sentence doesn't create the work so much as collapse it, choosing one door out of a thousand.

## A small rule

So I keep a rule: **begin badly, on purpose.** Give the inner critic nothing to aim at. A crooked first line is scaffolding — ugly, essential, and removed before anyone visits.

> Start before you are ready, because ready is a story fear tells.

The essays I love began as voice notes, napkin arithmetic, a sentence muttered at a red light. Begin wherever the thing taps you on the shoulder. The beginning is a door, not a portrait.`,
    },
    {
      id: "story-october",
      title: "October Inventory",
      categoryId: "cat-poetry",
      createdAt: daysAgo(34),
      updatedAt: daysAgo(6),
      content: `One brass key with no remaining door.
Four lackadaisical storms, all talk.
A peach going amber at the edges —
the orchard's last unclaimed thought.

Nine pages where my mother would have laughed.
*I keep them separate from the other pages.*

The kettle's small apprentice thunder.
A sweater the color of distance.
Two o'clock, and all its honest rain.

> Count what remains. The rest is freight.

Eleven moons, one for each brave thing
I almost said and shelved like preserves —
sweet, sealed, and waiting for a winter

that has, at last, agreed to come.`,
    },
    {
      id: "story-morning",
      title: "Morning Pages — On Focus",
      categoryId: "cat-journal",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(0, 8),
      content: `Slept badly, dreamed in airports. Woke at 6 and the flat was that particular blue it only manages twice a year.

Tried the usual — phone in the other room, one tab, one document. It still amazes me how the mind behaves like a cat: chase it and it's under the sofa; sit quietly with a sentence and it climbs into your lap.

- 40 uninterrupted minutes on the lighthouse chapter
- walked the long way, no headphones
- noted three images for the essay: brass, fog, tea

Tomorrow: same time, same chair. *Focus isn't found, it's scheduled.*`,
    },
  ];

  return { stories, categories, settings: { ...DEFAULT_SETTINGS } };
}

/* ------------------------------------------------------------------ */
/* Load / persist                                                      */
/* ------------------------------------------------------------------ */

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadLibrary(): LibrarySnapshot {
  try {
    const stories = readJson<Story[]>(KEYS.stories);
    const categories = readJson<Category[]>(KEYS.categories);
    const settings = readJson<AppSettings>(KEYS.settings);

    if (Array.isArray(stories)) {
      return {
        stories,
        categories: Array.isArray(categories) ? categories : seedLibrary().categories,
        settings: settings && typeof settings === "object"
          ? { ...DEFAULT_SETTINGS, ...settings }
          : { ...DEFAULT_SETTINGS },
      };
    }
  } catch {
    /* fall through to seed */
  }
  const seeded = seedLibrary();
  persistLibrary(seeded);
  return seeded;
}

export function persistLibrary(snapshot: LibrarySnapshot): void {
  try {
    localStorage.setItem(KEYS.stories, JSON.stringify(snapshot.stories));
    localStorage.setItem(KEYS.categories, JSON.stringify(snapshot.categories));
    localStorage.setItem(KEYS.settings, JSON.stringify(snapshot.settings));
  } catch {
    /* storage full / unavailable — session continues in memory */
  }
}

export function librarySizeBytes(snapshot: LibrarySnapshot): number {
  return (
    JSON.stringify(snapshot.stories).length +
    JSON.stringify(snapshot.categories).length +
    JSON.stringify(snapshot.settings).length
  );
}
