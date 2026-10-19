import { useEffect, useRef, useState } from "react";
import { X, Cloud, LogOut, Upload, Download, Save, Trash2 } from "lucide-react";
import type { Category, Story } from "../types";
import { buildBackup, downloadJson, parseBackup, saveCategories, saveStories } from "../lib/storage";
import { getStoredUrl, loadPbToken, pb, savePbToken, updatePbUrl } from "../lib/pocketbase";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  stories: Story[];
  categories: Category[];
  onImported: (s: Story[], c: Category[]) => void;
  onClearLocal?: () => void;
}

export function SettingsModal({ open, onClose, stories, categories, onImported, onClearLocal }: SettingsModalProps) {
  const [pbUrlInput, setPbUrlInput] = useState<string>(() => { try { return getStoredUrl(); } catch { return ""; } });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pbStatus, setPbStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    try { setPbUrlInput(getStoredUrl()); } catch {}
    return () => {};
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { try { if (e.key === 'Escape') onClose(); } catch {} };
    document.addEventListener('keydown', onKey);
    return () => {
      try { document.removeEventListener('keydown', onKey); } catch (err) { console.warn("Cleanup error guarded:", err); }
    };
  }, [open, onClose]);

  if (!open) return null;

  const authed = (() => { try { return pb.authStore.isValid; } catch { return false; } })();

  const handleSavePbUrl = () => {
    try {
      updatePbUrl(pbUrlInput.trim());
      setPbStatus("PocketBase URL saved. Login to sync.");
      window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2500);
    } catch {}
  };

  const handleLogin = async () => {
    const url = pbUrlInput.trim();
    if (!url) { try { setPbStatus("Enter PocketBase URL first."); } catch {} return; }
    try { updatePbUrl(url); } catch {}
    try {
      setPbStatus("Signing in…");
      const auth = await pb.collection('users').authWithPassword(email.trim(), password);
      try { savePbToken(auth.token); } catch {}
      try { setPbStatus(`Signed in as ${auth.record?.email ?? email.trim()}`); } catch {}
      window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      try { setPbStatus(`Sign-in failed: ${msg}`); } catch {}
    }
  };

  const handleLogout = () => {
    try { pb.authStore.clear(); } catch {}
    try { savePbToken(""); } catch {}
    try { setPbStatus("Signed out — local only."); } catch {}
    window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2000);
  };

  const handleExport = () => {
    try {
      downloadJson(buildBackup(stories, categories));
      try { setPbStatus(`Exported backup JSON`); } catch {}
      window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2000);
    } catch {}
  };

  const handleImportClick = () => {
    try { fileInputRef.current?.click(); } catch {}
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      if (!parsed) { setPbStatus("Invalid backup file."); return; }
      try { saveStories(parsed.stories); } catch {}
      try { saveCategories(parsed.categories); } catch {}
      try { if (typeof onImported === 'function') onImported(parsed.stories, parsed.categories); } catch {}
      try { setPbStatus(`Imported ${parsed.stories.length} stories.`); } catch {}
    } catch {
      try { setPbStatus("Import failed."); } catch {}
    } finally {
      try { e.currentTarget.value = ""; } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => { try { if (typeof onClose === 'function') onClose(); } catch {} }}>
      <div onClick={e => { try { e.stopPropagation(); } catch {} }} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <button onClick={() => { try { if (typeof onClose === 'function') onClose(); } catch {} }} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400"><X size={16}/></button>
        </div>

        <section className="mt-5 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100"><Cloud size={15}/> PocketBase Cloud Sync</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Collection <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-white/10">cng_stories</code> with fields id, user, title, content, category, updated.</p>
          <label className="mt-3 block text-xs font-medium text-zinc-600 dark:text-zinc-300">PocketBase URL</label>
          <div className="mt-1 flex gap-2">
            <input value={pbUrlInput} onChange={e => { try { setPbUrlInput(e.currentTarget.value); } catch {} }} placeholder="https://your-pocketbase.example" className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-ember-400/50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100" />
            <button onClick={handleSavePbUrl} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"><Save size={14}/> Save</button>
          </div>
          {!authed ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={email} onChange={e => { try { setEmail(e.currentTarget.value); } catch {} }} placeholder="Email" className="h-9 rounded-lg border border-zinc-200 px-3 text-sm dark:border-white/10 dark:bg-white/[0.04]" />
                <input value={password} onChange={e => { try { setPassword(e.currentTarget.value); } catch {} }} placeholder="Password" type="password" className="h-9 rounded-lg border border-zinc-200 px-3 text-sm dark:border-white/10 dark:bg-white/[0.04]" />
              </div>
              <button onClick={handleLogin} className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg bg-ember-400 px-3 text-sm font-bold text-night-950">Sign in & sync</button>
            </>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <span className="text-sm text-emerald-800 dark:text-emerald-200">Signed in{pb.authStore.model?.email ? ` as ${pb.authStore.model.email}` : ""}</span>
              <button onClick={handleLogout} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs dark:border-white/10 dark:bg-white/10"><LogOut size={12}/> Sign out</button>
            </div>
          )}
          {pbStatus && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{pbStatus}</p>}
          <p className="mt-2 font-mono text-[11px] text-zinc-400">Token key cngwriter:pb_token {loadPbToken() ? "· saved" : "· not set"}</p>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Backup & restore</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Export is a single JSON — safe to keep in Drive/iCloud. Import merges into this device.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={handleExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm dark:border-white/10"><Download size={14}/> Export JSON</button>
            <button onClick={handleImportClick} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm dark:border-white/10"><Upload size={14}/> Import JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChange} />
          </div>
        </section>

        {onClearLocal && (
          <section className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/10">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
            <button onClick={() => { try { if (typeof onClearLocal === 'function') onClearLocal(); } catch {} }} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-600 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300"><Trash2 size={14}/> Clear local library</button>
          </section>
        )}
      </div>
    </div>
  );
}
