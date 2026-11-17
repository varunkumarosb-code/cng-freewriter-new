export function countWords(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const cleaned = text.replace(/[\r\n\t]+/g, " ").replace(/[#*_`~>-]/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(text: string): number {
  const w = countWords(text);
  return Math.max(1, Math.ceil(w / 200));
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "recently";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "recently";
  }
}

export function timeAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 45) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return formatDate(iso);
  } catch {
    return "recently";
  }
}

export function slugify(str: string): string {
  return (str || "untitled")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48) || "untitled";
}
