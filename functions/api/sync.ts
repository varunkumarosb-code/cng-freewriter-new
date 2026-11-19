interface Env {
  DB?: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Fallback if D1 is not yet bound
  if (!env.DB) {
    return new Response(JSON.stringify({ 
      error: "D1 Database not bound. Please bind 'DB' in Cloudflare Pages dashboard.",
      offline: true 
    }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  // Ensure table exists
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sanctuary_vault (
      sync_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();

  // GET /api/sync?key=CNG-XXXX
  if (request.method === "GET") {
    const key = url.searchParams.get("key");
    if (!key) return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });

    const result = await env.DB.prepare(
      "SELECT payload, updated_at FROM sanctuary_vault WHERE sync_key = ?"
    ).bind(key).first();

    if (!result) return new Response(JSON.stringify({ found: false }), { status: 404 });
    return new Response(JSON.stringify({ found: true, payload: result.payload, updated_at: result.updated_at }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // POST /api/sync
  if (request.method === "POST") {
    try {
      const body = await request.json() as { sync_key: string; payload: string; updated_at?: number };
      if (!body.sync_key || !body.payload) {
        return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400 });
      }

      const now = body.updated_at || Date.now();
      await env.DB.prepare(`
        INSERT INTO sanctuary_vault (sync_key, payload, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(sync_key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
      `).bind(body.sync_key, body.payload, now).run();

      return new Response(JSON.stringify({ success: true, updated_at: now }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
