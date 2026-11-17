import PocketBase from "pocketbase";
import type { Story } from "./types";

// Option B isolated collections
const PB_URL = "https://salaryzapp-pb.onrender.com";
export const WRITER_USERS = "writer_users";
export const WRITER_STORIES = "writer_stories";

function getStoredUrl(): string {
  try {
    const a = localStorage.getItem("cngwriter:pb_url");
    if (a) return a;
    const legacy = localStorage.getItem("cng:pb_url");
    if (legacy) {
      try { localStorage.setItem("cngwriter:pb_url", legacy); } catch {}
      return legacy;
    }
  } catch {}
  return PB_URL;
}

export const pb = new PocketBase(getStoredUrl());
pb.autoCancellation(false);

export function getPbUrl(): string {
  try { return pb.baseUrl || getStoredUrl(); } catch { return PB_URL; }
}

export function updatePbUrl(url: string): void {
  try {
    const clean = (url || "").trim().replace(/\/+$/, "");
    if (!clean) return;
    try { localStorage.setItem("cngwriter:pb_url", clean); } catch {}
    pb.baseUrl = clean;
  } catch {}
}

export function savePbToken(token?: string): void {
  try {
    const toSave = typeof token === "string" ? token : pb.authStore.token;
    if (toSave) localStorage.setItem("cngwriter:pb_token", toSave);
    else localStorage.removeItem("cngwriter:pb_token");
  } catch {}
}

export function loadPbToken(): string | null {
  try {
    const t = localStorage.getItem("cngwriter:pb_token");
    if (t) {
      try { (pb.authStore as unknown as { save: (tok: string) => void }).save(t); } catch {}
      return t;
    }
    return null;
  } catch { return null; }
}

try { loadPbToken(); } catch {}

// ------------------------------------------------------------------
// Auth — MUST use writer_users
// ------------------------------------------------------------------
export async function loginWriter(email: string, password: string) {
  const safeEmail = (email && typeof email === "string") ? email.trim() : "";
  const safePass = (password && typeof password === "string") ? password : "";
  const auth = await pb.collection(WRITER_USERS).authWithPassword(safeEmail, safePass);
  try { savePbToken((auth as unknown as { token: string }).token); } catch {}
  return auth;
}

export function logoutWriter(): void {
  try { pb.authStore.clear(); } catch {}
  try { savePbToken(""); } catch {}
}

