import { countWords } from "./format";

export interface TextSnapshot {
  id: string;
  storyId: string;
  content: string;
  title: string;
  wordCount: number;
  charCount: number;
  timestamp: number; // Date.now()
}

const MAX_SNAPSHOTS = 15;
const KEY_PREFIX = "cng_writer_snapshots_";

function keyFor(storyId: string): string {
  return `${KEY_PREFIX}${storyId}`;
}

export function getSnapshots(storyId: string): TextSnapshot[] {
  try {
    const raw = localStorage.getItem(keyFor(storyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate basic shape
    return parsed.filter((s: any) => s && typeof s.id === "string" && typeof s.content === "string");
  } catch {
    return [];
  }
}

export function saveSnapshots(storyId: string, snapshots: TextSnapshot[]): void {
  try {
    localStorage.setItem(keyFor(storyId), JSON.stringify(snapshots));
  } catch {
    // storage full: try pruning more aggressively
    try {
      const pruned = snapshots.slice(-MAX_SNAPSHOTS);
      localStorage.setItem(keyFor(storyId), JSON.stringify(pruned));
    } catch {}
  }
}

export function pruneSnapshots(snapshots: TextSnapshot[]): TextSnapshot[] {
  // Keep last 15, newest last (chronological). Caller may reverse for display.
  if (snapshots.length <= MAX_SNAPSHOTS) return snapshots;
  return snapshots.slice(-MAX_SNAPSHOTS);
}

export function createSnapshot(storyId: string, content: string, title: string): TextSnapshot {
  const now = Date.now();
  const snap: TextSnapshot = {
    id: `snap_${now}_${Math.random().toString(36).slice(2, 6)}`,
    storyId,
    content: content || "",
    title: title || "Untitled Story",
    wordCount: countWords(content || ""),
    charCount: (content || "").length,
    timestamp: now,
  };
  const existing = getSnapshots(storyId);
  existing.push(snap);
  const pruned = pruneSnapshots(existing);
  saveSnapshots(storyId, pruned);
  return snap;
}

export function shouldCreateSnapshot(storyId: string, newContent: string, newTitle: string): boolean {
  const snaps = getSnapshots(storyId);
  if (snaps.length === 0) return true;
  const last = snaps[snaps.length - 1];
  const lastContent = last.content || "";
  const lastTitle = last.title || "";
  const diff = Math.abs((newContent || "").length - lastContent.length);
  // Also consider title change as significant
  const titleChanged = (newTitle || "") !== lastTitle;
  if (titleChanged && diff > 0) return true;
  // >30 chars changed
  if (diff > 30) return true;
  // Every 3-5 minutes: check timestamp gap > 3 min (180000 ms)
  const timeGap = Date.now() - last.timestamp;
  if (timeGap > 180000) return true; // 3 minutes
  // Also content completely different (e.g., cleared)
  if ((newContent || "").length === 0 && lastContent.length > 0) return true;
  if (newContent !== lastContent && newContent.length > 0 && lastContent.length === 0) return true;
  return false;
}

// Debounced helper state per story
const lastCheckMap = new Map<string, number>();

export function maybeCreateSnapshot(storyId: string, content: string, title: string): TextSnapshot | null {
  const now = Date.now();
  const lastCheck = lastCheckMap.get(storyId) || 0;
  // Throttle checks to at most once per 2 seconds to avoid excessive localStorage reads
  if (now - lastCheck < 2000) return null;
  lastCheckMap.set(storyId, now);

  if (shouldCreateSnapshot(storyId, content, title)) {
    return createSnapshot(storyId, content, title);
  }
  return null;
}

// Explicit manual snapshot (always create)
export function createManualSnapshot(storyId: string, content: string, title: string): TextSnapshot {
  return createSnapshot(storyId, content, title);
}

// Utility for relative timestamp
export function formatRelativeTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mins ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  // Fallback to locale time
  try {
    const dt = new Date(ts);
    return dt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "recently";
  }
}

export function formatAbsoluteTimestamp(ts: number): string {
  try {
    const dt = new Date(ts);
    // Today 12:45 PM style
    const isToday = new Date().toDateString() === dt.toDateString();
    if (isToday) {
      return `Today ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    }
    return dt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return new Date(ts).toISOString();
  }
}
