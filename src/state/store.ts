import type { AppSettings, Category, Story, Theme, ToastItem } from "../lib/types";
import {
  loadCategories,
  loadSettings,
  loadStories,
  loadTheme,
  mergeByUpdatedAt,
  saveCategories,
  saveSettings,
  saveStories,
  saveTheme,
} from "../lib/storage";
import { buildBackup, parseBackup } from "../lib/backup";

export type Listener = () => void;

class Store {
  stories: Story[] = loadStories();
  categories: Category[] = loadCategories();
  settings: AppSettings = loadSettings();
  theme: Theme = loadTheme();
  toasts: ToastItem[] = [];
  activeStoryId: string | null = null;
  syncing: boolean = false;
  authEmail: string | null = null;

  private listeners: Set<Listener> = new Set();
  private saveTimer: number | null = null;

  constructor() {
    // Pure local-first: no cloud auth listeners
    const saved = this.theme;
    try {
      if (saved === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch {}
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    for (const l of this.listeners) {
      try { l(); } catch (e) { console.error("Store listener error:", e); }
    }
  }

  private schedulePersist() {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      saveStories(this.stories);
      saveCategories(this.categories);
      saveSettings(this.settings);
      this.saveTimer = null;
    }, 150);
  }

  setActiveStory(id: string | null) {
    this.activeStoryId = id;
    this.notify();
  }

  setTheme(t: Theme) {
    this.theme = t;
    saveTheme(t);
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    this.notify();
  }

  toast(message: string, tone: ToastItem["tone"] = "ok") {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.toasts.push({ id, message, tone });
    this.notify();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.notify();
    }, 2800);
  }

  dismissToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  createStory(initialCategoryId?: string): Story {
    const id = `story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const next: Story = {
      id,
      title: "Untitled Story",
      content: "",
      categoryId: initialCategoryId || this.categories[0]?.id || "",
      createdAt: now,
      updatedAt: now,
    };
    this.stories = [next, ...this.stories];
    this.schedulePersist();
    this.toast("New story created", "ok");
    this.setActiveStory(next.id);
    return next;
  }

  updateStory(id: string, patch: Partial<Story>) {
    const now = new Date().toISOString();
    this.stories = this.stories.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        ...patch,
        updatedAt: now,
      };
    });
    this.schedulePersist();
    this.notify();
  }

  deleteStory(id: string) {
    this.stories = this.stories.filter((s) => s.id !== id);
    if (this.activeStoryId === id) this.activeStoryId = null;
    this.schedulePersist();
    this.toast("Story deleted", "ok");
    this.notify();
  }

  addCategory(name: string): Category | null {
    const clean = name.trim();
    if (!clean) return null;
    const exists = this.categories.find((c) => c.name.toLowerCase() === clean.toLowerCase());
    if (exists) return exists;
    const cat: Category = {
      id: `cat-${Date.now()}`,
      name: clean,
      order: this.categories.length,
    };
    this.categories.push(cat);
    this.schedulePersist();
    this.toast(`Shelf "${clean}" added`, "ok");
    this.notify();
    return cat;
  }

  exportAllBackup() {
    const backup = buildBackup(this.stories, this.categories, this.settings);
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast("Library exported", "ok");
  }

  importBackupText(jsonStr: string): boolean {
    const parsed = parseBackup(jsonStr);
    if (!parsed) {
      this.toast("Invalid backup JSON", "error");
      return false;
    }
    this.stories = mergeByUpdatedAt(this.stories, parsed.stories);
    const catMap = new Map(this.categories.map((c) => [c.name.toLowerCase(), c] as const));
    for (const c of parsed.categories) {
      if (!catMap.has(c.name.toLowerCase())) catMap.set(c.name.toLowerCase(), c);
    }
    this.categories = Array.from(catMap.values());
    if (parsed.settings) this.settings = { ...this.settings, ...parsed.settings };
    this.schedulePersist();
    this.toast(`Imported ${parsed.stories.length} stories`, "ok");
    this.notify();
    return true;
  }

  // Kept as no-ops for API compat (local-first white-label)
  async login(_email: string, _pass: string) {
    this.toast("Local-first mode — no sign-in required", "info");
  }

  logout() {
    this.toast("Local Sanctuary — 100% Private", "info");
    this.notify();
  }

  async refreshFromCloud() {
    return;
  }
}

export const store = new Store();
