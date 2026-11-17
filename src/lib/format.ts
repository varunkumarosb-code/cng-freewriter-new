// All functions start with safeText guard per spec

export function countWords(text: string | null | undefined): number {
  const safeText = (text && typeof text === "string") ? text : "";
  if (!safeText) return 0;
  const cleaned = safeText.replace(/[`*_~#>|[\]()]/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function stripMarkdown(text: string | null | undefined): string {
  const safeText = (text && typeof text === "string") ? text : "";
  if (!safeText) return "";
  try {
    return safeText
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/gi, ""))
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
  } catch {
    return safeText;
  }
}

export function timeAgo(text: string | null | undefined): string {
  const safeText = (text && typeof text === "string") ? text : "";
  if (!safeText) return "";
  try {
    const then = new Date(safeText).getTime();
    if (Number.isNaN(then)) return "";
    const diff = Date.now() - then;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return formatDate(safeText);
  } catch {
    return "";
  }
}

export function formatDate(text: string | null | undefined): string {
  const safeText = (text && typeof text === "string") ? text : "";
  if (!safeText) return "";
  try {
    return new Date(safeText).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function readingMinutes(text: string | number | null | undefined): number {
  const safe = (text && typeof text === "string") ? text : typeof text === "number" ? String(text) : "";
  let words: number;
  if (typeof text === "number") words = text;
  else words = countWords(safe);
  return Math.max(1, Math.round(words / 200));
}

export function formatLongDate(text: string | null | undefined): string {
  const safeText = (text && typeof text === "string") ? text : "";
  if (!safeText) return "";
  try {
    return new Date(safeText).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}
