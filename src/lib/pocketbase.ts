import PocketBase from 'pocketbase';
import type { Story } from '../types';

export function getStoredUrl(): string {
  try {
    const a = localStorage.getItem("cngwriter:pb_url");
    if (a) return a;
    const b = localStorage.getItem("cng:pb_url");
    if (b) {
      try { localStorage.setItem("cngwriter:pb_url", b); } catch {}
      return b;
    }
  } catch {}
  return 'https://salaryzapp-pb.onrender.com';
}

const pbUrl = getStoredUrl();

export const pb = new PocketBase(pbUrl);

pb.autoCancellation(false);

export function updatePbUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, "");
    if (!clean) return;
    try { localStorage.setItem("cngwriter:pb_url", clean); } catch {}
    try { localStorage.setItem("cngwriter:pb_token", pb.authStore.token || ""); } catch {}
    pb.baseUrl = clean;
  } catch {}
}

export function savePbToken(token?: string): void {
  try {
    const toSave = typeof token === 'string' ? token : pb.authStore.token;
    if (toSave) localStorage.setItem("cngwriter:pb_token", toSave);
    else localStorage.removeItem("cngwriter:pb_token");
  } catch {}
}

export function loadPbToken(): string | null {
  try {
    const t = localStorage.getItem("cngwriter:pb_token");
    if (t) {
      try { (pb.authStore as unknown as { save: (t: string) => void }).save(t); } catch {}
      return t;
    }
    return null;
  } catch { return null; }
}

// Restore token on load
try { loadPbToken(); } catch {}

export async function fetchRemoteStories(): Promise<Story[] | null> {
  try {
    if (!pb.authStore.isValid || !pb.authStore.model) return null;
    const records = await pb.collection("cng_stories").getFullList({ sort: "-updated" });
    return records.map((r: Record<string, unknown>) => ({
      id: String((r as { id: string }).id),
      remoteId: String((r as { id: string }).id),
      title: String((r as { title?: string }).title || "Untitled"),
      content: String((r as { content?: string }).content || ""),
      categoryId: (r as { category?: string }).category ? String((r as { category?: string }).category) : null,
      createdAt: String((r as { created?: string }).created || new Date().toISOString()),
      updatedAt: String((r as { updated?: string }).updated || new Date().toISOString()),
    } as Story));
  } catch (err) {
    try { console.warn("PB fetch error:", err); } catch {}
    return null;
  }
}

export async function deleteRemoteStory(remoteId: string): Promise<void> {
  try {
    if (!pb.authStore.isValid || !remoteId) return;
    await pb.collection("cng_stories").delete(remoteId);
  } catch (err) {
    try { console.warn("delete remote failed:", err); } catch {}
    throw err;
  }
}
