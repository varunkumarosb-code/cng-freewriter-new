import type { AppSettings, BackupData, Category, Story } from "./types";
import { countWords, formatDate } from "./format";

export function buildBackup(stories: Story[], categories: Category[], settings: AppSettings): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    stories,
  };
}

export function parseBackup(jsonStr: string): BackupData | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== "object") return null;
    const stories = Array.isArray(parsed.stories) ? parsed.stories : [];
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    return {
      version: 1,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      settings: parsed.settings,
      categories,
      stories,
    };
  } catch {
    return null;
  }
}

export function downloadFile(filename: string, text: string, mime: string) {
  try {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("downloadFile error:", e);
  }
}

export function storyToMarkdown(story: Story, shelfName: string): string {
  const title = (story.title && typeof story.title === "string") ? story.title : "Untitled";
  const content = (story.content && typeof story.content === "string") ? story.content : "";
  return `# ${title}\n\n*Shelf: ${shelfName} · Updated: ${formatDate(story.updatedAt)}*\n\n---\n\n${content}\n`;
}

export function storyToPlainText(story: Story, shelfName: string): string {
  const title = (story.title && typeof story.title === "string") ? story.title : "Untitled";
  const content = (story.content && typeof story.content === "string") ? story.content : "";
  return `${title}\nShelf: ${shelfName} · Updated: ${formatDate(story.updatedAt)}\n\n${content}\n`;
}

export function printStoryPDF(story: Story, shelfName: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const title = (story.title && typeof story.title === "string") ? story.title : "Untitled";
  const content = (story.content && typeof story.content === "string") ? story.content : "";
  const esc = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  const words = countWords(content);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@media print{@page{margin:18mm}} body{font-family:ui-serif,Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#15221d;background:#f2f5f3} h1{font-size:28px;margin:0 0 8px} .meta{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#52635c;margin-bottom:16px} hr{border:none;border-top:1px solid #d8e2dc;margin:16px 0} pre{white-space:pre-wrap;font-family:inherit;font-size:17px;line-height:1.8}</style></head><body><h1>${title}</h1><div class="meta">${shelfName} · ${words.toLocaleString()} words · ${formatDate(story.updatedAt)}</div><hr/><pre>${esc}</pre></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    try { w.print(); } catch {}
  }, 300);
}
