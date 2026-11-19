import { getSyncKey } from './syncKey';
import { logger } from '../utils/logger';

const LAST_SYNC_KEY = 'cng_last_sync_at';
const SYNC_ENDPOINT = 'https://writer.tiafa.cc.cd/api/sync';

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

export async function syncWithCloud(forcePush = false): Promise<{ success: boolean; message: string }> {
  const syncKey = getSyncKey();
  if (!syncKey) return { success: false, message: 'No sync key' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Offline' };
  }

  try {
    // Use absolute URL so native WebView (capacitor://localhost) can reach Cloudflare
    let getRes: Response;
    try {
      getRes = await fetch(`${SYNC_ENDPOINT}?key=${encodeURIComponent(syncKey)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (e: any) {
      // Fallback to relative for local dev if absolute fails
      logger.warn('SYNC', `Absolute fetch failed, trying relative: ${e?.message}`);
      getRes = await fetch(`/api/sync?key=${encodeURIComponent(syncKey)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    }

    if (getRes.status === 503) {
      // Try to parse body safely, but don't crash on HTML
      try {
        await getRes.text();
      } catch {}
      logger.warn('SYNC', 'D1 not bound, offline mode');
      return { success: false, message: 'D1 not bound (offline)' };
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
        if (!forcePush) return { success: false, message: `Invalid server response: ${e?.message}` };
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
        // Consume body to avoid leak, but ignore parse errors
        await getRes.text().catch(() => {});
      } catch {}
    } else if (!getRes.ok) {
      let bodyText = '';
      try { bodyText = await getRes.text(); } catch {}
      logger.warn('SYNC', `GET sync failed ${getRes.status} ${bodyText.slice(0, 200)}`);
      if (!forcePush) return { success: false, message: `GET failed ${getRes.status}` };
    }

    const localAt = getLocalUpdatedAt();

    // === Bidirectional Merge ===
    // If remote exists, always attempt to merge remote into local first
    // This prevents data loss when local timestamp is artificially newer (e.g., fresh seed)
    let didMerge = false;
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
                // Update local timestamp to remote's timestamp to prevent immediate re-push loop
                if (remoteAt !== null) setLocalUpdatedAt(remoteAt);
                else setLocalUpdatedAt(Date.now());

                if (added > 0 || hasNewRemote) {
                  logger.info('SYNC', `Synced ${remoteStories.length} stories from Sanctuary Cloud (added ${added})`);
                  store.toast('Library synced from Sanctuary Cloud', 'ok');
                } else {
                  logger.info('SYNC', `Merged ${remoteStories.length} stories from Sanctuary Cloud`);
                }
                didMerge = true;
                // If we merged, we should push the merged result back only if local had extra stories that remote didn't have
                // But to keep both devices in sync, push the union after merge if local had unique stories
                const localHadExtra = beforeCount > 0 && store.stories.some((s) => !remoteStories.find((rs: any) => rs.id === s.id));
                if (localHadExtra) {
                  // Local had extra — need to push merged union
                  logger.info('SYNC', 'Local had extra stories, will push merged union to cloud');
                } else if (!localHadExtra) {
                  // Remote was superset — no need to push immediately unless forcePush
                  if (!forcePush) {
                    return { success: true, message: 'Library synced from Sanctuary Cloud' };
                  }
                }
              }
            }
          }
        } catch (e: any) {
          logger.error('SYNC', 'Failed to merge remote payload', e);
          return { success: false, message: `Merge failed: ${e?.message}` };
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
              return { success: true, message: 'Already in sync' };
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

        // Use absolute endpoint for native compatibility
        let postRes: Response;
        try {
          postRes = await fetch(SYNC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sync_key: syncKey, payload: payloadStr, updated_at: now }),
          });
        } catch {
          postRes = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sync_key: syncKey, payload: payloadStr, updated_at: now }),
          });
        }

        if (postRes.ok) {
          setLocalUpdatedAt(now);
          logger.info('SYNC', `Pushed ${payloadObj.stories.length} stories to Sanctuary Cloud`);
          // Avoid duplicate toast if we already toasted merge
          if (!didMerge) {
            // For Sync Now, we already show Sync complete via caller; don't double-toast
          }
          return { success: true, message: 'Pushed to cloud' };
        } else {
          let txt = '';
          try { txt = await postRes.text(); } catch {}
          // Try to parse JSON error for cleaner message
          try {
            const j = JSON.parse(txt);
            txt = j.error || txt;
          } catch {}
          logger.warn('SYNC', `POST sync failed ${postRes.status} ${txt.slice(0, 300)}`);
          return { success: false, message: `POST failed ${postRes.status}: ${txt.slice(0, 100)}` };
        }
      } catch (e: any) {
        logger.error('SYNC', 'Push failed', e);
        return { success: false, message: e?.message || 'Push error' };
      }
    }

    return { success: true, message: 'Already in sync' };
  } catch (e: any) {
    // Top-level unexpected token etc.
    const msg = e?.message || String(e);
    logger.error('SYNC', `syncWithCloud error: ${msg}`, e);
    // Provide user-friendly message for JSON parse errors
    if (msg.includes('Unexpected token')) {
      return { success: false, message: `Sync parse error: ${msg.slice(0, 80)} — check Cloudflare D1 binding` };
    }
    return { success: false, message: msg || 'Sync error' };
  }
}
