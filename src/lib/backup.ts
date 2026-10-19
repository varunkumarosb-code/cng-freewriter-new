/**
 * backup.ts — all Backup & Export logic for CnG Writer.
 *
 * Pure, framework-free helpers. The storage layer hands in plain
 * `Story[]` / `Category[]` (whether they came from localStorage,
 * PocketBase, or anywhere else) and gets back portable files or
 * safely merged collections.
 */
import type {
  AppSettings,
  BackupFile,
  Category,
  ImportReport,
  Story,
} from "./types";
import { countWords, formatDate } from "./format";

export const APP_NAME = "CnG Writer";
export const BACKUP_KIND = "cng-writer-backup";
export const BACKUP_VERSION = 1;

/** Thrown for any user-facing import problem (bad JSON, wrong schema…). */
export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

/* ------------------------------------------------------------------ */
/* Filenames & downloads                                               */
/* ------------------------------------------------------------------ */

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/["'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "untitled-story";
}

export function dateSlug(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // 2026-05-21
}

/** Triggers a browser download for text content. Returns the filename. */
export function downloadFile(filename: string, content: string, mime = "application/json"): string {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}

/* ------------------------------------------------------------------ */
/* 1 · Full-library JSON backup                                        */
/* ------------------------------------------------------------------ */

export function buildBackup(
  stories: Story[],
  categories: Category[],
  settings: AppSettings,
): BackupFile {
  return {
    kind: BACKUP_KIND,
    app: APP_NAME,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    meta: {
      storyCount: stories.length,
      categoryCount: categories.length,
      totalWords: stories.reduce((sum, s) => sum + countWords(s.content), 0),
    },
    categories,
    stories,
    settings: { writerName: settings.writerName, lastBackupAt: settings.lastBackupAt },
  };
}

/** Serializes every story + category + metadata and downloads the `.json`. */
export function exportAllData(
  stories: Story[],
  categories: Category[],
  settings: AppSettings,
): string {
  const backup = buildBackup(stories, categories, settings);
  return downloadFile(
    `cng-writer-backup-${dateSlug()}.json`,
    JSON.stringify(backup, null, 2),
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Single-story serializers (.txt / .md)                           */
/* ------------------------------------------------------------------ */

export type StoryExportFormat = "txt" | "md";

/** Best-effort flattening of Markdown into clean reading text. */
export function stripMarkdown(md: string | null | undefined): string {
  const safe = md || "";
  return safe
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/gi, ""))
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-+*]{3,}\s*$/gm, "—")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Downloadable Markdown source with a title heading + meta byline. */
export function storyToMarkdown(story: Story, categoryName?: string | null): string {
  const words = countWords(story.content);
  const shelf = categoryName ?? "Unshelved";
  return [
    `# ${story.title || "Untitled"}`,
    "",
    `> ${shelf} · ${words.toLocaleString()} words · Last edited ${formatDate(story.updatedAt)}`,
    `> Exported from ${APP_NAME} on ${formatDate(new Date().toISOString())}`,
    "",
    story.content.trim(),
    "",
  ].join("\n");
}

/** Clean plain-text rendering, formatting stripped, letterpress header. */
export function storyToPlainText(story: Story, categoryName?: string | null): string {
  const title = (story.title || "Untitled").toUpperCase();
  const words = countWords(story.content);
  const shelf = categoryName ?? "Unshelved";
  const rule = "─".repeat(Math.min(56, Math.max(28, title.length + 4)));
  return [
    title,
    `${shelf} · ${words.toLocaleString()} words · Last edited ${formatDate(story.updatedAt)}`,
    rule,
    "",
    stripMarkdown(story.content),
    "",
  ].join("\n");
}

/** Downloads one story as `.txt` or `.md`. Returns the filename used. */
export function exportStory(
  story: Story,
  format: StoryExportFormat,
  categoryName?: string | null,
): string {
  const filename = `${slugify(story.title)}.${format}`;
  if (format === "md") return downloadFile(filename, storyToMarkdown(story, categoryName), "text/markdown");
  return downloadFile(filename, storyToPlainText(story, categoryName), "text/plain");
}

/* ------------------------------------------------------------------ */
/* 3 · Backup parsing, validation & safe merging                       */
/* ------------------------------------------------------------------ */

/** Reads an uploaded `.json` File into a validated {@link BackupFile}. */
export async function readBackupFile(file: File): Promise<BackupFile> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new BackupError("That file couldn't be read.");
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("This file isn't valid JSON.");
  }
  return validateBackup(data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function sanitizeStory(raw: unknown): Story | null {
  if (!isRecord(raw)) return null;
  const title = typeof raw.title === "string" ? raw.title : "";
  const content = typeof raw.content === "string" ? raw.content : "";
  if (!title.trim() && !content.trim()) return null; // nothing worth keeping
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    title: title.trim() || "Untitled",
    content,
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : null,
    createdAt: validIso(raw.createdAt) ?? new Date().toISOString(),
    updatedAt: validIso(raw.updatedAt) ?? new Date().toISOString(),
  };
}

