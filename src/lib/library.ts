/* ------------------------------------------------------------------ */
/*  LibraryService                                                     */
/*                                                                     */
/*  Offline-first story store. Always writes to localStorage so the    */
/*  app is instantly usable with zero setup; when a PocketBase URL +   */
/*  credentials are supplied it transparently syncs the "stories"      */
/*  collection (fields: title, content, word_count, user_id).          */
/*                                                                     */
/*  The JS SDK is loaded from a CDN <script> tag and looked up on      */
/*  window.PocketBase — if the CDN is unreachable the app simply       */
/*  keeps working in local mode.                                       */
/* ------------------------------------------------------------------ */

import {
  EMPTY_CONFIG,
  PBConfig,
  ConnStatus,
  Story,
  GenreKey,
  countWords,
  genreByKey,
  nowISO,
  uid,
} from "./model";

declare global {
  interface Window {
    PocketBase?: new (url: string) => any;
  }
}

const LS_STORIES = "cngwriter:v1:stories";
const LS_CONFIG = "cngwriter:v1:config";
const LS_SEEDED = "cngwriter:v1:seeded";

export interface LibrarySnapshot {
  stories: Story[];
  status: ConnStatus;
  statusDetail: string;
  authUser: string;
  config: PBConfig;
  cloudCount: number;
}

export type SaveOutcome = "local" | "cloud" | "pending";

/* --------------------------- sample drafts --------------------------- */

function seedStories(): Story[] {
  const t = Date.now();
  const make = (
    title: string,
    genre: GenreKey,
    content: string,
    offsetMin: number
  ): Story => ({
    id: uid(),
    title,
    content,
    genre,
    word_count: countWords(content),
    user_id: "local",
    created: new Date(t - offsetMin * 60_000).toISOString(),
    updated: new Date(t - offsetMin * 60_000).toISOString(),
    origin: "local",
  });

  return [
    make(
      "The Lighthouse at Veyra",
      "fantasy",
      [
        "The sea gave back what it took, but never in the same condition. Maren had learned this the winter the tide returned her father's compass, its needle spinning madly as if still searching for a coast that no longer existed.",
        "She lit the lamp every dusk out of habit more than hope. Forty-one years the Veyra light had burned without a keeper's hand, and forty-one years the village below had pretended not to notice. Children dared each other to climb the steps. Lovers carved initials into the railing. The fog came whether the lamp burned or not.",
        "On the last night of the storm season, Maren found the compass needle steady for the first time — pointing inland, toward the light. Upstairs, in the lens room where the salt wind should have been singing, she heard breathing. Slow. Patient. Familiar.",
        '"You kept it burning," said a voice the sea had swallowed decades ago. "That was the agreement."',
        "Maren set down the oil can. Outside, beyond the glass, the horizon rearranged itself like a sentence being rewritten — and for the first time in her life, the ocean spelled her name correctly.",
      ].join("\n\n"),
      3120
    ),
    make(
      "Welcome to CnG Writer",
      "nonfiction",
      [
        "This is your quiet place to draft — no ads, no nag screens, no algorithm. Just you, a blank page, and a word count that minds its own business until you ask for it.",
        "Start by pressing New Story, or open this note and delete it. As you type, the floating counter at the bottom tracks words, characters, and estimated reading time in real time. Everything auto-saves a beat after you stop typing, and Ctrl/Cmd+S saves instantly.",
        "Your work lives in this browser by default, so the app works with zero setup. When you are ready to sync across devices, open Settings and point CnG Writer at any PocketBase server (default http://127.0.0.1:8090) with a collection named cng_stories containing four fields: title (text), content (text), word_count (number), and user_id (text). Authenticate with an email/password or an auth token and your drafts follow you.",
        "That is the whole feature set. The rest is writing.",
      ].join("\n\n"),
      55
    ),
  ];
}

/* ------------------------------- service ---------------------------- */

type Listener = () => void;

class LibraryService {
  private stories: Story[] = [];
  private status: ConnStatus = "local";
  private statusDetail = "Saving to this browser";
  private authUser = "";
  private config: PBConfig = { ...EMPTY_CONFIG };
  private pb: any = null;
  private listeners = new Set<Listener>();
  private snapshot: LibrarySnapshot;
  private initialized = false;

  constructor() {
    this.snapshot = this.buildSnapshot();
  }

