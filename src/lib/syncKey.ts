const KEY = 'cng_sync_key';

function generateSyncKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (len: number) => {
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };
  return `CNG-${rand(4)}-${rand(4)}-${rand(4)}`;
}

export function getSyncKey(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^CNG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(existing)) {
      return existing;
    }
    if (existing && existing.trim().length > 0) {
      // Normalize legacy key if close
      const clean = existing.trim().toUpperCase();
      if (/^CNG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clean)) {
        localStorage.setItem(KEY, clean);
        return clean;
      }
    }
    const fresh = generateSyncKey();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return generateSyncKey();
  }
}

export function setSyncKey(key: string): void {
  try {
    const clean = key.trim().toUpperCase();
    if (!/^CNG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clean)) {
      throw new Error('Invalid sync key format. Expected CNG-XXXX-XXXX-XXXX');
    }
    localStorage.setItem(KEY, clean);
  } catch (e) {
    // Allow raw storage even if validation fails for flexibility, but rethrow for UI
    if (e instanceof Error && e.message.includes('Invalid sync key')) throw e;
    try { localStorage.setItem(KEY, key); } catch {}
  }
}

export function regenerateSyncKey(): string {
  const fresh = generateSyncKey();
  try { localStorage.setItem(KEY, fresh); } catch {}
  return fresh;
}
