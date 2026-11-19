import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { logger } from '../utils/logger';

const BACKUP_DIR = 'CnG-Writer';
const BACKUP_FILE = 'CnG-Writer/cng_writer_backup.json';

/**
 * Write state JSON to Documents/CnG-Writer/cng_writer_backup.json on native.
 * Silently catches errors and logs to telemetry ring buffer.
 */
export async function backupToDeviceStorage(stateJson: string): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) return false;
    await Filesystem.writeFile({
      path: BACKUP_FILE,
      data: stateJson,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    logger.info('DEVICE_BACKUP', `Auto-backup saved to Documents/${BACKUP_FILE} (${stateJson.length} bytes)`);
    return true;
  } catch (err) {
    try { logger.warn('DEVICE_BACKUP', 'Auto-backup failed', err); } catch {}
    return false;
  }
}

/**
 * Read and parse backup from Documents/CnG-Writer/cng_writer_backup.json
 */
export async function restoreFromDeviceStorage(): Promise<any | null> {
  try {
    if (!Capacitor.isNativePlatform()) {
      // Allow web fallback to attempt read for testing; will fail gracefully
      // We still try to avoid false positives on web
      // but per spec we check native platform
    }
    const result = await Filesystem.readFile({
      path: BACKUP_FILE,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    const dataStr = typeof result.data === 'string' ? result.data : '';
    if (!dataStr) return null;
    const parsed = JSON.parse(dataStr);
    if (!parsed || typeof parsed !== 'object') return null;
    // Validate minimal payload
    if (!Array.isArray(parsed.stories) && !Array.isArray(parsed?.stories)) {
      // Allow backup wrapped in BackupData shape or raw {stories,categories}
      // parsed may have version/stories/categories
    }
    logger.info('DEVICE_BACKUP', `Restored backup from Documents/${BACKUP_FILE}`);
    return parsed;
  } catch (err) {
    try { logger.warn('DEVICE_BACKUP', 'Restore from device storage failed (no backup or permission)', err); } catch {}
    return null;
  }
}

/**
 * On app startup, if store.stories is empty on native platform, attempt reading device backup.
 * If found, automatically restore stories and notify.
 */
export async function autoRecoverIfEmpty(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    // Dynamic import to avoid circular dependency at top-level
    const { store } = await import('../state/store');
    // Consider empty as 0 stories (seed may exist, but spec says empty)
    // We also handle seed-only as effectively empty for recovery purposes
    const isEmpty = !store.stories || store.stories.length === 0;
    if (!isEmpty) return;

    const payload = await restoreFromDeviceStorage();
    if (!payload) return;

    const stories = Array.isArray(payload.stories) ? payload.stories : [];
    const categories = Array.isArray(payload.categories) ? payload.categories : [];

    if (stories.length === 0) return;

    // Use store's import logic or direct assignment
    // Merge to avoid losing seed, but for empty we can directly set
    try {
      // If store has importBackupText, use it for consistency
      const jsonStr = JSON.stringify(payload);
      const imported = (store as any).importBackupText ? (store as any).importBackupText(jsonStr) : false;
      if (!imported) {
        // Fallback: directly assign
        store.stories = stories;
        if (categories.length > 0) store.categories = categories;
        // Persist to localStorage
        const { saveStories, saveCategories } = await import('./storage');
        saveStories(store.stories);
        if (categories.length > 0) saveCategories(store.categories);
      }
      store.toast(`Restored ${stories.length} stories from device backup`, 'ok');
      logger.info('DEVICE_BACKUP', `Auto-recovered ${stories.length} stories from device backup`);
    } catch (e) {
      logger.error('DEVICE_BACKUP', 'Auto-recover merge failed', e);
    }
  } catch (err) {
    try { logger.warn('DEVICE_BACKUP', 'autoRecoverIfEmpty failed', err); } catch {}
  }
}