  /* --- react subscription --- */

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): LibrarySnapshot => this.snapshot;

  private buildSnapshot(): LibrarySnapshot {
    return {
      stories: [...this.stories].sort(
        (a, b) => +new Date(b.updated) - +new Date(a.updated)
      ),
      status: this.status,
      statusDetail: this.statusDetail,
      authUser: this.authUser,
      config: { ...this.config },
      cloudCount: this.stories.filter((s) => s.origin === "cloud").length,
    };
  }

  private notify() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  /* --- lifecycle --- */

  init() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const raw = localStorage.getItem(LS_STORIES);
      this.stories = raw ? (JSON.parse(raw) as Story[]) : [];
    } catch {
      this.stories = [];
    }

    if (!localStorage.getItem(LS_SEEDED) && this.stories.length === 0) {
      this.stories = seedStories();
      localStorage.setItem(LS_SEEDED, "1");
      this.persistLocal();
    }

    try {
      const rawCfg = localStorage.getItem(LS_CONFIG);
      if (rawCfg) this.config = { ...EMPTY_CONFIG, ...JSON.parse(rawCfg) };
    } catch {
      /* keep defaults */
    }

    this.notify();

    // Auto-reconnect silently if the user previously saved credentials.
    if (this.config.url && this.config.method !== "none") {
      void this.connect(this.config, true).catch(() => {});
    }
  }

  /* --- PocketBase wiring --- */

  private async sdkCtor(): Promise<NonNullable<typeof window.PocketBase>> {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      if (window.PocketBase) return window.PocketBase;
      await new Promise((r) => setTimeout(r, 80));
    }
    throw new Error(
      "PocketBase SDK failed to load from the CDN. Check your network and reload."
    );
  }

  async connect(cfg: PBConfig, silent = false): Promise<string> {
    if (!cfg.url.trim()) {
      if (!silent) {
        this.status = "local";
        this.statusDetail = "Saving to this browser";
        this.config = { ...cfg };
        this.persistConfig();
        this.notify();
      }
      return "local";
    }

    this.config = { ...cfg, url: cfg.url.trim().replace(/\/+$/, "") };
    this.status = "connecting";
    this.statusDetail = "Contacting server…";
    this.authUser = "";
    this.notify();

    try {
      const PB = await this.sdkCtor();
      const pb = new PB(this.config.url);

      if (this.config.method === "token") {
        pb.authStore.save(this.config.token.trim());
      } else if (this.config.method === "password") {
        await this.authWithPassword(pb);
      }

      // Prove collection access — throws a clean error if rules block us.
      const records: any[] = await pb.collection("cng_stories").getFullList({
        sort: "-updated",
        autoCancel: false,
      });

      this.pb = pb;
      this.mergeRemote(records);
      this.status = "connected";
      this.statusDetail = this.pb.authStore.isValid
        ? "Synced with PocketBase"
        : "Connected (open rules)";
      this.authUser =
        this.pb.authStore.model?.email ||
        this.pb.authStore.model?.name ||
        (this.pb.authStore.isValid ? "token session" : "anonymous");
      this.persistConfig();
      this.persistLocal();
      this.notify();
      return "connected";
    } catch (err: any) {
      this.pb = null;
      this.status = "error";
      this.statusDetail =
        err?.status === 0
          ? "Server unreachable — staying local"
          : err?.message || "Connection failed — staying local";
      this.persistConfig();
      this.notify();
      if (!silent) throw err;
      return "error";
    }
  }

  private async authWithPassword(pb: any) {
    const id = this.config.email.trim();
    const pw = this.config.password;
    if (!id || !pw) throw new Error("Enter an email and password.");
    try {
      await pb.collection("users").authWithPassword(id, pw);
      return;
    } catch {
      /* fall through to superuser auth */
    }
    try {
      await pb.collection("_superusers").authWithPassword(id, pw);
    } catch (err: any) {
      throw new Error(err?.message || "Authentication failed.");
    }
  }

  disconnect() {
    this.pb = null;
    this.status = "local";
    this.statusDetail = "Saving to this browser";
    this.authUser = "";
    // cloud copies remain, but are now local-only
    this.stories = this.stories.map((s) => ({ ...s, origin: "local" as const, pending: false }));
    this.config = { ...this.config, method: "none" };
    this.persistConfig();
    this.persistLocal();
    this.notify();
  }

  private mergeRemote(records: any[]) {
    const remoteStories: Story[] = records.map((r) => ({
      id: `c_${r.id}`,
      remoteId: r.id,
      title: r.title ?? "",
      content: r.content ?? "",
      genre: genreByKey(r.genre ?? "fiction").key,
      word_count:
        typeof r.word_count === "number" ? r.word_count : countWords(r.content ?? ""),
      user_id: r.user_id ?? this.userId(),
      created: r.created ?? nowISO(),
      updated: r.updated ?? nowISO(),
      origin: "cloud" as const,
    }));

    const remoteIds = new Set(remoteStories.map((s) => s.remoteId));
    const localOnly = this.stories
      .filter((s) => !s.remoteId || !remoteIds.has(s.remoteId))
      .map((s) => ({ ...s, origin: "local" as const }));

    this.stories = [...remoteStories, ...localOnly];
  }

  private userId(): string {
    const m = this.pb?.authStore?.model;
    return m?.id || m?.email || "local";
  }

  /* --- CRUD --- */

  getById(id: string): Story | undefined {
    return this.stories.find((s) => s.id === id);
  }

  create(): Story {
    const story: Story = {
      id: uid(),
      title: "",
      content: "",
      genre: genreByKey("fiction").key,
      word_count: 0,
      user_id: "local",
      created: nowISO(),
      updated: nowISO(),
      origin: "local",
    };
    this.stories = [story, ...this.stories];
    this.persistLocal();
    this.notify();
    return story;
  }

  async upsert(patch: {
    id: string;
    title: string;
    content: string;
    genre: GenreKey;
  }): Promise<SaveOutcome> {
    const idx = this.stories.findIndex((s) => s.id === patch.id);
    if (idx === -1) return "local";

    const prev = this.stories[idx];
    const story: Story = {
      ...prev,
      title: patch.title,
      content: patch.content,
      genre: patch.genre,
      word_count: countWords(patch.content),
      updated: nowISO(),
    };

    // 1) local first — never lose words
    this.stories = [
      ...this.stories.slice(0, idx),
      story,
      ...this.stories.slice(idx + 1),
    ];
    this.persistLocal();
    this.notify();

    // 2) optional cloud sync
    if (this.pb && this.status === "connected") {
      try {
        const saved = await this.remoteWrite(story);
        story.remoteId = saved.id;
        story.origin = "cloud";
        story.pending = false;
        this.replaceStory(story);
        return "cloud";
      } catch {
        story.pending = true;
        this.replaceStory(story);
        return "pending";
      }
    }
    story.pending = false;
    return "local";
  }

  /**
   * Create/update on PocketBase. Sends the exact 4 fields from the docs
   * schema — title, content, word_count, user_id — plus genre. If the
   * server rejects unknown fields (schema without "genre"), it retries
   * with the minimal payload so saving never breaks.
   */
  private async remoteWrite(story: Story): Promise<any> {
    const col = this.pb.collection("cng_stories");
    const full = {
      title: story.title,
      content: story.content,
      word_count: story.word_count,
      user_id: this.userId(),
      genre: story.genre,
    };
    const minimal = {
      title: story.title,
      content: story.content,
      word_count: story.word_count,
      user_id: this.userId(),
    };
    const write = (data: Record<string, unknown>) =>
      story.remoteId ? col.update(story.remoteId, data) : col.create(data);
    try {
      return await write(full);
    } catch {
      return await write(minimal);
    }
  }

  async remove(id: string): Promise<void> {
    const story = this.stories.find((s) => s.id === id);
    this.stories = this.stories.filter((s) => s.id !== id);
    this.persistLocal();
    this.notify();
    if (story?.remoteId && this.pb && this.status === "connected") {
      try {
        await this.pb.collection("cng_stories").delete(story.remoteId);
      } catch {
        /* record may already be gone server-side */
      }
    }
  }

  /** Push every local/pending story to PocketBase when connected. */
  async pushLocalToCloud(): Promise<number> {
    if (!this.pb || this.status !== "connected") return 0;
    let pushed = 0;
    const targets = this.stories.filter((s) => s.origin === "local" || s.pending);
    for (const s of targets) {
      try {
        const saved = await this.remoteWrite(s);
        this.replaceStory({
          ...s,
          remoteId: saved.id,
          origin: "cloud",
          pending: false,
        });
        pushed++;
      } catch {
        /* keep it local */
      }
    }
    this.persistLocal();
    this.notify();
    return pushed;
  }

  private replaceStory(story: Story) {
    this.stories = this.stories.map((s) => (s.id === story.id ? story : s));
    this.persistLocal();
    this.notify();
  }

  /* --- storage utils --- */

  private persistLocal() {
    try {
      localStorage.setItem(LS_STORIES, JSON.stringify(this.stories));
    } catch {
      /* quota exceeded — words still live in memory */
    }
  }

  private persistConfig() {
    try {
      localStorage.setItem(LS_CONFIG, JSON.stringify(this.config));
    } catch {
      /* ignore */
    }
  }

  exportJSON(): string {
    return JSON.stringify(this.stories, null, 2);
  }

  clearLocal() {
    this.stories = [];
    this.persistLocal();
    this.notify();
  }
}

export const library = new LibraryService();
