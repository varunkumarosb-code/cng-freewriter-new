import { getSyncKey } from './syncKey';
import { logger } from '../utils/logger';

const LAST_SYNC_KEY = 'cng_last_sync_at';

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

export async function syncWithCloud(forcePush = false): Promise<{ success: boolean; message: string }> {
  const syncKey = getSyncKey();
  if (!syncKey) return { success: false, message: 'No sync key' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Offline' };
  }

  try {
    const getRes = await fetch(`/api/sync?key=${encodeURIComponent(syncKey)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (getRes.status === 503) {
      logger.warn('SYNC', 'D1 not bound, offline mode');
      return { success: false, message: 'D1 not bound (offline)' };
    }

    let remoteAt: number | null = null;
    let remotePayload: string | null = null;
    let remoteFound = false;

    if (getRes.ok) {
      const data = await getRes.json() as { found: boolean; payload?: string; updated_at?: number };
      if (data.found && data.payload && typeof data.updated_at === 'number') {
        remoteFound = true;
        remotePayload = data.payload;
        remoteAt = data.updated_at;
      }
    } else if (getRes.status === 404) {
      remoteFound = false;
    } else if (!getRes.ok) {
      logger.warn('SYNC', `GET sync failed ${getRes.status}`);
      if (!forcePush) return { success: false, message: `GET failed ${getRes.status}` };
    }

    const localAt = getLocalUpdatedAt();

    // Case 1: Remote exists and is newer -> merge
    if (remoteFound && remotePayload && remoteAt !== null && !forcePush && remoteAt > localAt) {
      try {
        const parsed = JSON.parse(remotePayload);
        const remoteStories = Array.isArray(parsed.stories) ? parsed.stories : [];
        const remoteCategories = Array.isArray(parsed.categories) ? parsed.categories : [];
        const { store } = await import('../state/store');
        const jsonStr = JSON.stringify({ stories: remoteStories, categories: remoteCategories, version: 1, exportedAt: new Date().toISOString() });
        const merged = store.importBackupText(jsonStr);
        if (merged) {
          setLocalUpdatedAt(remoteAt);
          logger.info('SYNC', `Synced ${remoteStories.length} stories from Sanctuary Cloud`);
          store.toast('Library synced from Sanctuary Cloud', 'ok');
          return { success: true, message: 'Library synced from Sanctuary Cloud' };
        }
        setLocalUpdatedAt(remoteAt);
        return { success: true, message: 'Remote synced' };
      } catch (e) {
        logger.error('SYNC', 'Failed to merge remote payload', e);
        return { success: false, message: 'Merge failed' };
      }
    }

    // Case 2: Local is newer or forcePush or no remote -> push
    if (!remoteFound || forcePush || localAt >= (remoteAt ?? -1)) {
      try {
        const { store } = await import('../state/store');
        const payloadObj = { stories: store.stories, categories: store.categories };
        const payloadStr = JSON.stringify(payloadObj);
        const now = Date.now();
        const postRes = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sync_key: syncKey, payload: payloadStr, updated_at: now })
        });
        if (postRes.ok) {
          setLocalUpdatedAt(now);
          logger.info('SYNC', `Pushed ${payloadObj.stories.length} stories to Sanctuary Cloud`);
          return { success: true, message: 'Pushed to cloud' };
        } else {
          const txt = await postRes.text().catch(() => '');
          logger.warn('SYNC', `POST sync failed ${postRes.status} ${txt}`);
          return { success: false, message: `POST failed ${postRes.status}` };
        }
      } catch (e: any) {
        logger.error('SYNC', 'Push failed', e);
        return { success: false, message: e?.message || 'Push error' };
      }
    }

    return { success: true, message: 'Already in sync' };
  } catch (e: any) {
    logger.error('SYNC', 'syncWithCloud error', e);
    return { success: false, message: e?.message || 'Sync error' };
  }
}