// ------------------------------------------------------------------
// Sync helpers — strict Option B rules
// ------------------------------------------------------------------
function wordCountFor(content: string | null | undefined): number {
  const safeText = (content && typeof content === "string") ? content : "";
  const t = safeText.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/**
 * Create or update ONE story.
 * - NEVER pass local id (crypto.randomUUID or seed like story-lighthouse) in payload.
 * - Only call update() if story.remoteId is valid.
 * - Let PB generate its 15-char id, store as story.remoteId.
 */
export async function syncOneToPocketBase(story: Story): Promise<string | null> {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return null;
    const userId = (pb.authStore.model as unknown as { id?: string })?.id;
    if (!userId) return null;

    const safeTitle = (story.title && typeof story.title === "string") ? story.title : "";
    const safeContent = (story.content && typeof story.content === "string") ? story.content : "";
    const safeCategory = (story.categoryId && typeof story.categoryId === "string") ? story.categoryId : "";

    // Resolve category TEXT value — if categoryId is an internal id like cat-novel,
    // we send the id as category text; consumer can map to name. Never send relation.
    const payload = {
      title: safeTitle || "Untitled",
      content: safeContent,
      category: safeCategory, // plain TEXT
      word_count: wordCountFor(safeContent),
      user_id: userId, // relation to writer_users
    };

    // Rule 4 & 5: only update if remoteId is valid (15-char PB id)
    // Self-healing: on 404 reset remoteId and fallback to create, never crash UI
    if (story.remoteId && typeof story.remoteId === "string" && story.remoteId.length >= 12) {
      try {
        await pb.collection(WRITER_STORIES).update(story.remoteId, payload);
        return story.remoteId;
      } catch (err) {
        // 404 self-healing
        try {
          const anyErr = err as Record<string, unknown>;
          const is404 = (anyErr?.status === 404) || String((anyErr as unknown as { message?: string })?.message || "").includes("404") || String((anyErr?.data as unknown as string) || "").includes("not found");
          if (is404) {
            try { story.remoteId = undefined; } catch {}
          }
        } catch {}
        try {
          const created = await pb.collection(WRITER_STORIES).create(payload) as unknown as { id: string };
          const newId = created?.id ? String(created.id) : null;
          if (newId) { try { story.remoteId = newId; } catch {} }
          return newId ?? null;
        } catch {
          // also try legacy cng_stories for spec compat
          try {
            await pb.collection('cng_stories').update(story.remoteId || "", payload);
            return story.remoteId || null;
          } catch (err2) {
            try {
              const any2 = err2 as Record<string, unknown>;
              const is404b = (any2?.status === 404) || String((any2 as unknown as { message?: string })?.message || "").includes("404");
              if (is404b) { try { story.remoteId = undefined; } catch {} }
            } catch {}
            try {
              const created2 = await pb.collection('cng_stories').create(payload) as unknown as { id: string };
              const newId2 = created2?.id ? String(created2.id) : null;
              if (newId2) { try { story.remoteId = newId2; } catch {} }
              return newId2 ?? null;
            } catch { return null; }
          }
        }
      }
    } else {
      // Create — NEVER include local id in payload
      const created = await pb.collection(WRITER_STORIES).create(payload) as unknown as { id: string };
      return created?.id ?? null;
    }
  } catch (err) {
    try { console.warn("[PB] syncOne failed", err); } catch {}
    return null;
  }
}

export async function fetchRemoteStories(): Promise<Story[] | null> {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return null;
    const records = await pb.collection(WRITER_STORIES).getFullList({ sort: "-updated" });
    return records.map((r: Record<string, unknown>) => ({
      id: crypto.randomUUID(), // fresh local id — will be remapped by merge on remoteId in LibraryContext
      remoteId: String((r as { id: string }).id),
      title: String((r as { title?: string }).title || "Untitled"),
      content: String((r as { content?: string }).content || ""),
      categoryId: String((r as { category?: string }).category || ""),
      createdAt: String((r as { created?: string }).created || new Date().toISOString()),
      updatedAt: String((r as { updated?: string }).updated || new Date().toISOString()),
    } as Story));
  } catch (err) {
    try { console.warn("[PB] fetch failed", err); } catch {}
    return null;
  }
}

export async function deleteRemoteStory(remoteId: string | null | undefined): Promise<void> {
  try {
    const safeId = (remoteId && typeof remoteId === "string") ? remoteId : "";
    if (!safeId) return;
    if (!pb.authStore.isValid) return;
    await pb.collection(WRITER_STORIES).delete(safeId);
  } catch (err) {
    try { console.warn("[PB] delete failed", err); } catch {}
  }
}

// Debounced background queue
let syncTimer: number | null = null;
let pending: Story[] = [];
let pendingCb: ((localId: string, remoteId: string) => void) | null = null;

export function queueSyncToPB(stories: Story[] | Story, onAssigned?: (localId: string, remoteId: string) => void): void {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return;
    const arr = Array.isArray(stories) ? stories : [stories];
    if (arr.length === 0) return;
    pending = arr;
    if (typeof onAssigned === "function") pendingCb = onAssigned;
    if (syncTimer !== null) { try { window.clearTimeout(syncTimer); } catch {} syncTimer = null; }
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      const batch = pending.slice();
      const cb = pendingCb;
      pending = [];
      pendingCb = null;
      void (async () => {
        for (const s of batch) {
          try {
            const newRemoteId = await syncOneToPocketBase(s);
            if (newRemoteId && !s.remoteId && typeof cb === "function") {
              try { cb(s.id, newRemoteId); } catch {}
            }
          } catch {}
        }
      })();
    }, 2000);
  } catch {}
}
