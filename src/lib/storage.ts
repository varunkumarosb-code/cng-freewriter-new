import type { AppSettings, Category, Story, BackupFile } from "../types";
import { pb } from "./pocketbase";

// Spec-required keys + legacy migration
const KEYS = {
  stories: "cngwriter:stories",
  categories: "cngwriter:categories",
  settings: "cngwriter:settings",
  theme: "cngwriter:theme",
  pbUrl: "cngwriter:pb_url",
  pbToken: "cngwriter:pb_token",
} as const;

const LEGACY_KEYS = {
  stories: "cng-writer:v1:stories",
  categories: "cng-writer:v1:categories",
  settings: "cng-writer:v1:settings",
  storiesAlt: "cngwriter:v1:stories",
  categoriesAlt: "cngwriter:v1:categories",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  writerName: "Writer",
  lastBackupAt: null,
};

const CATEGORY_COLORS = ["#e5b168", "#8fa6c9", "#c49ad6", "#93bfa4", "#d98f8f", "#9fb8d4"];

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function migrateLegacy(): void {
  try {
    for (const k of Object.values(LEGACY_KEYS)) {
      const v = localStorage.getItem(k);
      if (v && !localStorage.getItem(KEYS.stories) && k.includes("stories")) {
        try { localStorage.setItem(KEYS.stories, v); } catch {}
      }
      if (v && !localStorage.getItem(KEYS.categories) && k.includes("categories")) {
        try { localStorage.setItem(KEYS.categories, v); } catch {}
      }
      if (v && !localStorage.getItem(KEYS.settings) && k.includes("settings")) {
        try { localStorage.setItem(KEYS.settings, v); } catch {}
      }
    }
    try {
      const old = localStorage.getItem("cng:pb_url");
      if (old && !localStorage.getItem(KEYS.pbUrl)) localStorage.setItem(KEYS.pbUrl, old);
    } catch {}
  } catch {}
}

const daysAgo = (n: number, hours = 0): string =>
  new Date(Date.now() - n * 86_400_000 - hours * 3_600_000).toISOString();

export function seedLibrary(): { stories: Story[]; categories: Category[]; settings: AppSettings } {
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

export function loadStories(): Story[] {
  try {
    migrateLegacy();
    const v = readJson<Story[]>(KEYS.stories);
    if (Array.isArray(v)) return v;
  } catch {}
  const s = seedLibrary().stories;
  try { writeJson(KEYS.stories, s); } catch {}
  return s;
}

export function saveStories(stories: Story[]): void {
  writeJson(KEYS.stories, stories);
}

export function loadCategories(): Category[] {
  try {
    migrateLegacy();
    const v = readJson<Category[]>(KEYS.categories);
    if (Array.isArray(v)) return v;
  } catch {}
  const c = seedLibrary().categories;
  writeJson(KEYS.categories, c);
  return c;
}

export function saveCategories(categories: Category[]): void {
  writeJson(KEYS.categories, categories);
}

export function loadSettings(): AppSettings {
  try {
    const v = readJson<AppSettings>(KEYS.settings);
    if (v && typeof v === "object") return { ...DEFAULT_SETTINGS, ...v };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(KEYS.settings, settings);
}

export function createCategoryId(categories: Category[], name: string): Category | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
  const id = (() => {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch {}
    return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  })();
  return { id, name: trimmed, color };
}

export function librarySizeBytes(stories: Story[], categories: Category[], settings: AppSettings): number {
  try {
    return JSON.stringify(stories).length + JSON.stringify(categories).length + JSON.stringify(settings).length;
  } catch { return 0; }
}

// Helpers required by Bookshelf/Editor
export function getEffectiveShelfName(story: Story, categories: Category[]): string {
  try {
    const raw = (story as unknown as { categoryId?: string | null; category?: string | null }).categoryId
      ?? (story as unknown as { category?: string | null }).category ?? null;
    if (!raw) return "Unshelved";
    const found = categories.find(c => c.id === raw);
    return found ? found.name : String(raw);
  } catch { return "Unshelved"; }
}

export function getShelfCount(stories: Story[], categoryId: string): number {
  try {
    return stories.filter(s => {
      const cid = (s as unknown as { categoryId?: string | null; category?: string | null }).categoryId
        ?? (s as unknown as { category?: string | null }).category ?? null;
      return cid === categoryId;
    }).length;
  } catch { return 0; }
}

export function isDeletableCategory(categories: Category[], categoryId: string | null | undefined): boolean {
  try {
    if (!categoryId) return false;
    return categories.some(c => c.id === categoryId);
  } catch { return false; }
}

// PocketBase sync — pure, no mutations
let syncTimer: number | null = null;

export async function fetchRemoteStories(): Promise<Story[] | null> {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return null;
    const records = await pb.collection("cng_stories").getFullList({ sort: "-updated" });
    return records.map((r: Record<string, unknown>) => ({
      id: String((r as { id: string }).id),
      remoteId: String((r as { id: string }).id),
      title: String((r as { title?: string }).title || "Untitled"),
      content: String((r as { content?: string }).content || ""),
      categoryId: (r as { category?: string }).category ? String((r as { category?: string }).category) : null,
      createdAt: String((r as { created?: string }).created || new Date().toISOString()),
      updatedAt: String((r as { updated?: string }).updated || new Date().toISOString()),
    } as Story));
  } catch (err) {
    try { console.warn("PB fetch error:", err); } catch {}
    return null;
  }
}

