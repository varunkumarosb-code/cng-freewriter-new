/**
 * storage.ts — Hybrid Local-First & PocketBase Sync Persistence Adapter
 */
import type { AppSettings, Category, Story } from "./types";
import { pb } from "./pocketbase";

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
      content: `## Chapter One — Salt and Static\n\nThe lighthouse at Cape Merrow...`,
    },
  ];

  return { stories, categories, settings: { ...DEFAULT_SETTINGS } };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Local Storage Synchronous Operations                               */
/* ------------------------------------------------------------------ */

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
    /* fall through */
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
    
    // Trigger non-blocking PocketBase sync
    syncToPocketBase(snapshot.stories);
  } catch {
    /* session continues in memory */
  }
}

export function librarySizeBytes(snapshot: LibrarySnapshot): number {
  return (
    JSON.stringify(snapshot.stories).length +
    JSON.stringify(snapshot.categories).length +
    JSON.stringify(snapshot.settings).length
  );
}

/* ------------------------------------------------------------------ */
/* PocketBase Async Background Sync                                   */
/* ------------------------------------------------------------------ */

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export async function fetchRemoteStories(): Promise<Story[] | null> {
  if (!pb.authStore.isValid || !pb.authStore.model) return null;

  try {
    const records = await pb.collection("cng_stories").getFullList({
      sort: "-updated",
    });

    return records.map((r) => ({
      id: r.id,
      remoteId: r.id,
      title: r.title || "Untitled",
      content: r.content || "",
      categoryId: null,
      createdAt: r.created || new Date().toISOString(),
      updatedAt: r.updated || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("PocketBase fetch error:", err);
    return null;
  }
}

export function syncToPocketBase(stories: Story[]): void {
  if (!pb.authStore.isValid || !pb.authStore.model) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  // Debounced auto-save (2 seconds delay to reduce server load)
  syncTimeout = setTimeout(async () => {
    const userId = pb.authStore.model?.id;
    if (!userId) return;

    for (const story of stories) {
      const wordCount = story.content.trim().split(/\s+/).filter(Boolean).length;

      const payload: Record<string, any> = {
        title: story.title || "Untitled",
        content: story.content || "",
        word_count: wordCount,
        user_id: userId,
      };

      try {
        // Ensure payload NEVER contains custom string id for create
        const cleanPayload = {
          title: story.title || "Untitled",
          content: story.content || "",
          word_count: wordCount,
          user_id: userId,
        };

        if (story.remoteId) {
          await pb.collection("cng_stories").update(story.remoteId, cleanPayload);
        } else {
          // PocketBase auto-generates clean 15-char ID
          const created = await pb.collection("cng_stories").create(cleanPayload);
          story.remoteId = created.id;
          try {
            localStorage.setItem(KEYS.stories, JSON.stringify(stories));
          } catch {}
        }
      } catch (err: any) {
        console.error("Failed syncing story:", story.id, err?.data || err);
      }
    }
  }, 2000);
}