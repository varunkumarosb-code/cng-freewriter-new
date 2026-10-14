/* ------------------------------------------------------------------ */
/*  Shared model & helpers for CnG Writer                             */
/* ------------------------------------------------------------------ */

export interface Story {
  /** Stable app-level id (local ids are prefixed with "l_") */
  id: string;
  /** PocketBase record id once synced to the "stories" collection */
  remoteId?: string;
  title: string;
  content: string;
  genre: GenreKey;
  word_count: number;
  user_id: string;
  created: string; // ISO
  updated: string; // ISO
  origin: "local" | "cloud";
  /** true when local copy is newer than the cloud copy / not yet synced */
  pending?: boolean;
}

export type ConnStatus = "local" | "connecting" | "connected" | "error";

export type AuthMethod = "password" | "token" | "none";

export interface PBConfig {
  url: string;
  method: AuthMethod;
  email: string;
  password: string;
  token: string;
}

export const EMPTY_CONFIG: PBConfig = {
  url: "http://127.0.0.1:8090",
  method: "password",
  email: "",
  password: "",
  token: "",
};

/* ------------------------------ genres ----------------------------- */

export interface Genre {
  key: GenreKey;
  label: string;
  hue: number; // used to paint covers & chips
}

export type GenreKey =
  | "fiction"
  | "fantasy"
  | "scifi"
  | "mystery"
  | "romance"
  | "thriller"
  | "nonfiction"
  | "poetry"
  | "memoir"
  | "adventure";

export const GENRES: Genre[] = [
  { key: "fiction", label: "Fiction", hue: 42 },
  { key: "fantasy", label: "Fantasy", hue: 265 },
  { key: "scifi", label: "Sci-Fi", hue: 195 },
  { key: "mystery", label: "Mystery", hue: 222 },
  { key: "romance", label: "Romance", hue: 340 },
  { key: "thriller", label: "Thriller", hue: 12 },
  { key: "nonfiction", label: "Non-Fiction", hue: 152 },
  { key: "poetry", label: "Poetry", hue: 300 },
  { key: "memoir", label: "Memoir", hue: 26 },
  { key: "adventure", label: "Adventure", hue: 100 },
];

export const genreByKey = (key: string): Genre =>
  GENRES.find((g) => g.key === key) ?? GENRES[0];

/* ----------------------------- helpers ----------------------------- */

export const uid = (): string =>
  `l_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;

export const nowISO = (): string => new Date().toISOString();

export const countWords = (text: string): number => {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
};

export const countChars = (text: string): number => text.length;

/** minutes needed to read, at a comfortable ~200 wpm */
export const readingMinutes = (words: number): number =>
  words <= 0 ? 0 : Math.max(1, Math.round(words / 200));

export const fmtNum = (n: number): string => n.toLocaleString("en-US");

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

/** Compact relative timestamp: "just now", "4m ago", "3d ago" … */
export const rel = (iso: string): string => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = s / 60;
  if (m < 1) return "1m ago";
  if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.round(d)}d ago`;
  return fmtDate(iso);
};

export const displayTitle = (s: Story): string =>
  s.title.trim() || s.content.trim().split("\n")[0]?.slice(0, 60) || "Untitled";
