import { getSyncKey } from './syncKey';
import { logger } from '../utils/logger';
import { Capacitor } from '@capacitor/core';

const LAST_SYNC_KEY = 'cng_last_sync_at';
const PRIMARY_ENDPOINT = 'https://writer.tiafa.cc.cd/api/sync';
const FALLBACK_ENDPOINT = 'https://cng-freewriter-new.pages.dev/api/sync';

// Capacitor-aware endpoint resolution: native must use absolute, web can use relative
function getEndpoints(): string[] {
  try {
    if (Capacitor.isNativePlatform()) {
      return [PRIMARY_ENDPOINT, FALLBACK_ENDPOINT];
    }
  } catch {}
  // Web: relative first (same origin), then absolute fallback
  return ['/api/sync', PRIMARY_ENDPOINT];
}

async function fetchWithFallback(urlPathOrFull: string, init: RequestInit, endpoints: string[]): Promise<Response> {
  let lastError: any = null;
  for (const base of endpoints) {
    // If urlPathOrFull starts with ?key= or is full, construct accordingly
    // For GET: urlPathOrFull is `?key=...` query, base is endpoint
    // For POST: base is endpoint, init.body contains sync_key
    let url: string;
    if (urlPathOrFull.startsWith('?') || urlPathOrFull.startsWith('&')) {
      url = `${base}${urlPathOrFull}`;
    } else if (urlPathOrFull.startsWith('http')) {
      url = urlPathOrFull;
    } else {
      url = `${base}${urlPathOrFull}`;
    }
    try {
      const res = await fetch(url, init);
      // If we got a response (even error status), return it unless it's a network-level HTML fallback that indicates wrong origin for native
      // For 503 D1 not bound, we still try next endpoint if we have one (maybe fallback bound)
      if (res.status === 503 && endpoints.indexOf(base) < endpoints.length - 1) {
        let txt = '';
        try { txt = await res.clone().text(); } catch {}
        logger.warn('SYNC', `Endpoint ${base} returned 503, trying fallback: ${txt.slice(0, 120)}`);
        // don't return yet, try next
        lastError = new Error(`503 on ${base}`);
        continue;
      }
      return res;
    } catch (e: any) {
      logger.warn('SYNC', `Fetch failed for ${base}: ${e?.message}`);
      lastError = e;
      // try next endpoint
      continue;
    }
  }
  throw lastError || new Error('All sync endpoints failed');
}

function getLocalUpdatedAt(): number {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) return n;
    }
  } catch {}
  try {
    const storiesRaw = localStorage.getItem('cngwriter:stories');
    if (storiesRaw) {
      const stories = JSON.parse(storiesRaw);
      if (Array.isArray(stories) && stories.length > 0) {
        let max = 0;
        for (const s of stories) {
          const t = new Date(s.updatedAt || 0).getTime();
          if (t > max) max = t;
        }
        return max;
      }
    }
  } catch {}
  return 0;
}

function setLocalUpdatedAt(ts: number) {
  try { localStorage.setItem(LAST_SYNC_KEY, String(ts)); } catch {}
}

function parsePayloadString(payload: unknown): { stories: any[]; categories: any[] } | null {
  try {
    if (typeof payload === 'string') {
      const obj = JSON.parse(payload);
      if (obj && typeof obj === 'object') {
        return {
          stories: Array.isArray(obj.stories) ? obj.stories : [],
          categories: Array.isArray(obj.categories) ? obj.categories : [],
        };
      }
    } else if (payload && typeof payload === 'object') {
      const obj = payload as any;
      return {
        stories: Array.isArray(obj.stories) ? obj.stories : [],
        categories: Array.isArray(obj.categories) ? obj.categories : [],
      };
    }
  } catch (e) {
    logger.error('SYNC', 'parsePayloadString failed', e);
  }
  return null;
}

