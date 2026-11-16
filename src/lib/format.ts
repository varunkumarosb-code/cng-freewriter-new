export function countWords(text: string | null | undefined): number {
  if (!text || typeof text !== "string") return 0;
  const cleaned = text.replace(/[`*_~#>|\\[\\]()]/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export function readingMinutes(wordsOrText: number | string): number {
  let words: number;
  if (typeof wordsOrText === 'string') words = countWords(wordsOrText);
  else words = wordsOrText;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

export function formatLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

export function formatTime(d: Date): string {
  try { return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; }
}

export function timeAgo(iso: string): string {
  try {
    const then = new Date(iso).getTime();
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
    return formatDate(iso);
  } catch { return ""; }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function plural(n: number, singular: string, pluralForm?: string): string {
  return n === 1 ? singular : (pluralForm ?? `${singular}s`);
}

export function stripMarkdown(md: string | null | undefined): string {
  try {
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
  } catch { return md || ""; }
}
