import { Cloud, Download, LogOut, Moon, Save, Sun, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getPbUrl, loadPbToken, updatePbUrl } from "../lib/pocketbase";
import { useLibrary } from "../state/LibraryContext";

interface Props { open: boolean; onClose: () => void; }

export function SettingsModal({ open, onClose }: Props) {
  const { exportAll, importBackup, toast, theme, setTheme, categories, settings, setWriterName, login, logout, isAuthed, authEmail } = useLibrary();
  const [pbUrlInput, setPbUrlInput] = useState(() => { try { return getPbUrl(); } catch { return "https://salaryzapp-pb.onrender.com"; } });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pbStatus, setPbStatus] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const { addCategory } = useLibrary();

  useEffect(() => { if (!open) return; try { setPbUrlInput(getPbUrl()); } catch {} return () => {}; }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { try { if (e.key === "Escape") onClose(); } catch {} };
    document.addEventListener("keydown", onKey);
    return () => { try { document.removeEventListener("keydown", onKey); } catch {} };
  }, [open, onClose]);

  if (!open) return null;

  const handleSaveUrl = () => {
    const safe = (pbUrlInput && typeof pbUrlInput === "string") ? pbUrlInput.trim() : "";
    try { updatePbUrl(safe); setPbStatus("PocketBase URL saved. Login to sync."); window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2500); } catch {}
  };

  const handleLogin = async () => {
    const safeUrl = (pbUrlInput && typeof pbUrlInput === "string") ? pbUrlInput.trim() : "";
    if (!safeUrl) { try { setPbStatus("Enter PocketBase URL first."); } catch {} return; }
    try { updatePbUrl(safeUrl); } catch {}
    try {
      setPbStatus("Signing in…");
      await login((email && typeof email === "string") ? email.trim() : "", (password && typeof password === "string") ? password : "");
      const em = (email && typeof email === "string") ? email.trim() : "";
      try { setPbStatus(`Signed in as ${em}`); } catch {}
      window.setTimeout(() => { try { setPbStatus(""); } catch {} }, 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const safeMsg = (msg && typeof msg === "string") ? msg : String(msg || "");
      try { setPbStatus(`Sign-in failed: ${safeMsg}`); } catch {}
    }
  };

  const handleLogout = () => {
    try { logout(); } catch {}
    try { setPbStatus("Signed out — local only."); } catch {}
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
      const txt = await f.text();
      const safeTxt = (txt && typeof txt === "string") ? txt : "";
      const res = importBackup(safeTxt);
      setBackupStatus(res.msg);
    } catch { try { setBackupStatus("Import failed."); } catch {} } finally { try { e.currentTarget.value = ""; } catch {} }
  };
  const handleAddCategory = () => {
    const name = (newCategory && typeof newCategory === "string") ? newCategory.trim() : "";
    if (!name) return;
    const created = addCategory(name);
    if (created) { try { setNewCategory(""); } catch {} }
    else { try { toast(`Shelf "${name}" already exists`, "info"); } catch {} }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm transition-all duration-300" onClick={() => { try { onClose(); } catch {} }}>
      <div onClick={(e) => { try { e.stopPropagation(); } catch {} }} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100 transition-all duration-300">Settings</h2>
          <button onClick={() => { try { onClose(); } catch {} }} className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-300">✕</button>
        </div>

        <section className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-all duration-300">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition-all duration-300">Pen Name</h3>
          <label className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400 transition-all duration-300">Displayed in exports</label>
          <input value={(settings.writerName && typeof settings.writerName === "string") ? settings.writerName : ""} onChange={(e) => { try { setWriterName((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : ""); } catch {} }} placeholder="Writer" className="mt-2 h-9 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all duration-300" />
        </section>

        <section className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-all duration-300">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition-all duration-300"><Sun size={15} className="dark:hidden" /><Moon size={15} className="hidden dark:block" /> Appearance</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 transition-all duration-300">Theme stored in <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-zinc-900 dark:text-zinc-100">cngwriter:theme</code>.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { try { setTheme("light"); } catch {} }} className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-all duration-300 ${theme === "light" ? "border-amber-600 bg-amber-600/10 text-amber-600 dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-400" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"}`}>Light</button>
            <button onClick={() => { try { setTheme("dark"); } catch {} }} className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-all duration-300 ${theme === "dark" ? "border-amber-600 bg-amber-600/10 text-amber-600 dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-400" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"}`}>Dark</button>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-all duration-300">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition-all duration-300">Shelves / Categories</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 transition-all duration-300">Soft pill chips — muted colors</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const safeName = (c.name && typeof c.name === "string") ? c.name : "";
              const safeColor = (c.color && typeof c.color === "string") ? c.color : "#e5b168";
              return <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-[#fcfaf7] dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 transition-all duration-300"><span className="h-2 w-2 rounded-full" style={{ background: safeColor }} />{safeName}</span>;
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={newCategory} onChange={(e) => { try { setNewCategory((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : ""); } catch {} }} placeholder="New shelf name…" className="h-9 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all duration-300" onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} />
            <button onClick={handleAddCategory} className="inline-flex h-9 items-center rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 text-sm font-medium text-white dark:text-zinc-900 transition-all duration-300">Add</button>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-all duration-300">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition-all duration-300"><Cloud size={15} /> PocketBase — writer_users</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400 transition-all duration-300">Auth collection <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-zinc-900 dark:text-zinc-100">writer_users</code> via <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-zinc-900 dark:text-zinc-100">authWithPassword</code>. Data: <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-zinc-900 dark:text-zinc-100">writer_stories</code></p>
          <label className="mt-3 block text-xs font-medium text-zinc-500 dark:text-zinc-400 transition-all duration-300">PocketBase URL</label>
          <div className="mt-1 flex gap-2">
            <input value={(pbUrlInput && typeof pbUrlInput === "string") ? pbUrlInput : ""} onChange={(e) => { try { setPbUrlInput((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : ""); } catch {} }} placeholder="https://salaryzapp-pb.onrender.com" className="h-9 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 transition-all duration-300" />
            <button onClick={handleSaveUrl} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 text-sm font-medium text-white dark:text-zinc-900 transition-all duration-300"><Save size={14} /> Save</button>
          </div>
          {!isAuthed ? (
            <>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={email} onChange={(e) => { try { setEmail((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : ""); } catch {} }} placeholder="Email" className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all duration-300" />
                <input value={password} onChange={(e) => { try { setPassword((e.currentTarget.value && typeof e.currentTarget.value === "string") ? e.currentTarget.value : ""); } catch {} }} placeholder="Password" type="password" className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all duration-300" />
              </div>
              <button onClick={handleLogin} className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg bg-amber-600 dark:bg-amber-400 px-3 text-sm font-bold text-white dark:text-[#0d0d0d] transition-all duration-300">Sign in & sync</button>
            </>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 transition-all duration-300">
              <span className="text-sm text-emerald-800 dark:text-emerald-200">Signed in{authEmail ? ` as ${authEmail}` : ""}</span>
              <button onClick={handleLogout} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 transition-all duration-300"><LogOut size={12} /> Sign out</button>
            </div>
          )}
          {pbStatus && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 transition-all duration-300">{(pbStatus && typeof pbStatus === "string") ? pbStatus : ""}</p>}
          <p className="mt-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 transition-all duration-300">Token key cngwriter:pb_token {loadPbToken() ? "· saved" : "· not set"}</p>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-all duration-300">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition-all duration-300">Backup & Export Panel</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400 transition-all duration-300">Export All → single <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-zinc-900 dark:text-zinc-100">.json</code> with stories + categories + settings. Import merges by ID, newer <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-zinc-900 dark:text-zinc-100">updatedAt</code> wins.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={handleExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 transition-all duration-300"><Download size={14} /> Export All (.json)</button>
            <button onClick={handleImportClick} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 transition-all duration-300"><Upload size={14} /> Import (.json)</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChange} />
          </div>
          {backupStatus && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 transition-all duration-300">{backupStatus}</p>}
        </section>
      </div>
    </div>
  );
}