// Central helper for explicit user feedback via toasts is handled by callers (SettingsModal),
// but we also ensure syncWithCloud returns detailed status with count for toast rendering.
export async function syncWithCloud(forcePush = false): Promise<{ success: boolean; message: string; totalStories?: number }> {
  const syncKey = getSyncKey();
  if (!syncKey) return { success: false, message: 'No sync key set — generate or paste a key first' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Offline — check internet connection' };
  }

  const endpoints = getEndpoints();
  logger.info('SYNC', `Using endpoints: ${endpoints.join(', ')} (native=${(() => { try { return Capacitor.isNativePlatform(); } catch { return false; } })()})`);

  try {
    // === GET phase with Capacitor-aware endpoint ===
    let getRes: Response;
    try {
      getRes = await fetchWithFallback(`?key=${encodeURIComponent(syncKey)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }, endpoints);
    } catch (e: any) {
      logger.error('SYNC', `All GET endpoints failed: ${e?.message}`, e);
      // Special handling for native absolute fail
      return { success: false, message: `Sync Error (Network): ${e?.message || 'All endpoints unreachable'} — check Cloudflare endpoints` };
    }

    if (getRes.status === 503) {
      let bodyTxt = '';
      try { bodyTxt = await getRes.text(); } catch {}
      // Try to extract error json if present
      let detail = 'Cloudflare D1 database binding check required';
      try {
        const j = JSON.parse(bodyTxt);
        detail = j.error || detail;
      } catch {}
      logger.warn('SYNC', `GET 503 D1 not bound: ${bodyTxt.slice(0, 300)}`);
      return { success: false, message: `Sync Error (503): ${detail}` };
    }

    let remoteFound = false;
    let remotePayload: unknown = null;
    let remoteAt: number | null = null;

    if (getRes.ok) {
      // Robust JSON parsing — handle HTML error pages gracefully (Unexpected token '<')
      let data: any = null;
      try {
        const text = await getRes.text();
        try {
          data = JSON.parse(text);
        } catch (parseErr: any) {
          // HTML page returned instead of JSON
          if (text.trim().startsWith('<')) {
            logger.warn('SYNC', `GET returned HTML, not JSON — treating as not found: ${text.slice(0, 120)}`);
            remoteFound = false;
          } else {
            throw parseErr;
          }
        }
      } catch (e: any) {
        logger.error('SYNC', `GET JSON parse failed: ${e?.message}`);
        if (!forcePush) return { success: false, message: `Sync Error (Parse): Invalid server response: ${e?.message} — check Cloudflare D1 binding` };
      }
      if (data && data.found && data.payload && typeof data.updated_at === 'number') {
        remoteFound = true;
        remotePayload = data.payload;
        remoteAt = data.updated_at;
      } else if (data && data.found === false) {
        remoteFound = false;
      }
    } else if (getRes.status === 404) {
      // No remote yet — will push local
      remoteFound = false;
      try {
        await getRes.text().catch(() => {});
      } catch {}
    } else if (!getRes.ok) {
      let bodyText = '';
      try { bodyText = await getRes.text(); } catch {}
      // Try to parse JSON error for cleaner message
      let parsedMsg = bodyText;
      try { const j = JSON.parse(bodyText); parsedMsg = j.error || bodyText; } catch {}
      logger.warn('SYNC', `GET sync failed ${getRes.status} ${bodyText.slice(0, 200)}`);
      if (!forcePush) return { success: false, message: `Sync Error (${getRes.status}): ${parsedMsg.slice(0, 150)}` };
    }

    const localAt = getLocalUpdatedAt();

    // === Bidirectional Merge ===
    // If remote exists, always attempt to merge remote into local first
    // This prevents data loss when local timestamp is artificially newer (e.g., fresh seed)
    // Soft-deleted fields (isDeleted, deletedAt) are preserved as-is in payload — no stripping.
    let didMerge = false;
    let mergedStoriesCount = 0;
    if (remoteFound && remotePayload) {
      const parsed = parsePayloadString(remotePayload);
      if (parsed) {
        const { stories: remoteStories, categories: remoteCategories } = parsed;
        try {
          const { store } = await import('../state/store');
          const localIds = new Set(store.stories.map((s) => s.id));
          const hasNewRemote = remoteStories.some((s: any) => !localIds.has(s.id)) || remoteStories.length > store.stories.length;

          // Merge if remote is newer OR remote has stories local doesn't have (content-based)
          const shouldMerge = hasNewRemote || (remoteAt !== null && remoteAt > localAt) || forcePush === false;
          // For Link & Sync / Sync Now, we want to always merge if there's new content
          if (shouldMerge) {
            // Only merge if there is actually new content to avoid noisy toasts
            if (hasNewRemote || (remoteAt !== null && remoteAt > localAt)) {
              const jsonStr = JSON.stringify({
                stories: remoteStories,
                categories: remoteCategories,
                version: 1,
                exportedAt: new Date().toISOString(),
              });
              const beforeCount = store.stories.length;
              const merged = store.importBackupText(jsonStr);
              if (merged) {
                const afterCount = store.stories.length;
                const added = afterCount - beforeCount;
                mergedStoriesCount = afterCount;
                // Update local timestamp to remote's timestamp to prevent immediate re-push loop
                if (remoteAt !== null) setLocalUpdatedAt(remoteAt);
                else setLocalUpdatedAt(Date.now());

                if (added > 0 || hasNewRemote) {
                  logger.info('SYNC', `Synced ${remoteStories.length} stories from Sanctuary Cloud (added ${added}, total ${afterCount})`);
                  store.toast(`Library synced from Sanctuary Cloud: ${afterCount} total stories`, 'ok');
                } else {
                  logger.info('SYNC', `Merged ${remoteStories.length} stories from Sanctuary Cloud (total ${afterCount})`);
                }
                didMerge = true;
                // If we merged, we should push the merged result back only if local had extra stories that remote didn't have
                const localHadExtra = beforeCount > 0 && store.stories.some((s) => !remoteStories.find((rs: any) => rs.id === s.id));
                if (localHadExtra) {
                  logger.info('SYNC', 'Local had extra stories, will push merged union to cloud');
                } else if (!localHadExtra) {
                  // Remote was superset — no need to push immediately unless forcePush
                  if (!forcePush) {
                    return { success: true, message: `Sync complete! Merged ${afterCount} total stories.`, totalStories: afterCount };
                  }
                }
              }
            }
          }
        } catch (e: any) {
          logger.error('SYNC', 'Failed to merge remote payload', e);
          return { success: false, message: `Sync Error (Merge): ${e?.message}` };
        }
      } else {
        logger.warn('SYNC', 'Remote payload parse returned null, skipping merge');
      }
    }

    // === Decide to Push ===
    // Push if: no remote, forcePush, or local has stories not in remote, or we just merged and need to update cloud
    // Re-evaluate after potential merge
    const shouldPush = !remoteFound || forcePush || didMerge;

    // Also check if local is genuinely newer and has content not in remote
    // For the case where remoteFound but we didn't merge (already in sync), we may still need to push if local has new stories
    if (!shouldPush && remoteFound && !didMerge) {
      // Compare local vs remote story counts: if local has more unique stories, push
      try {
        const { store } = await import('../state/store');
        if (remotePayload) {
          const parsed = parsePayloadString(remotePayload);
          if (parsed) {
            const remoteIds = new Set(parsed.stories.map((s: any) => s.id));
            const localExtra = store.stories.filter((s) => !remoteIds.has(s.id));
            if (localExtra.length > 0 || localAt > (remoteAt ?? -1)) {
              // Local has extra -> push
              // fall through to push logic
            } else {
              const total = store.stories.length;
              return { success: true, message: `Sync complete! Merged ${total} total stories.`, totalStories: total };
            }
          }
        }
      } catch {}
    }

    // Perform push if needed
    if (shouldPush || !remoteFound || forcePush) {
      try {
        const { store } = await import('../state/store');
        const payloadObj = { stories: store.stories, categories: store.categories };
        const payloadStr = JSON.stringify(payloadObj);
        const now = Date.now();

        let postRes: Response;
        try {
          postRes = await fetchWithFallback('', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sync_key: syncKey, payload: payloadStr, updated_at: now }),
          }, endpoints);
        } catch (e: any) {
          logger.error('SYNC', `All POST endpoints failed: ${e?.message}`, e);
          return { success: false, message: `Sync Error (Network): POST failed — ${e?.message || 'All endpoints unreachable'}` };
        }

        if (postRes.ok) {
          setLocalUpdatedAt(now);
          logger.info('SYNC', `Pushed ${payloadObj.stories.length} stories to Sanctuary Cloud`);
          // Return success with count even if we already did merge
          const total = payloadObj.stories.length;
          if (didMerge) {
            return { success: true, message: `Sync complete! Merged ${total} total stories.`, totalStories: total };
          }
          // For fresh push (first device), still success
          return { success: true, message: `Sync complete! Merged ${total} total stories.`, totalStories: total };
        } else {
          let txt = '';
          try { txt = await postRes.text(); } catch {}
          // Try to parse JSON error for cleaner message
          let parsed = txt;
          try {
            const j = JSON.parse(txt);
            parsed = j.error || txt;
          } catch {}
          logger.warn('SYNC', `POST sync failed ${postRes.status} ${txt.slice(0, 300)}`);
          return { success: false, message: `Sync Error (${postRes.status}): ${parsed.slice(0, 150)}` };
        }
      } catch (e: any) {
        logger.error('SYNC', 'Push failed', e);
        return { success: false, message: `Sync Error (Push): ${e?.message || 'Push error'}` };
      }
    }

    try {
      const { store } = await import('../state/store');
      return { success: true, message: `Sync complete! Merged ${store.stories.length} total stories.`, totalStories: store.stories.length };
    } catch {
      return { success: true, message: 'Already in sync' };
    }
  } catch (e: any) {
    // Top-level unexpected token etc.
    const msg = e?.message || String(e);
    logger.error('SYNC', `syncWithCloud error: ${msg}`, e);
    // Provide user-friendly message for JSON parse errors
    if (msg.includes('Unexpected token')) {
      return { success: false, message: `Sync Error (Parse): ${msg.slice(0, 80)} — check Cloudflare D1 binding` };
    }
    return { success: false, message: `Sync Error: ${msg || 'Sync error'}` };
  }
}