export async function deleteRemoteStory(remoteId: string): Promise<void> {
  try {
    if (!pb.authStore.isValid || !remoteId) return;
    await pb.collection("cng_stories").delete(remoteId);
  } catch (err) {
    try { console.warn("delete remote failed:", err); } catch {}
    throw err;
  }
}

type SyncPatch = { id: string; title: string; content: string; category?: string | null; categoryId?: string | null; updated?: string };

export function queueSyncToPB(
  storiesOrPatch: Story[] | SyncPatch | SyncPatch[] | Record<string, unknown>,
  onAssigned?: (localId: string, remoteId: string) => void
): void {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return;
    if (syncTimer !== null) {
      try { window.clearTimeout(syncTimer); } catch {}
      syncTimer = null;
    }
    const normalize = (): SyncPatch[] => {
      try {
        if (Array.isArray(storiesOrPatch)) {
          return (storiesOrPatch as unknown[]).map((s) => {
            const o = s as Record<string, unknown>;
            return {
              id: String(o.id ?? ""),
              title: String(o.title ?? "Untitled"),
              content: String(o.content ?? ""),
              category: (o.category as string | null) ?? (o.categoryId as string | null) ?? null,
              categoryId: (o.categoryId as string | null) ?? (o.category as string | null) ?? null,
              updated: String((o.updated as string) ?? (o.updatedAt as string) ?? new Date().toISOString()),
            };
          }).filter(p => p.id);
        }
        if (storiesOrPatch && typeof storiesOrPatch === 'object' && 'id' in (storiesOrPatch as object)) {
          const o = storiesOrPatch as Record<string, unknown>;
          return [{
            id: String(o.id ?? ""),
            title: String(o.title ?? "Untitled"),
            content: String(o.content ?? ""),
            category: (o.category as string | null) ?? (o.categoryId as string | null) ?? null,
            categoryId: (o.categoryId as string | null) ?? (o.category as string | null) ?? null,
            updated: String((o.updated as string) ?? (o.updatedAt as string) ?? new Date().toISOString()),
          }];
        }
        return [];
      } catch { return []; }
    };
    const patches = normalize();
    if (patches.length === 0) return;
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      void (async () => {
        try {
          const userId = (pb.authStore.model as unknown as { id?: string })?.id;
          if (!userId) return;
          for (const story of patches) {
            try {
              if (story.id.startsWith("story-") && !(story as unknown as { remoteId?: string }).remoteId) {
                // Seed stories skip remote create until edited via real id flow; still allow
              }
              const wc = (story.content || "").trim().split(/\s+/).filter(Boolean).length;
              const catVal = story.category ?? story.categoryId ?? "";
              const payload: Record<string, unknown> = {
                title: story.title || "Untitled",
                content: story.content || "",
                category: catVal,
                word_count: wc,
                user: userId,
                user_id: userId,
              };
              const remoteId = (story as unknown as { remoteId?: string }).remoteId;
              if (remoteId) {
                try { await pb.collection("cng_stories").update(remoteId, payload); } catch {}
              } else {
                // Try update by id if exists remotely, else create
                try {
                  const created = await pb.collection("cng_stories").create(payload) as unknown as { id?: string };
                  if (created?.id && typeof onAssigned === 'function') {
                    try { onAssigned(story.id, created.id); } catch {}
                  }
                } catch {}
              }
            } catch {}
          }
        } catch {}
      })();
    }, 2000);
  } catch {}
}

// Backup helpers
export function buildBackup(stories: Story[], categories: Category[], settings?: AppSettings | null): BackupFile {
  return {
    kind: "cng-writer-backup" as const,
    app: "CnG Writer",
    version: 1,
    exportedAt: new Date().toISOString(),
    stories,
    categories,
    settings: settings ?? null,
  };
}

export function parseBackup(text: string): { stories: Story[]; categories: Category[]; settings?: AppSettings | null } | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const stories = (parsed.stories ?? parsed.data) as unknown;
    const categories = (parsed.categories ?? []) as unknown;
    if (Array.isArray(stories) && Array.isArray(categories)) {
      const settings = (parsed.settings ?? null) as AppSettings | null;
      return { stories: stories as Story[], categories: categories as Category[], settings };
    }
    // Also handle array-only backup
    if (Array.isArray(parsed)) return { stories: parsed as Story[], categories: [] };
    return null;
  } catch { return null; }
}

export function downloadJson(filenameOrData: string | unknown, dataMaybe?: unknown): void {
  try {
    let filename: string;
    let data: unknown;
    if (typeof filenameOrData === 'string' && dataMaybe !== undefined) {
      filename = filenameOrData;
      data = dataMaybe;
    } else if (typeof filenameOrData === 'string' && (filenameOrData.trim().startsWith('{') || filenameOrData.trim().startsWith('['))) {
      // accidental string json
      filename = `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      data = JSON.parse(filenameOrData);
    } else if (typeof filenameOrData === 'object' && filenameOrData !== null) {
      filename = `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      data = filenameOrData;
    } else if (typeof filenameOrData === 'string') {
      // filename with no data -> treat as filename for existing buildBackup call incorrectly routed?
      filename = filenameOrData.endsWith('.json') ? filenameOrData : `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      data = dataMaybe ?? {};
    } else {
      filename = `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      data = filenameOrData;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
  } catch {}
}
