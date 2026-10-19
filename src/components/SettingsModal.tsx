import { useEffect, useState } from "react";
import { CheckCircle2, Cloud, CloudOff, Loader2, RefreshCw, X } from "lucide-react";
import { useLibrary } from "../state/LibraryContext";
import { BackupPanel } from "./BackupPanel";
import { pb, updatePbUrl } from "../lib/pocketbase";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function PocketBasePanel() {
  const { notify } = useLibrary();
  const [url, setUrl] = useState(pb.baseUrl || "https://salaryzapp-pb.onrender.com");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authedUser, setAuthedUser] = useState<string | null>(
    pb.authStore.isValid ? pb.authStore.model?.email || "Connected" : null
  );

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      notify("error", "Credentials required", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      updatePbUrl(url);
      await pb.collection("users").authWithPassword(email.trim(), password);
      setAuthedUser(pb.authStore.model?.email || email);
      notify("success", "Connected to PocketBase", `Logged in as ${email}`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.status === 0
          ? "Server cold-starting (~50s on Render free). Please wait a moment and click Save again."
          : err?.message || "Invalid credentials or collection rules issue.";
      notify("error", "Connection failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    pb.authStore.clear();
    setAuthedUser(null);
    notify("info", "Disconnected", "App is now running in local-only mode.");
  };

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
          <Cloud size={16} className="text-ember-500 dark:text-ember-400" />
          PocketBase Sync
        </h3>
        {authedUser ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
            <CheckCircle2 size={12} /> Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <CloudOff size={12} /> Local mode
          </span>
        )}
      </div>

      {authedUser ? (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
            User: <strong className="text-zinc-800 dark:text-zinc-200">{authedUser}</strong>
          </p>
          <button
            onClick={handleDisconnect}
            className="h-8 rounded-lg border border-zinc-200 px-3 text-[11.5px] font-medium text-zinc-600 transition hover:border-rose-400/40 hover:text-rose-600 dark:border-white/10 dark:text-zinc-400 dark:hover:text-rose-300"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3 pt-1">
          <div>
            <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Server URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://salaryzapp-pb.onrender.com"
              className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[12.5px] text-zinc-800 placeholder:text-zinc-400 focus:border-ember-400/40 focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200 dark:placeholder:text-zinc-600"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="varunkumarosb@gmail.com"
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[12.5px] text-zinc-800 placeholder:text-zinc-400 focus:border-ember-400/40 focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[12.5px] text-zinc-800 placeholder:text-zinc-400 focus:border-ember-400/40 focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ember-400 text-[12.5px] font-bold text-night-950 transition hover:bg-ember-300 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? "Connecting (Render waking up)..." : "Save & Connect"}
          </button>
        </form>
      )}
    </section>
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useLibrary();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
      />
      <div className="relative max-h-[86vh] w-full max-w-lg animate-rise overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-night-900 dark:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[26px] font-semibold text-zinc-900 dark:text-zinc-50">Settings</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/[0.05] dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Pen name & Theme Toggle */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="pen-name"
                className="block font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-zinc-500"
              >
                Pen name
              </label>
              <input
                id="pen-name"
                value={settings.writerName}
                onChange={(e) => updateSettings({ writerName: e.target.value })}
                placeholder="Writer"
                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:border-ember-400/50 focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-100 dark:placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                Appearance
              </label>
              <div className="flex h-9 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => {
                    document.documentElement.classList.add("dark");
                    localStorage.setItem("cngwriter:theme", "dark");
                  }}
                  className="flex-1 rounded-md text-[11.5px] font-medium text-zinc-600 transition hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.documentElement.classList.remove("dark");
                    localStorage.setItem("cngwriter:theme", "light");
                  }}
                  className="flex-1 rounded-md text-[11.5px] font-medium text-zinc-600 transition hover:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  Light
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-200 dark:bg-white/[0.06]" />

          {/* Cloud Sync */}
          <PocketBasePanel />

          <div className="h-px bg-zinc-200 dark:bg-white/[0.06]" />

          {/* Feature 1 + 2 live here */}
          <BackupPanel />

          <div className="flex items-center justify-between border-t border-zinc-200 pt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-400 dark:border-white/[0.05] dark:text-zinc-600">
            <span>CnG Writer · v1.0</span>
            <span>backups are portable JSON</span>
          </div>
        </div>
      </div>
    </div>
  );
}
