import type { AppSettings, BackupFile, Category, Story } from "./types";
import { countWords } from "./format";

const KEYS = {
  stories: "cngwriter:stories",
  categories: "cngwriter:categories",
  settings: "cngwriter:settings",
  theme: "cngwriter:theme",
} as const;

const LEGACY = {
  stories: "cng-writer:v1:stories",
  categories: "cng-writer:v1:categories",
  settings: "cng-writer:v1:settings",
  storiesAlt: "cngwriter:v1:stories",
  categoriesAlt: "cngwriter:v1:categories",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  writerName: "Writer",
  lastBackupAt: null,
  theme: "light",
};

const COLORS = ["#e5b168", "#8fa6c9", "#c49ad6", "#93bfa4", "#d98f8f", "#9fb8d4"];

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function migrate(): void {
  try {
    for (const k of Object.values(LEGACY)) {
      const v = localStorage.getItem(k);
      if (!v) continue;
      if (k.includes("stories") && !localStorage.getItem(KEYS.stories)) {
        try { localStorage.setItem(KEYS.stories, v); } catch {}
      }
      if (k.includes("categories") && !localStorage.getItem(KEYS.categories)) {
        try { localStorage.setItem(KEYS.categories, v); } catch {}
      }
      if (k.includes("settings") && !localStorage.getItem(KEYS.settings)) {
        try { localStorage.setItem(KEYS.settings, v); } catch {}
      }
    }
    const oldPb = localStorage.getItem("cng:pb_url");
    if (oldPb && !localStorage.getItem("cngwriter:pb_url")) {
      try { localStorage.setItem("cngwriter:pb_url", oldPb); } catch {}
    }
  } catch {}
}

const daysAgo = (n: number, h = 0) => new Date(Date.now() - n * 86_400_000 - h * 3_600_000).toISOString();

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
      category: "Novel",
      createdAt: daysAgo(21),
      updatedAt: daysAgo(0, 3),
      content: "## Chapter One — Salt and Static\n\nThe lighthouse at Cape Merrow had stood for a hundred years. Mara arrived on a grey morning, keys cold in her palm.\n\nShe had not come to keep the light — she had come to turn it off.",
    },
    {
      id: "story-rain",
      title: "Rain Notes",
      category: "Journal",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
      content: "Morning rain. Coffee. A good day to write a small truth and leave it alone.",
    },
  ];
  return { stories, categories, settings: { ...DEFAULT_SETTINGS } };
}

export function loadStories(): Story[] {
  try {
    migrate();
    const v = readJson<Story[]>(KEYS.stories);
    if (Array.isArray(v)) return normalizeStories(v);
  } catch {}
  const s = seedLibrary().stories;
  try { writeJson(KEYS.stories, s); } catch {}
  return s;
}
export function saveStories(stories: Story[]): void { writeJson(KEYS.stories, stories); }

export function loadCategories(): Category[] {
  try {
    migrate();
    const v = readJson<Category[]>(KEYS.categories);
    if (Array.isArray(v)) return v;
  } catch {}
  const c = seedLibrary().categories;
  writeJson(KEYS.categories, c);
  return c;
}
export function saveCategories(categories: Category[]): void { writeJson(KEYS.categories, categories); }

