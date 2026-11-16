import { Cloud, Download, LogOut, Moon, Save, Sun, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getPbUrl, loadPbToken, pb, savePbToken, updatePbUrl } from "../lib/pocketbase";
import { useLibrary } from "../state/LibraryContext";

interface Props { open: boolean; onClose: () => void; }

export function SettingsModal({ open, onClose }: Props) {
  const { exportAll, importBackup, toast, theme, setTheme, categories, stories } = useLibrary();
  const [pbUrlInput, setPbUrlInput] = useState<string>(() => { try { return getPbUrl(); } catch { return "https://salaryzapp-pb.onrender.com"; } });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pbStatus, setPbStatus] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const { addCategory } = useLibrary();

  useEffect(() => {
    if (!open) return;
    try { setPbUrlInput(getPbUrl()); } catch {}
    return () => {};
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { try { if (e.key === "Escape") onClose(); } catch {} };
    document.addEventListener("keydown", onKey);
    return () => { try { document.removeEventListener("keydown", onKey); } catch {} };
  }, [open, onClose]);

  if (!open) return null;

  const authed = (() => { try { return pb.authStore.isValid; } catch { return false; } })();

  const handleSaveUrl = () => {
    try {
      updatePbUrl(pbUrlInput.trim());
      setPbStatus("PocketBase URL saved. Login to sync.");
      window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2500);
    } catch {}
  };

  const handleLogin = async () => {
    const url = (pbUrlInput || "").trim();
    if (!url) { try { setPbStatus("Enter PocketBase URL first."); } catch {} return; }
    try { updatePbUrl(url); } catch {}
    try {
      setPbStatus("Signing in…");
      const auth = await pb.collection("users").authWithPassword((email || "").trim(), password);
      try { savePbToken((auth as unknown as { token: string }).token); } catch {}
      try { setPbStatus(`Signed in as ${(auth as unknown as { record: { email: string } }).record?.email || (email || "").trim()}`); } catch {}
      try { toast(`Signed in`, "ok"); } catch {}
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
    try { toast("Signed out", "ok"); } catch {}
    window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2000);
  };

  const handleExport = () => {
    try { exportAll(); setBackupStatus("Library exported as JSON"); window.setTimeout(() => { try { setBackupStatus(""); } catch {} }, 2000); } catch {}
  };

  const handleImportClick = () => { try { fileRef.current?.click(); } catch {} };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const res = importBackup(text);
      setBackupStatus(res.msg);
    } catch {
      try { setBackupStatus("Import failed."); } catch {}
    } finally { try { e.currentTarget.value = ""; } catch {} }
  };

  const handleAddCategory = () => {
    const name = (newCategory || "").trim();
    if (!name) return;
    const created = addCategory(name);
    if (created) { try { setNewCategory(""); } catch {} }
    else { try { toast(`Shelf "${name}" already exists`, "info"); } catch {} }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm bg-zinc-50 dark:bg-night-950" onClick={() => { try { onClose(); } catch {} }}>
      <div onClick={(e) => { try { e.stopPropagation(); } catch {} }} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900 bg-zinc-50 dark:bg-night-950">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <button onClick={() => { try { onClose(); } catch {} }} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 bg-zinc-50 dark:bg-night-950">✕</button>
        </div>

        {/* Theme */}
        <section className="mt-5 rounded-xl border border-zinc-200 p-4 dark:border-white/10 bg-zinc-50 dark:bg-night-950">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100"><Sun size={15} className="dark:hidden" /><Moon size={15} className="hidden dark:block" /> Appearance</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Theme is stored in <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-white/10">cngwriter:theme</code>.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { try { setTheme("light"); } catch {} }} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${theme === "light" ? "border-ember-400 bg-ember-400/15 text-ember-700 dark:text-ember-300" : "border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.04] bg-zinc-50 dark:bg-night-950"}`}>Light</button>
            <button onClick={() => { try { setTheme("dark"); } catch {} }} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${theme === "dark" ? "border-ember-400 bg-ember-400/15 text-ember-700 dark:text-ember-300" : "border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.04] bg-zinc-50 dark:bg-night-950"}`}>Dark</button>
          </div>
        </section>

        {/* Shelves */}
        <section className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-white/10 bg-zinc-50 dark:bg-night-950">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Shelves / Categories</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{categories.length} shelves · default chips: All, Unshelved + custom. Stored as plain TEXT.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs dark:border-white/10 dark:bg-white/10 bg-zinc-50 dark:bg-night-950">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}
              </span>
            ))}
            {stories.filter((s) => !(s.category || "").trim()).length > 0 && <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs dark:border-white/10 dark:bg-white/[0.04] bg-zinc-50 dark:bg-night-950">Unshelved · {stories.filter((s) => !(s.category || "").trim()).length}</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={newCategory} onChange={(e) => { try { setNewCategory(e.currentTarget.value || ""); } catch {} }} placeholder="New shelf name…" className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-ember-400/50 dark:border-white/10 dark:bg-white/[0.04] bg-zinc-50 dark:bg-night-950" onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} />
            <button onClick={handleAddCategory} className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Add</button>
          </div>
        </section>

        {/* PocketBase */}
        <section className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-white/10 bg-zinc-50 dark:bg-night-950">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100"><Cloud size={15} /> PocketBase Cloud Sync</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Collection <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-white/10">cng_stories</code> — fields <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-white/10">title, content, word_count, category(TEXT), user_id</code>.</p>
          <label className="mt-3 block text-xs font-medium text-zinc-600 dark:text-zinc-300">PocketBase URL</label>
          <div className="mt-1 flex gap-2">
            <input value={pbUrlInput} onChange={(e) => { try { setPbUrlInput(e.currentTarget.value || ""); } catch {} }} placeholder="https://salaryzapp-pb.onrender.com" className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-ember-400/50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100 bg-zinc-50 dark:bg-night-950" />
            <button onClick={handleSaveUrl} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"><Save size={14} /> Save</button>
          </div>
          {!authed ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={email} onChange={(e) => { try { setEmail(e.currentTarget.value || ""); } catch {} }} placeholder="Email" className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] bg-zinc-50 dark:bg-night-950" />
                <input value={password} onChange={(e) => { try { setPassword(e.currentTarget.value || ""); } catch {} }} placeholder="Password" type="password" className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] bg-zinc-50 dark:bg-night-950" />
              </div>
              <button onClick={handleLogin} className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg bg-ember-400 px-3 text-sm font-bold text-night-950">Sign in & sync</button>
            </>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-950/20 bg-zinc-50 dark:bg-night-950">
              <span className="text-sm text-emerald-800 dark:text-emerald-200">Signed in{pb.authStore.model?.email ? ` as ${pb.authStore.model.email}` : ""}</span>
              <button onClick={handleLogout} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs dark:border-white/10 dark:bg-white/10 bg-zinc-50 dark:bg-night-950"><LogOut size={12} /> Sign out</button>
            </div>
          )}
          {pbStatus && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{pbStatus}</p>}
          <p className="mt-2 font-mono text-[11px] text-zinc-400">Token key cngwriter:pb_token {loadPbToken() ? "· saved" : "· not set"}</p>
        </section>

        {/* Backup & Export */}
        <section className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-white/10 bg-zinc-50 dark:bg-night-950">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Backup & Export</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Export All → single <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-white/10">.json</code> with stories + categories + settings. Import merges by ID, newer <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-white/10">updatedAt</code> wins.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={handleExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 bg-zinc-50 dark:bg-night-950"><Download size={14} /> Export All (.json)</button>
            <button onClick={handleImportClick} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 bg-zinc-50 dark:bg-night-950"><Upload size={14} /> Import (.json)</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChange} />
          </div>
          {backupStatus && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{backupStatus}</p>}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Editor also has per-story .txt / .md export.</p>
        </section>

        <section className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/10 bg-zinc-50 dark:bg-night-950">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
          <p className="mt-1 text-xs text-red-600/80 dark:text-red-300/70">Deletes from PocketBase if signed in (by remoteId).</p>
        </section>
      </div>
    </div>
  );
}
