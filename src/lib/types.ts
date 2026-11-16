/** Single source of truth — all domain models */
export type ViewMode = "shelf" | "editor";

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Story {
  id: string; // crypto.randomUUID() local
  title: string;
  content: string; // editor
  category: string; // plain TEXT shelf name, "" = Unshelved
  createdAt: string;
  updatedAt: string;
  remoteId?: string; // PocketBase 15-char id
}

export interface AppSettings {
  writerName: string;
  lastBackupAt: string | null;
  theme: "light" | "dark";
}

export interface BackupFile {
  kind: "cng-writer-backup";
  app: string;
  version: number;
  exportedAt: string;
  stories: Story[];
  categories: Category[];
  settings: Partial<AppSettings> | null;
  meta?: { storyCount: number; categoryCount: number; totalWords: number };
}

export interface ToastItem {
  id: string;
  message: string;
  tone: "ok" | "error" | "info";
}
