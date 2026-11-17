import { countWords, formatDate } from "./format";
import type { Category, Story } from "./types";

export function slugify(text: string | null | undefined): string {
  const safeText = (text && typeof text === "string") ? text : "";
  if (!safeText) return "untitled-story";
  try {
    return safeText.toLowerCase().trim().replace(/["'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "untitled-story";
  } catch { return "untitled-story"; }
}

export function storyToMarkdown(text: Story | null | undefined, shelf?: string | null | undefined): string {
  const safeShelf = (shelf && typeof shelf === "string") ? shelf : "Unshelved";
  if (!text || typeof text !== "object") return "";
  const safeTitle = (text.title && typeof text.title === "string") ? text.title : "Untitled";
  const safeContent = (text.content && typeof text.content === "string") ? text.content : "";
  const safeUpdated = (text.updatedAt && typeof text.updatedAt === "string") ? text.updatedAt : new Date().toISOString();
  try {
    const words = countWords(safeContent);
    return [`# ${safeTitle}`, "", `> ${safeShelf} · ${words.toLocaleString()} words · Last edited ${formatDate(safeUpdated)}`, `> Exported from CnG Writer on ${formatDate(new Date().toISOString())}`, "", safeContent.trim(), ""].join("\n");
  } catch { return safeContent; }
}

export function storyToPlainText(text: Story | null | undefined, shelf?: string | null | undefined): string {
  const safeShelf = (shelf && typeof shelf === "string") ? shelf : "Unshelved";
  if (!text || typeof text !== "object") return "";
  const safeTitle = (text.title && typeof text.title === "string") ? text.title : "Untitled";
  const safeContent = (text.content && typeof text.content === "string") ? text.content : "";
  const safeUpdated = (text.updatedAt && typeof text.updatedAt === "string") ? text.updatedAt : new Date().toISOString();
  try {
    const words = countWords(safeContent);
    const rule = "─".repeat(Math.min(56, Math.max(28, safeTitle.length + 4)));
    return [safeTitle.toUpperCase(), `${safeShelf} · ${words.toLocaleString()} words · Last edited ${formatDate(safeUpdated)}`, rule, "", stripMarkdown(safeContent), ""].join("\n");
  } catch { return stripMarkdown(safeContent); }
}

export function stripMarkdown(md: string | null | undefined): string {
  const safeText = (md && typeof md === "string") ? md : "";
  if (!safeText) return "";
  try {
    return safeText
      .replace(/```[\s\S]*?```/g, (b) => b.replace(/```[a-z]*\n?/gi, ""))
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^\n]+)\*/g, "$1")
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
  } catch { return safeText; }
}

export function downloadFile(filename: string | null | undefined, content: string | null | undefined, mime = "text/plain"): void {
  const safeName = (filename && typeof filename === "string") ? filename : "download.txt";
  const safeContent = (content && typeof content === "string") ? content : "";
  try {
    const blob = new Blob([safeContent], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = safeName;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
  } catch {}
}

// JSON export/import (Backup panel)
export function buildBackupJson(stories: Story[], categories: Category[], writerName?: string) {
  const safeStories = Array.isArray(stories) ? stories : [];
  const safeCats = Array.isArray(categories) ? categories : [];
  const safeName = (writerName && typeof writerName === "string") ? writerName : "Writer";
  return {
    kind: "cng-writer-backup" as const,
    app: "CnG Writer",
    version: 1,
    exportedAt: new Date().toISOString(),
    stories: safeStories,
    categories: safeCats,
    settings: { writerName: safeName, lastBackupAt: new Date().toISOString() },
    meta: {
      storyCount: safeStories.length,
      categoryCount: safeCats.length,
      totalWords: safeStories.reduce((n, s) => {
        const c = (s.content && typeof s.content === "string") ? s.content : "";
        return n + countWords(c);
      }, 0),
    },
  };
}

export function downloadBackupJson(stories: Story[], categories: Category[], writerName?: string) {
  try {
    const data = buildBackupJson(stories, categories, writerName);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cng-writer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
  } catch {}
}

export function parseBackupJson(text: string | null | undefined): { stories: Story[]; categories: Category[] } | null {
  const safeText = (text && typeof text === "string") ? text : "";
  if (!safeText) return null;
  try {
    const parsed = JSON.parse(safeText) as Record<string, unknown>;
    const stories = (parsed.stories ?? parsed.data) as unknown;
    const categories = (parsed.categories ?? []) as unknown;
    if (Array.isArray(stories) && Array.isArray(categories)) {
      return { stories: stories as Story[], categories: categories as Category[] };
    }
    if (Array.isArray(parsed)) return { stories: parsed as Story[], categories: [] };
    return null;
  } catch { return null; }
}