function sanitizeCategory(raw: unknown): Category | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || typeof raw.name !== "string" || !raw.name.trim()) return null;
  return {
    id: raw.id,
    name: raw.name.trim(),
    color: typeof raw.color === "string" ? raw.color : "#8fa6c9",
  };
}

/**
 * Validates unknown parsed JSON into a BackupFile.
 * Accepts the native `{ kind: "cng-writer-backup", … }` envelope and,
 * as a courtesy, a bare array of stories from older/manual exports.
 */
export function validateBackup(data: unknown): BackupFile {
  if (Array.isArray(data)) {
    const stories = data.map(sanitizeStory).filter((s): s is Story => s !== null);
    if (stories.length === 0) throw new BackupError("No readable stories found in this file.");
    return {
      kind: BACKUP_KIND,
      app: APP_NAME,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      meta: {
        storyCount: stories.length,
        categoryCount: 0,
        totalWords: stories.reduce((n, s) => n + countWords(s.content), 0),
      },
      categories: [],
      stories,
      settings: null,
    };
  }

  if (!isRecord(data)) throw new BackupError("This file isn't a CnG Writer backup.");
  if (typeof data.kind === "string" && data.kind !== BACKUP_KIND) {
    throw new BackupError(`This JSON belongs to something else (“${data.kind}”).`);
  }
  if (!Array.isArray(data.stories)) throw new BackupError("This backup is missing its stories list.");

  const stories = (data.stories as unknown[]).map(sanitizeStory).filter((s): s is Story => s !== null);
  if (stories.length === 0) throw new BackupError("This backup doesn't contain any valid stories.");

  const categories = Array.isArray(data.categories)
    ? (data.categories as unknown[]).map(sanitizeCategory).filter((c): c is Category => c !== null)
    : [];

  const settings: Partial<AppSettings> | null = isRecord(data.settings)
    ? {
        writerName: typeof data.settings.writerName === "string" ? data.settings.writerName : undefined,
        lastBackupAt: validIso(data.settings.lastBackupAt) ?? undefined,
      }
    : null;

  return {
    kind: BACKUP_KIND,
    app: typeof data.app === "string" ? data.app : APP_NAME,
    version: typeof data.version === "number" ? data.version : 1,
    exportedAt: validIso(data.exportedAt) ?? new Date().toISOString(),
    meta: {
      storyCount: stories.length,
      categoryCount: categories.length,
      totalWords: stories.reduce((n, s) => n + countWords(s.content), 0),
    },
    categories,
    stories,
    settings,
  };
}

/**
 * Idempotent, non-destructive restore.
 *
 * Stories are matched by `id`; when both copies exist the one with the
 * newer `updatedAt` wins. Nothing in the current library is ever
 * deleted. Categories are deduped by both id and (case-insensitive) name.
 */
export function mergeBackup(
  current: { stories: Story[]; categories: Category[] },
  backup: BackupFile,
): { stories: Story[]; categories: Category[]; report: ImportReport } {
  const report: ImportReport = { added: 0, updated: 0, skipped: 0, categoriesAdded: 0 };

  const stories = [...current.stories];
  const storyIndex = new Map(stories.map((s, i) => [s.id, i] as const));

  for (const incoming of backup.stories) {
    const at = storyIndex.get(incoming.id);
    if (at === undefined) {
      stories.push(incoming);
      storyIndex.set(incoming.id, stories.length - 1);
      report.added++;
      continue;
    }
    const existing = stories[at];
    const differs =
      incoming.title !== existing.title ||
      incoming.content !== existing.content ||
      incoming.categoryId !== existing.categoryId;
    if (differs && Date.parse(incoming.updatedAt) > Date.parse(existing.updatedAt)) {
      stories[at] = incoming;
      report.updated++;
    } else {
      report.skipped++;
    }
  }

  const categories = [...current.categories];
  const catIds = new Set(categories.map((c) => c.id));
  const catNames = new Set(categories.map((c) => c.name.toLowerCase()));
  for (const incoming of backup.categories) {
    if (!catIds.has(incoming.id) && !catNames.has(incoming.name.toLowerCase())) {
      categories.push(incoming);
      catIds.add(incoming.id);
      catNames.add(incoming.name.toLowerCase());
      report.categoriesAdded++;
    }
  }

  return { stories, categories, report };
}
