import { countWords, formatDate } from "./format";
import type { Story } from "./types";

export function slugify(input: string | null | undefined): string {
  const safe = input || "";
  try {
    return safe.toLowerCase().trim().replace(/["'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "untitled-story";
  } catch { return "untitled-story"; }
}

export function stripMarkdown(md: string | null | undefined): string {
  const safe = md || "";
  try {
    return safe
      .replace(/```[\s\S]*?```/g, (b: string) => b.replace(/```[a-z]*\n?/gi, ""))
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
  } catch { return safe; }
}

export function storyToMarkdown(story: Story, shelf?: string | null | undefined): string {
  const safeTitle = story?.title || "Untitled";
  const safeContent = story?.content || "";
  const s = shelf || "Unshelved";
  try {
    const words = countWords(safeContent);
    return [`# ${safeTitle}`, "", `> ${s} · ${words.toLocaleString()} words · Last edited ${formatDate(story.updatedAt)}`, `> Exported from CnG Writer on ${formatDate(new Date().toISOString())}`, "", safeContent.trim(), ""].join("\n");
  } catch { return safeContent; }
}

export function storyToPlainText(story: Story, shelf?: string | null | undefined): string {
  const safeTitle = story?.title || "Untitled";
  const safeContent = story?.content || "";
  const s = shelf || "Unshelved";
  try {
    const words = countWords(safeContent);
    const rule = "─".repeat(Math.min(56, Math.max(28, safeTitle.length + 4)));
    return [safeTitle.toUpperCase(), `${s} · ${words.toLocaleString()} words · Last edited ${formatDate(story.updatedAt)}`, rule, "", stripMarkdown(safeContent), ""].join("\n");
  } catch { return stripMarkdown(safeContent); }
}

export function downloadFile(filename: string, content: string | null | undefined, mime = "text/plain"): void {
  const safe = content || "";
  try {
    const blob = new Blob([safe], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 2000);
  } catch {}
}