export function loadSettings(): AppSettings {
  try {
    const v = readJson<AppSettings>(KEYS.settings);
    if (v && typeof v === "object") return { ...DEFAULT_SETTINGS, ...v };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}
export function saveSettings(s: AppSettings): void { writeJson(KEYS.settings, s); }

export function loadTheme(): "light" | "dark" {
  try {
    const raw = localStorage.getItem(KEYS.theme);
    if (raw === "light" || raw === "dark") return raw;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch { return "light"; }
}
export function saveTheme(t: "light" | "dark"): void {
  try { localStorage.setItem(KEYS.theme, t); } catch {}
}

// Normalize legacy stories where categoryId was used
function normalizeStories(arr: Story[]): Story[] {
  return arr.map((s) => {
    const anyS = s as unknown as Record<string, unknown>;
    const cat = (anyS.category as string) ?? (anyS.categoryId as string) ?? "";
    return {
      id: String(anyS.id || crypto.randomUUID()),
      title: String(anyS.title || "Untitled"),
      content: String(anyS.content || ""),
      category: String(cat || ""),
      createdAt: String(anyS.createdAt || anyS.created || new Date().toISOString()),
      updatedAt: String(anyS.updatedAt || anyS.updated || new Date().toISOString()),
      remoteId: anyS.remoteId ? String(anyS.remoteId) : undefined,
    };
  });
}

export function createCategory(categories: Category[], name: string): Category | null {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const color = COLORS[categories.length % COLORS.length];
  const id = (() => { try { return crypto.randomUUID(); } catch { return `cat-${Date.now().toString(36)}`; }})();
  return { id, name: trimmed, color };
}

export function getEffectiveShelfName(story: Story | null | undefined, categories: Category[]): string {
  try {
    if (!story) return "Unshelved";
    const raw = (story.category || "").trim();
    if (!raw) return "Unshelved";
    // if raw matches a category name or id, show that name
    const byId = categories.find((c) => c.id === raw);
    if (byId) return byId.name;
    const byName = categories.find((c) => c.name.toLowerCase() === raw.toLowerCase());
    if (byName) return byName.name;
    return raw;
  } catch { return "Unshelved"; }
}

export function getShelfCount(stories: Story[], categoryName: string): number {
  try {
    const norm = (categoryName || "").toLowerCase();
    return stories.filter((s) => (s.category || "").toLowerCase() === norm).length;
  } catch { return 0; }
}

export function isDeletableCategory(categories: Category[], cat: string): boolean {
  try {
    if (!cat) return false;
    return categories.some((c) => c.name === cat || c.id === cat);
  } catch { return false; }
}

// Backup
export function buildBackup(stories: Story[], categories: Category[], settings?: AppSettings | null): BackupFile {
  const s = stories || [];
  const c = categories || [];
  return {
    kind: "cng-writer-backup",
    app: "CnG Writer",
    version: 1,
    exportedAt: new Date().toISOString(),
    stories: s,
    categories: c,
    settings: settings ?? null,
    meta: {
      storyCount: s.length,
      categoryCount: c.length,
      totalWords: s.reduce((n, st) => n + countWords(st.content), 0),
    },
  };
}

export function parseBackup(text: string): { stories: Story[]; categories: Category[]; settings?: AppSettings | null } | null {
  try {
    const safe = text || "";
    const parsed = JSON.parse(safe) as Record<string, unknown>;
    const stories = (parsed.stories ?? parsed.data) as unknown;
    const categories = (parsed.categories ?? []) as unknown;
    if (Array.isArray(stories) && Array.isArray(categories)) {
      return {
        stories: normalizeStories(stories as Story[]),
        categories: categories as Category[],
        settings: (parsed.settings as AppSettings | null) ?? null,
      };
    }
    if (Array.isArray(parsed)) return { stories: normalizeStories(parsed as Story[]), categories: [] };
    return null;
  } catch { return null; }
}

export function downloadJson(data: unknown, filename?: string): void {
  try {
    const safeName = filename || `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = safeName;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
  } catch {}
}

export function mergeByUpdatedAt(local: Story[], incoming: Story[]): Story[] {
  try {
    const byId = new Map<string, Story>();
    for (const s of local) byId.set(s.id, s);
    // also index by remoteId
    const byRemote = new Map<string, Story>();
    for (const s of local) if (s.remoteId) byRemote.set(s.remoteId, s);

    for (const inc of incoming) {
      // if incoming has remoteId matching local, merge
      if (inc.remoteId && byRemote.has(inc.remoteId)) {
        const existing = byRemote.get(inc.remoteId)!;
        const rt = new Date(inc.updatedAt || 0).getTime();
        const lt = new Date(existing.updatedAt || 0).getTime();
        if (rt > lt) byId.set(existing.id, { ...existing, ...inc, id: existing.id, remoteId: inc.remoteId });
        continue;
      }
      // if id directly matches
      if (byId.has(inc.id)) {
        const existing = byId.get(inc.id)!;
        const rt = new Date(inc.updatedAt || 0).getTime();
        const lt = new Date(existing.updatedAt || 0).getTime();
        if (rt > lt) byId.set(inc.id, { ...inc, remoteId: existing.remoteId || inc.remoteId });
        continue;
      }
      // new story
      byId.set(inc.id, inc);
    }
    return Array.from(byId.values());
  } catch { return local; }
}
