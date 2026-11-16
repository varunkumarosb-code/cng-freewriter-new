import PocketBase from "pocketbase";
import type { Story } from "./types";

const PB_URL = "https://salaryzapp-pb.onrender.com";

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

// ---- Sync helpers ----

function wordCountFor(content: string | null | undefined): number {
  const safe = content || "";
  const s = safe.trim();
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Create or update a single story in PB.
 * CRITICAL: never send local id; let PB generate 15-char id.
 */
export async function syncOneToPocketBase(story: Story): Promise<string | null> {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return null;
    const userId = (pb.authStore.model as unknown as { id?: string })?.id;
    if (!userId) return null;

    const payload = {
      title: story.title || "Untitled",
      content: story.content || "",
      word_count: wordCountFor(story.content),
      category: story.category || "", // plain TEXT
      user_id: userId,
    };

    if (story.remoteId) {
      try {
        await pb.collection("cng_stories").update(story.remoteId, payload);
        return story.remoteId;
      } catch {
        // remote deleted or 404 → create anew
        const created = await pb.collection("cng_stories").create(payload) as unknown as { id: string };
        return created?.id ?? null;
      }
    } else {
      const created = await pb.collection("cng_stories").create(payload) as unknown as { id: string };
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
    const records = await pb.collection("cng_stories").getFullList({ sort: "-updated" });
    return records.map((r: Record<string, unknown>) => ({
      id: crypto.randomUUID(), // local id newly generated — will be remapped by merge on remoteId
      remoteId: String((r as { id: string }).id),
      title: String((r as { title?: string }).title || "Untitled"),
      content: String((r as { content?: string }).content || ""),
      category: String((r as { category?: string }).category || ""),
      createdAt: String((r as { created?: string }).created || new Date().toISOString()),
      updatedAt: String((r as { updated?: string }).updated || new Date().toISOString()),
    } as Story));
  } catch (err) {
    try { console.warn("[PB] fetch failed", err); } catch {}
    return null;
  }
}

export async function deleteRemoteStory(remoteId: string): Promise<void> {
  try {
    if (!pb.authStore.isValid || !remoteId) return;
    await pb.collection("cng_stories").delete(remoteId);
  } catch (err) {
    try { console.warn("[PB] delete failed", err); } catch {}
    // do not rethrow — local delete already done
  }
}

// Debounced queue for bulk saves
let syncTimer: number | null = null;
let pendingStories: Story[] = [];
let pendingCb: ((localId: string, remoteId: string) => void) | null = null;

export function queueSyncToPB(stories: Story[] | Story, onAssigned?: (localId: string, remoteId: string) => void): void {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return;
    const arr = Array.isArray(stories) ? stories : [stories];
    if (arr.length === 0) return;
    pendingStories = arr;
    if (typeof onAssigned === "function") pendingCb = onAssigned;
    if (syncTimer !== null) {
      try { window.clearTimeout(syncTimer); } catch {}
      syncTimer = null;
    }
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      const batch = pendingStories.slice();
      const cb = pendingCb;
      pendingStories = [];
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
