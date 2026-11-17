/** CnG Writer domain models — Option B isolated architecture */

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Story {
  id: string; // local crypto.randomUUID()
  remoteId?: string; // PocketBase 15-char auto-generated id from writer_stories
  title: string;
  content: string;
  categoryId: string; // stores Category.id or "" for Unshelved; synced to writer_stories.category (TEXT)
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  writerName: string;
  lastBackupAt: string | null;
}
