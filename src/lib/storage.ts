import type { AppSettings, Category, Story, Theme } from "./types";

const KEY_STORIES = "cngwriter:stories";
const KEY_CATEGORIES = "cngwriter:categories";
const KEY_SETTINGS = "cngwriter:settings";
const KEY_THEME = "cngwriter:theme";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-novel", name: "Novel", order: 0 },
  { id: "cat-essays", name: "Essays", order: 1 },
  { id: "cat-poetry", name: "Poetry", order: 2 },
  { id: "cat-journal", name: "Journal", order: 3 },
];

const SEED_STORY: Story = {
  id: "story-lighthouse",
  title: "The Last Lighthouse",
  content: `Chapter One — Salt and Static\n\nThe lighthouse at Cape Merrow had survived three wars and four centuries of Atlantic gales, but it was the silence that finally threatened to bring it down.\n\nElias wound the clockwork brass lantern at 5:00 PM every evening without fail. The gears gave a familiar metallic hum — twelve slow clicks per revolution, calibrated to sweep the beam across sixty nautical miles of dark water.\n\n"Keep writing," he muttered to himself as the Atlantic roared below.`,
  categoryId: "cat-novel",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function loadStories(): Story[] {
  try {
    const s = localStorage.getItem(KEY_STORIES);
    if (!s) return [SEED_STORY];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SEED_STORY];
  } catch {
    return [SEED_STORY];
  }
}

export function saveStories(stories: Story[]) {
  try { localStorage.setItem(KEY_STORIES, JSON.stringify(stories)); } catch {}
}

export function loadCategories(): Category[] {
  try {
    const s = localStorage.getItem(KEY_CATEGORIES);
    if (!s) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]) {
  try { localStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories)); } catch {}
}

export function loadSettings(): AppSettings {
  try {
    const s = localStorage.getItem(KEY_SETTINGS);
    if (!s) return { writerName: "Writer", lastBackupAt: null };
    return JSON.parse(s);
  } catch {
    return { writerName: "Writer", lastBackupAt: null };
  }
}

export function saveSettings(settings: AppSettings) {
  try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings)); } catch {}
}

export function loadTheme(): Theme {
  try {
    const s = localStorage.getItem(KEY_THEME);
    if (s === "light" || s === "dark") return s;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

export function saveTheme(theme: Theme) {
  try { localStorage.setItem(KEY_THEME, theme); } catch {}
}

const KEY_AUTOSAVE_DELAY = "cng_autosave_delay_sec";

export function getAutosaveDelayMs(): number {
  try {
    const raw = localStorage.getItem(KEY_AUTOSAVE_DELAY);
    if (raw !== null) {
      const sec = parseInt(raw, 10);
      if (!Number.isNaN(sec)) {
        const clamped = Math.min(60, Math.max(1, sec));
        return clamped * 1000;
      }
    }
  } catch {}
  return 5000;
}

export function getAutosaveDelaySec(): number {
  return Math.round(getAutosaveDelayMs() / 1000);
}

export function setAutosaveDelaySec(sec: number): void {
  try {
    const clamped = Math.min(60, Math.max(1, Math.round(sec)));
    localStorage.setItem(KEY_AUTOSAVE_DELAY, String(clamped));
  } catch {}
}

export function getEffectiveShelfName(story: Story, categories: Category[]): string {
  if (!story.categoryId) return "Unshelved";
  const c = categories.find((cat) => cat.id === story.categoryId);
  return c ? c.name : "Unshelved";
}

export function getShelfCount(stories: Story[], shelfName: string, categories: Category[]): number {
  if (shelfName === "Trash 🗑️" || shelfName.toLowerCase() === "trash") return stories.filter((s) => !!s.deletedAt).length;
  if (shelfName === "All") return stories.filter((s) => !s.deletedAt).length;
  if (shelfName === "Unshelved") {
    return stories.filter((s) => !s.deletedAt && (!s.categoryId || !categories.some((c) => c.id === s.categoryId))).length;
  }
  const cat = categories.find((c) => c.name.toLowerCase() === shelfName.toLowerCase());
  if (!cat) return 0;
  return stories.filter((s) => !s.deletedAt && s.categoryId === cat.id).length;
}

export function mergeByUpdatedAt(local: Story[], incoming: Story[]): Story[] {
  const map = new Map<string, Story>();
  for (const s of local) map.set(s.id, s);
  for (const inc of incoming) {
    const ex = map.get(inc.id);
    if (!ex) {
      map.set(inc.id, inc);
    } else {
      const ext = new Date(ex.updatedAt).getTime();
      const inct = new Date(inc.updatedAt).getTime();
      if (inct >= ext) map.set(inc.id, inc);
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
