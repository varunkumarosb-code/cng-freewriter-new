import PocketBase from "pocketbase";
import type { Story } from "./types";

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

// Local-first white-label: cloud sync disabled — stubs kept for API compat
export async function fetchRemoteStories(): Promise<Story[]> {
  return [];
}

export async function deleteRemoteStory(_remoteId: string): Promise<boolean> {
  return false;
}

export function queueSyncToPB(_story: Story, _onRemoteIdAssigned: (localId: string, remoteId: string) => void) {
  // No-op: pure local-first, no background network sync
  return;
}
