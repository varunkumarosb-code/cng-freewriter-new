import PocketBase from "pocketbase";
import type { Story } from "./types";
import { countWords } from "./format";

export const DEFAULT_PB_URL = "https://salaryzapp-pb.onrender.com";

function getInitialPbUrl(): string {
  try {
    const saved = localStorage.getItem("cngwriter:pb_url");
    if (saved && typeof saved === "string" && saved.startsWith("http")) return saved;
  } catch {}
  return DEFAULT_PB_URL;
}

export const pb = new PocketBase(getInitialPbUrl());
pb.autoCancellation(false);

try {
  const savedToken = localStorage.getItem("cngwriter:pb_token");
  if (savedToken) {
    pb.authStore.save(savedToken, pb.authStore.model);
  }
} catch {}

export function setCustomPbUrl(url: string) {
  const safe = (url && typeof url === "string") ? url.trim() : "";
  if (!safe || !safe.startsWith("http")) return;
  try {
    localStorage.setItem("cngwriter:pb_url", safe);
    pb.baseUrl = safe;
  } catch {}
}

export async function fetchRemoteStories(): Promise<Story[]> {
  if (!pb.authStore.isValid) return [];
  try {
    const records = await pb.collection("cng_stories").getFullList({
      sort: "-updated",
      requestKey: null,
    });
    return records.map((r) => ({
      id: `remote_${r.id}`,
      title: (r.title && typeof r.title === "string") ? r.title : "Untitled",
      content: (r.content && typeof r.content === "string") ? r.content : "",
      categoryId: (r.category && typeof r.category === "string") ? r.category : "",
      createdAt: r.created || new Date().toISOString(),
      updatedAt: r.updated || new Date().toISOString(),
      remoteId: r.id,
    }));
  } catch (e) {
    console.warn("CnG Cloud fetch failed:", e);
    return [];
  }
}

export async function deleteRemoteStory(remoteId: string): Promise<boolean> {
  if (!pb.authStore.isValid || !remoteId) return false;
  try {
    await pb.collection("cng_stories").delete(remoteId);
    return true;
  } catch (e) {
    console.warn("CnG Cloud delete failed:", e);
    return false;
  }
}

let syncQueueTimer: number | null = null;
const pendingSyncStories = new Map<string, Story>();

export function queueSyncToPB(story: Story, onRemoteIdAssigned: (localId: string, remoteId: string) => void) {
  if (!pb.authStore.isValid) return;
  pendingSyncStories.set(story.id, story);
  if (syncQueueTimer !== null) window.clearTimeout(syncQueueTimer);
  syncQueueTimer = window.setTimeout(async () => {
    syncQueueTimer = null;
    const batch = Array.from(pendingSyncStories.values());
    pendingSyncStories.clear();
    for (const s of batch) {
      await syncOneToPocketBase(s, onRemoteIdAssigned);
    }
  }, 400);
}

async function syncOneToPocketBase(story: Story, onRemoteIdAssigned: (localId: string, remoteId: string) => void) {
  if (!pb.authStore.isValid) return;
  const user = pb.authStore.model;
  const userId = user && typeof user === "object" && "id" in user ? (user.id as string) : "";
  if (!userId) return;

  const payload: Record<string, unknown> = {
    title: (story.title && typeof story.title === "string") ? story.title : "Untitled",
    content: (story.content && typeof story.content === "string") ? story.content : "",
    category: (story.categoryId && typeof story.categoryId === "string") ? story.categoryId : "",
    word_count: countWords(story.content || ""),
    user_id: userId,
  };

  if (story.remoteId) {
    try {
      await pb.collection("cng_stories").update(story.remoteId, payload);
      return;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status !== 404) return;
    }
  }

  try {
    const created = await pb.collection("cng_stories").create(payload);
    if (created && created.id) {
      onRemoteIdAssigned(story.id, created.id);
    }
  } catch (err) {
    console.warn("CnG Cloud sync failed:", err);
  }
}
