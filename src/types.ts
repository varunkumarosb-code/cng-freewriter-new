export interface Story {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  remoteId?: string;
  isDeleted?: boolean;
  deletedAt?: string | number | null;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface AppSettings {
  writerName: string;
  lastBackupAt: string | null;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  settings?: AppSettings;
  categories: Category[];
  stories: Story[];
}

export type Theme = "light" | "dark";

export interface ToastItem {
  id: string;
  message: string;
  tone: "ok" | "error" | "info";
}
