import { getSyncKey } from './syncKey';
import { logger } from '../utils/logger';
import { Capacitor } from '@capacitor/core';
import { mergeByUpdatedAt } from './storage';

const LAST_SYNC_KEY = 'cng_last_sync_at';
const PRIMARY_ENDPOINT = 'https://writer.tiafa.cc.cd/api/sync';
const FALLBACK_ENDPOINT = 'https://cng-freewriter-new.pages.dev/api/sync';

function getEndpoints(): string[] {
  try {
    if (Capacitor.isNativePlatform()) {
      return [PRIMARY_ENDPOINT, FALLBACK_ENDPOINT];
    }
  } catch {}
  return ['/api/sync', PRIMARY_ENDPOINT];
}

async function fetchWithFallback(pathOrEmpty: string, init: RequestInit, endpoints: string[]): Promise<Response> {
  let lastError: any = null;
  for (const base of endpoints) {
    let url: string;
    if (pathOrEmpty.startsWith('?') || pathOrEmpty.startsWith('&')) url = `${base}${pathOrEmpty}`;
    else if (pathOrEmpty.startsWith('http')) url = pathOrEmpty;
    else if (pathOrEmpty === '') url = base;
    else url = `${base}${pathOrEmpty}`;
    try {
      const res = await fetch(url, init);
      if (res.status === 503 && endpoints.indexOf(base) < endpoints.length - 1) {
        let txt = '';
        try { txt = await res.clone().text(); } catch {}
        logger.warn('SYNC', `Endpoint ${base} returned 503, trying fallback: ${txt.slice(0, 120)}`);
        lastError = new Error(`503 on ${base}`);
        continue;
      }
      return res;
    } catch (e: any) {
      logger.warn('SYNC', `Fetch failed for ${base}: ${e?.message}`);
      lastError = e;
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

function parsePayload(payload: unknown): { stories: any[]; categories: any[] } | null {
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
    logger.error('SYNC', 'parsePayload failed', e);
  }
  return null;
}

type SyncResult = { success: boolean; message: string; totalStories?: number };

async function performTwoWaySync(key: string, endpoints: string[]): Promise<SyncResult> {
  // Step 1: PULL
  logger.info('SYNC', 'Pulling remote vault...');
  let remoteStories: any[] = [];
  let remoteCategories: any[] = [];
  let remoteAt: number | null = null;
  let remoteFound = false;

  try {
    const getRes = await fetchWithFallback(`?key=${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'x-sanctuary-key': key } as any,
    }, endpoints);

    if (getRes.status === 503) {
      let bodyTxt = '';
      try { bodyTxt = await getRes.text(); } catch {}
      let detail = 'Cloudflare D1 database binding check required';
      try { const j = JSON.parse(bodyTxt); detail = j.error || detail; } catch {}
      return { success: false, message: `Sync Error (503): ${detail}` };
    }

    if (getRes.ok) {
      let data: any = null;
      try {
        const text = await getRes.text();
        try { data = JSON.parse(text); } catch (parseErr: any) {
          if (text.trim().startsWith('<')) {
            logger.warn('SYNC', `GET returned HTML, not JSON — treating as not found: ${text.slice(0, 120)}`);
            remoteFound = false;
          } else throw parseErr;
        }
      } catch (e: any) {
        logger.error('SYNC', `GET JSON parse failed: ${e?.message}`);
        return { success: false, message: `Sync Error (Parse): Invalid server response: ${e?.message} — check Cloudflare D1 binding` };
      }
      if (data) {
        if ((data.success && data.payload) || (data.found && data.payload)) {
          const payloadRaw = data.payload;
          const updated = data.updatedAt ?? data.updated_at ?? null;
          const parsed = parsePayload(payloadRaw);
          if (parsed) {
            remoteStories = parsed.stories;
            remoteCategories = parsed.categories;
            remoteFound = true;
            remoteAt = typeof updated === 'number' ? updated : null;
          } else if (payloadRaw && typeof payloadRaw === 'object') {
            remoteStories = Array.isArray(payloadRaw.stories) ? payloadRaw.stories : [];
            remoteCategories = Array.isArray(payloadRaw.categories) ? payloadRaw.categories : [];
            remoteFound = true;
          }
        } else if (data.success === false || data.found === false) {
          remoteFound = false;
        }
      }
    } else if (getRes.status === 404) {
      remoteFound = false;
      try { await getRes.text().catch(() => {}); } catch {}
    } else if (!getRes.ok) {
      let bodyText = '';
      try { bodyText = await getRes.text(); } catch {}
      let parsedMsg = bodyText;
      try { const j = JSON.parse(bodyText); parsedMsg = j.error || bodyText; } catch {}
      return { success: false, message: `Sync Error (${getRes.status}): ${parsedMsg.slice(0, 150)}` };
    }
  } catch (e: any) {
    return { success: false, message: `Sync Error (Network): ${e?.message || 'All endpoints unreachable'} — check Cloudflare endpoints` };
  }

  // Step 2: MERGE via mergeByUpdatedAt (preserve deletedAt/isDeleted)
  const { store } = await import('../state/store');
  const localStories = [...store.stories];
  const localCategories = [...store.categories];
  const localCount = localStories.length;
  const remoteCount = remoteStories.length;

  const mergedStories = mergeByUpdatedAt(localStories, remoteStories);
  const catMap = new Map<string, any>();
  for (const c of localCategories) catMap.set(c.id, c);
  for (const c of remoteCategories) {
    if (!catMap.has(c.id)) {
      const dupName = Array.from(catMap.values()).some(v => v.name.toLowerCase() === c.name.toLowerCase());
      if (!dupName) catMap.set(c.id, c);
    }
  }
  const mergedCategories = Array.from(catMap.values());
  const total = mergedStories.length;

  logger.info('SYNC', `Merged ${localCount} local and ${remoteCount} remote stories (total: ${total})`);

  // Step 3: SAVE LOCAL
  store.stories = mergedStories;
  store.categories = mergedCategories as any;
  try {
    const { saveStories, saveCategories } = await import('./storage');
    saveStories(mergedStories);
    saveCategories(mergedCategories as any);
  } catch {}
  if (remoteAt !== null) setLocalUpdatedAt(Math.max(remoteAt, Date.now()));
  else setLocalUpdatedAt(Date.now());
  try { (store as any).notify?.(); } catch {}
  logger.info('SYNC', `Saved merged vault locally: ${total} stories`);

  // Step 4: PUSH — CRITICAL (always push merged payload back to D1)
  logger.info('SYNC', 'Pushing merged payload to Sanctuary D1...');
  const mergedPayload = { stories: mergedStories, categories: mergedCategories };
  const now = Date.now();

  try {
    const bodyObj = {
      key,
      payload: mergedPayload,
      updatedAt: now,
      sync_key: key,
      updated_at: now
    };
    const postRes = await fetchWithFallback('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sanctuary-key': key } as any,
      body: JSON.stringify(bodyObj),
    }, endpoints);

    if (postRes.ok) {
      setLocalUpdatedAt(now);
      logger.info('SYNC', 'Successfully pushed to Cloudflare D1.');
      // Step 5: TOAST handled by caller
      return { success: true, message: `Sync complete! ${total} stories up-to-date across all devices.`, totalStories: total };
    } else {
      let txt = '';
      try { txt = await postRes.text(); } catch {}
      let parsed = txt;
      try { const j = JSON.parse(txt); parsed = j.error || txt; } catch {}
      logger.warn('SYNC', `POST sync failed ${postRes.status} ${txt.slice(0, 300)}`);
      return { success: false, message: `Sync Error (${postRes.status}): ${parsed.slice(0, 150)}` };
    }
  } catch (e: any) {
    logger.error('SYNC', 'Push failed', e);
    return { success: false, message: `Sync Error (Push): ${e?.message || 'Push error'}` };
  }
}

export async function syncWithCloud(forcePush = false): Promise<SyncResult> {
  const syncKey = getSyncKey();
  if (!syncKey) return { success: false, message: 'No sync key set — generate or paste a key first' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Offline — check internet connection' };
  }
  const endpoints = getEndpoints();
  logger.info('SYNC', `Using endpoints: ${endpoints.join(', ')} (native=${(() => { try { return Capacitor.isNativePlatform(); } catch { return false; } })()})`);
  try {
    return await performTwoWaySync(syncKey, endpoints);
  } catch (e: any) {
    const msg = e?.message || String(e);
    logger.error('SYNC', `syncWithCloud error: ${msg}`, e);
    if (msg.includes('Unexpected token')) {
      return { success: false, message: `Sync Error (Parse): ${msg.slice(0, 80)} — check Cloudflare D1 binding` };
    }
    return { success: false, message: `Sync Error: ${msg || 'Sync error'}` };
  }
}

export async function syncNow(): Promise<SyncResult> {
  return syncWithCloud(false);
}

export async function linkAndSync(key?: string): Promise<SyncResult> {
  if (key) {
    try {
      const { setSyncKey } = await import('./syncKey');
      setSyncKey(key);
    } catch {}
  }
  return syncWithCloud(false);
}
