// Defensive programming: text || "" before any string op

export function countWords(text: string | null | undefined): number {
  const safeText = text || "";
  if (!safeText || typeof safeText !== "string") return 0;
  const cleaned = safeText.replace(/[`*_~#>|[\]()]/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(textOrWords: string | number | null | undefined): number {
  const safe = textOrWords || "";
  let words: number;
  if (typeof safe === "string") words = countWords(safe);
  else if (typeof safe === "number") words = safe;
  else words = 0;
  return Math.max(1, Math.round(words / 200));
}

export function countChars(text: string | null | undefined): number {
  const safeText = text || "";
  return safeText.length;
}

export function stripMarkdown(md: string | null | undefined): string {
  const safe = md || "";
  try {
    return safe
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
    return safe;
  }
}

export function formatDate(iso: string | null | undefined): string {
  const safe = iso || "";
  try {
    if (!safe) return "";
    return new Date(safe).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function timeAgo(iso: string | null | undefined): string {
  const safe = iso || "";
  try {
    const then = new Date(safe).getTime();
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
    return formatDate(safe);
  } catch {
    return "";
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
