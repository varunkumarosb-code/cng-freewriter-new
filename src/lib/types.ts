/** Core domain models for CnG Writer. */

export interface Category {
  id: string;
  name: string;
  /** Hex accent used for dots / tags across the UI. */
  color: string;
}

export interface Story {
  id: string;
  title: string;
  /** Markdown source of the manuscript. */
  content: string;
  categoryId: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  remoteId?: string; // PocketBase 15-char record ID
}

export interface AppSettings {
  writerName: string;
  lastBackupAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Backup file schema                                                  */
/* ------------------------------------------------------------------ */

export interface BackupMeta {
  storyCount: number;
  categoryCount: number;
  totalWords: number;
}

/**
 * The portable `.json` backup envelope. Everything needed to rebuild a
 * library — stories, categories, settings — travels inside this shape,
 * so it also maps 1:1 onto a PocketBase export if the storage layer
 * is swapped later.
 */
export interface BackupFile {
  kind: "cng-writer-backup";
  app: string;
  version: number;
  exportedAt: string;
  meta: BackupMeta;
  categories: Category[];
  stories: Story[];
  settings: Partial<AppSettings> | null;
}

/** Summary of what a restore operation actually changed. */
export interface ImportReport {
  added: number;
  updated: number;
  skipped: number;
  categoriesAdded: number;
}
