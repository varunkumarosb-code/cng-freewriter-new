import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Mail,
  Server,
  Trash2,
  Unplug,
  X,
  XCircle,
} from "lucide-react";
import { library, LibrarySnapshot } from "../lib/library";
import { AuthMethod, EMPTY_CONFIG, PBConfig } from "../lib/model";

interface Props {
  open: boolean;
  onClose: () => void;
  snap: LibrarySnapshot;
  toast: (msg: string, kind?: "ok" | "error") => void;
}

const SCHEMA = `collection: stories
├─ title       text       required
├─ content     text
├─ word_count  number
└─ user_id     text

API rules: allow authenticated users
to list / create / update their rows.
Admin or superuser tokens also work.`;

export default function SettingsModal({ open, onClose, snap, toast }: Props) {
  const [cfg, setCfg] = useState<PBConfig>({ ...EMPTY_CONFIG });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [armClear, setArmClear] = useState(false);

  useEffect(() => {
    if (open) {
      setCfg({ ...snap.config });
      setResult(null);
      setArmClear(false);
    }
  }, [open, snap.config]);

  const patch = (p: Partial<PBConfig>) => setCfg((c) => ({ ...c, ...p }));

  const connected = snap.status === "connected";
  const localCount = snap.stories.filter(
    (s) => s.origin === "local" || s.pending
  ).length;

  const connect = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await library.connect(cfg);
      if (r === "connected") {
        const s = library.getSnapshot();
        setResult({
          ok: true,
          msg: `Connected as ${s.authUser || "reader"} — ${s.cloudCount} ${
            s.cloudCount === 1 ? "story" : "stories"
          } in the cloud.`,
        });
        toast("PocketBase connected", "ok");
      } else {
        setResult({ ok: false, msg: library.getSnapshot().statusDetail });
      }
    } catch (err: any) {
      setResult({
        ok: false,
        msg:
          err?.status === 0
            ? "Couldn't reach the server. Check the URL and that PocketBase is running."
            : err?.message || "Connection failed.",
      });
    }
    setBusy(false);
  };

  const disconnect = () => {
    library.disconnect();
    setResult(null);
    toast("Disconnected — everything stays on this device");
  };

  const pushAll = async () => {
    setBusy(true);
    const n = await library.pushLocalToCloud();
    setBusy(false);
    toast(
      n > 0
        ? `Pushed ${n} ${n === 1 ? "story" : "stories"} to PocketBase`
        : "Everything is already synced"
    );
  };

  const copySchema = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Clipboard unavailable in this browser", "error");
    }
  };

  const exportJSON = () => {
    const blob = new Blob([library.exportJSON()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cng-writer-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Library exported as JSON");
  };

  const clearLocal = () => {
    if (armClear) {
      library.clearLocal();
      setArmClear(false);
      onClose();
      toast("Local library cleared");
    } else {
      setArmClear(true);
      setTimeout(() => setArmClear(false), 3000);
    }
  };

  const MethodTab = ({
    value,
    icon: Icon,
    label,
  }: {
    value: AuthMethod;
    icon: any;
    label: string;
  }) => (
    <button
      onClick={() => patch({ method: value })}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-medium transition ${
        cfg.method === value
          ? "bg-amber-400/15 text-amber-700 ring-1 ring-amber-500/40 dark:text-amber-300"
          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden md:inline">{label}</span>
      <span className="md:hidden">{label.split(" ")[0]}</span>
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-900/10 bg-white shadow-2xl sm:rounded-2xl dark:border-white/10 dark:bg-[#101013]"
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-zinc-900/[0.07] px-5 py-4 dark:border-white/[0.07]">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-300">
                <Server className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="font-display text-lg leading-tight font-medium text-zinc-900 dark:text-zinc-50">
                  PocketBase sync
                </h2>
                <p className="font-mono text-[10px] tracking-[0.14em] text-zinc-400 uppercase dark:text-zinc-500">
                  {snap.statusDetail}
                </p>
              </div>
              <button className="lw-btn-icon ml-auto" onClick={onClose}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                CnG Writer is fully usable offline — drafts persist in this
                browser. Add a PocketBase server to sync the{" "}
                <code className="rounded bg-zinc-900/[0.06] px-1 py-0.5 font-mono text-[11.5px] text-amber-700 dark:bg-white/[0.07] dark:text-amber-300">
                  stories
                </code>{" "}
                collection across devices. Credentials are stored only in your
                browser.
              </p>

              {/* url */}
              <div>
                <label className="lw-kicker mb-1.5 block">Server URL</label>
                <input
                  className="lw-input font-mono text-[13px]"
                  placeholder="http://127.0.0.1:8090"
                  value={cfg.url}
                  onChange={(e) => patch({ url: e.target.value })}
                  spellCheck={false}
                  autoCapitalize="off"
                />
              </div>

              {/* auth method */}
              <div>
                <label className="lw-kicker mb-1.5 block">Authentication</label>
                <div className="flex gap-1 rounded-xl border border-zinc-300/70 p-1 dark:border-white/10">
                  <MethodTab value="password" icon={Mail} label="Email + password" />
                  <MethodTab value="token" icon={KeyRound} label="Auth token" />
                  <MethodTab value="none" icon={Unplug} label="No sync" />
                </div>

                {cfg.method === "password" && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      className="lw-input"
                      type="email"
                      placeholder="writer@example.com"
                      value={cfg.email}
                      onChange={(e) => patch({ email: e.target.value })}
                      autoCapitalize="off"
                    />
                    <input
                      className="lw-input"
                      type="password"
                      placeholder="••••••••"
                      value={cfg.password}
                      onChange={(e) => patch({ password: e.target.value })}
                    />
                  </div>
                )}
                {cfg.method === "token" && (
                  <input
                    className="lw-input mt-3 font-mono text-[12px]"
                    placeholder="Paste an auth or superuser token"
                    value={cfg.token}
                    onChange={(e) => patch({ token: e.target.value })}
                    spellCheck={false}
                  />
                )}
                {cfg.method === "none" && (
                  <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-500 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-zinc-400">
                    Sync is paused. Keep writing — nothing is uploaded, and this
                    URL will be ready when you flip it back on.
                  </p>
                )}
              </div>

              {/* actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={connect}
                  disabled={busy || cfg.method === "none"}
                  className="lw-btn-primary"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Server className="h-4 w-4" />
                  )}
                  {connected ? "Reconnect" : "Save & connect"}
                </button>
                {connected && (
                  <>
                    <button onClick={disconnect} className="lw-btn-ghost">
                      <Unplug className="h-4 w-4" />
                      Disconnect
                    </button>
                    {localCount > 0 && (
                      <button onClick={pushAll} disabled={busy} className="lw-btn-ghost">
                        <CloudUpload className="h-4 w-4" />
                        Push {localCount} local{" "}
                        {localCount === 1 ? "story" : "stories"}
                      </button>
                    )}
                  </>
                )}
              </div>

              {result && (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed ${
                    result.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  {result.msg}
                </div>
              )}

              {/* schema */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="lw-kicker">Collection schema</label>
                  <button
                    onClick={copySchema}
                    className="flex items-center gap-1 font-mono text-[10px] tracking-wider text-zinc-400 uppercase transition hover:text-amber-500"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-zinc-900/[0.08] bg-zinc-950 p-3.5 font-mono text-[11.5px] leading-relaxed text-zinc-300 dark:border-white/10 dark:bg-black/50">
                  <span className="text-amber-400">collection:</span> stories{"\n"}
                  {"├─ "}<span className="text-zinc-100">title</span>       text{"\n"}
                  {"├─ "}<span className="text-zinc-100">content</span>     text{"\n"}
                  {"├─ "}<span className="text-zinc-100">word_count</span>  number{"\n"}
                  {"└─ "}<span className="text-zinc-100">user_id</span>     text{"\n\n"}
                  <span className="text-zinc-500">
                    Allow authenticated users to list / create / update. Admin
                    or superuser tokens also work.
                  </span>
                </pre>
              </div>

              {/* local data */}
              <div className="border-t border-zinc-900/[0.07] pt-4 dark:border-white/[0.07]">
                <label className="lw-kicker mb-2 block">Local data</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportJSON} className="lw-btn-ghost">
                    <Download className="h-4 w-4" />
                    Export library (JSON)
                  </button>
                  <button
                    onClick={clearLocal}
                    className={`lw-btn ${
                      armClear
                        ? "bg-red-500/90 px-3 py-2 text-white hover:bg-red-500"
                        : "lw-btn-ghost !text-red-500 hover:!border-red-500/40"
                    }`}
                  >
                    {armClear ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {armClear ? "Click again to erase" : "Clear local library"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
