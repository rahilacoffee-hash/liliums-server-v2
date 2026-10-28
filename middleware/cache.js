// In-memory response cache for PUBLIC, user-independent GET endpoints.
//
// - No new infrastructure. Right for a single Render instance.
// - If you ever run 2+ instances, each keeps its own copy (stale up to the TTL
//   after an admin edit). At that point swap the Map for Redis; the route code
//   (cache(...) / invalidateOnWrite(...)) stays the same.
// - Only 200 responses are stored. Memory is bounded (MAX_ENTRIES, MAX_BODY_BYTES).
// - Check the X-Cache response header: HIT or MISS.

const MAX_ENTRIES = 300;
const MAX_BODY_BYTES = 512 * 1024;

const store = new Map(); // key -> { text, expires }   (Map order = oldest first)
const versions = new Map(); // namespace -> number

function remember(key, text, ttlMs) {
  if (store.size >= MAX_ENTRIES) {
    store.delete(store.keys().next().value); // evict the oldest entry
  }
  store.set(key, { text, expires: Date.now() + ttlMs });
}

export function cache(namespace, ttlSeconds = 60, { skip } = {}) {
  // s-maxage lets a CDN cache it too; browsers revalidate via ETag (304).
  const cacheControl = `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`;

  return (req, res, next) => {
    if (req.method !== "GET" || (skip && skip(req))) return next();

    const query = Object.entries(req.query).sort(([a], [b]) => (a < b ? -1 : 1));
    const key = `${namespace}:${versions.get(namespace) ?? 0}:${req.baseUrl}${req.path}:${JSON.stringify(query)}`;

    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) {
      store.delete(key); // refresh recency
      store.set(key, hit);
      res.set({ "X-Cache": "HIT", "Cache-Control": cacheControl });
      return res.status(200).type("application/json").send(hit.text);
    }
    if (hit) store.delete(key);

    res.set({ "X-Cache": "MISS", "Cache-Control": cacheControl });
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode !== 200) return originalJson(body);
      const text = JSON.stringify(body);
      if (text.length <= MAX_BODY_BYTES) remember(key, text, ttlSeconds * 1000);
      return res.type("application/json").send(text);
    };
    next();
  };
}

// Drop everything cached under these namespaces (instant, in-process).
export function invalidate(...namespaces) {
  for (const ns of namespaces) {
    versions.set(ns, (versions.get(ns) ?? 0) + 1);
    for (const key of store.keys()) {
      if (key.startsWith(`${ns}:`)) store.delete(key);
    }
  }
}

// Put on admin write routes. Clears the cache just before a successful (<400)
// response is sent, so the very next read can never see stale data.
export function invalidateOnWrite(...namespaces) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) invalidate(...namespaces);
      return originalJson(body);
    };
    next();
  };
}
