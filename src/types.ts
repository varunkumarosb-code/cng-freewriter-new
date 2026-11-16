export type ViewMode = 'shelf' | 'editor';

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  remoteId?: string;
}

export interface AppSettings {
  writerName: string;
  lastBackupAt: string | null;
}

export interface BackupFile {
  kind: "cng-writer-backup";
  app: string;
  version: number;
  exportedAt: string;
  stories: Story[];
  categories: Category[];
  settings: Partial<AppSettings> | null;
}
