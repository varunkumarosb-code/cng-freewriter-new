import PocketBase from 'pocketbase';

const SAVED_URL = localStorage.getItem("cng:pb_url") || 'https://salaryzapp-pb.onrender.com';

export const pb = new PocketBase(SAVED_URL);

pb.autoCancellation(false);

export function updatePbUrl(url: string) {
  const clean = url.trim().replace(/\/+$/, "");
  localStorage.setItem("cng:pb_url", clean);
  pb.baseUrl = clean;
}