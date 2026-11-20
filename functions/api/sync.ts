interface Env {
  DB?: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-sanctuary-key',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({
      error: 'D1 Database not bound. Please bind \'DB\' in Cloudflare Pages dashboard.',
      offline: true
    }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sanctuary_vault (
      sync_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();

  if (request.method === 'GET') {
    // Read key from query param ?key=... or header x-sanctuary-key
    const key = url.searchParams.get('key') || request.headers.get('x-sanctuary-key');
    if (!key) return new Response(JSON.stringify({ error: 'Missing key' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const result = await env.DB.prepare(
      'SELECT payload, updated_at FROM sanctuary_vault WHERE sync_key = ?'
    ).bind(key).first<{ payload: string; updated_at: number }>();

    if (!result) return new Response(JSON.stringify({ found: false }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Normalize payload: ensure valid JSON string containing {stories, categories}
    let parsed: any = null;
    try {
      parsed = JSON.parse(result.payload);
    } catch {
      parsed = result.payload;
    }

    // Return both new and legacy shapes for compatibility
    return new Response(JSON.stringify({
      success: true,
      payload: parsed,
      updatedAt: result.updated_at,
      // legacy compatibility
      found: true,
      updated_at: result.updated_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json() as any;
      // Accept both {key, payload, updatedAt} and {sync_key, payload, updated_at}
      const syncKey = body.key || body.sync_key || body.syncKey;
      let payload = body.payload;
      const updatedAt = body.updatedAt || body.updated_at || Date.now();

      if (!syncKey || payload === undefined || payload === null) {
        return new Response(JSON.stringify({ error: 'Invalid body: missing key or payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Normalize payload: ensure stored as valid JSON string containing {stories, categories}
      let payloadStr: string;
      let parsedForCount: any = null;
      if (typeof payload === 'string') {
        try {
          parsedForCount = JSON.parse(payload);
          payloadStr = payload;
        } catch {
          // If not valid JSON, wrap as string
          payloadStr = JSON.stringify({ stories: [], categories: [], raw: payload });
        }
      } else if (payload && typeof payload === 'object') {
        parsedForCount = payload;
        // Ensure contains stories/categories; if missing, preserve as-is
        payloadStr = JSON.stringify(payload);
      } else {
        return new Response(JSON.stringify({ error: 'Invalid payload format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Validate that parsed payload has expected structure if possible, but don't reject soft-delete fields
      let count = 0;
      try {
        if (parsedForCount && Array.isArray(parsedForCount.stories)) count = parsedForCount.stories.length;
        else if (typeof payloadStr === 'string') {
          const tmp = JSON.parse(payloadStr);
          if (tmp && Array.isArray(tmp.stories)) count = tmp.stories.length;
        }
      } catch {}

      const now = Number(updatedAt) || Date.now();

      await env.DB.prepare(`
        INSERT INTO sanctuary_vault (sync_key, payload, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(sync_key) DO UPDATE SET
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `).bind(syncKey, payloadStr, now).run();

      return new Response(JSON.stringify({ success: true, count, updatedAt: now, updated_at: now }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};
