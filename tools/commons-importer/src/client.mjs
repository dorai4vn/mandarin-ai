// Minimal MediaWiki Action API client for Wikimedia Commons.
// Official API only (no HTML scraping). fetch is injected so tests never touch the network.
// Bounded: request budget, per-request timeout, capped response bodies, serial, no retry,
// no redirects. Cache is versioned, TTL-bound for API JSON, and content-verified for files.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isCommonsFileUrl, normalizeSha1, verifySha1 } from './provenance.mjs';

export const API = 'https://commons.wikimedia.org/w/api.php';
export const CACHE_VERSION = 2; // bump to invalidate every previously cached entry
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_JSON_BYTES = 5 * 1024 * 1024;

export class BudgetExceeded extends Error {}

/** HTTP 429 (or 503 with Retry-After): the run must stop issuing network requests. */
export class RateLimited extends Error {
  constructor(status, retryAfterSeconds, retryAt) {
    super(`rate-limited:http-${status}`);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds; // null if header absent/unparseable
    this.retryAt = retryAt; // ISO string or null
  }
}

/** Retry-After: delta-seconds or HTTP-date. Returns seconds (>=0) or null. */
export function parseRetryAfter(value, nowMs) {
  if (value == null) return null;
  const v = String(value).trim();
  if (/^\d+$/.test(v)) return Number(v);
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - nowMs) / 1000));
}

/** Reads at most `max` bytes; aborts the stream as soon as the cap is exceeded. */
export async function readBounded(r, max) {
  const declared = Number(r.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > max) throw new Error('response-too-large');
  if (!r.body?.getReader) {
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length > max) throw new Error('response-too-large');
    return b;
  }
  const reader = r.body.getReader();
  const chunks = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > max) {
      await reader.cancel().catch(() => {});
      throw new Error('response-too-large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Validates a parsed Action API response; API-level errors arrive with HTTP 200. */
export function assertApiOk(res) {
  if (res === null || typeof res !== 'object' || Array.isArray(res))
    throw new Error('api-malformed');
  if (res.error) throw new Error(`api-error:${res.error.code ?? 'unknown'}`);
  if (res.query !== undefined && (res.query === null || typeof res.query !== 'object'))
    throw new Error('api-malformed');
  if (res.query?.pages !== undefined && !Array.isArray(res.query.pages))
    throw new Error('api-malformed');
  return res;
}

export function createClient({
  fetchImpl = globalThis.fetch,
  userAgent,
  maxRequests = 50,
  cacheDir = null,
  offline = false,
  timeoutMs = 15000,
  maxAgeMs = 24 * 3600 * 1000,
  now = () => Date.now(),
  minIntervalMs = 2000, // conservative serial pacing between network requests
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  if (!userAgent) throw new Error('userAgent required (Wikimedia API policy: identify the client)');
  let used = 0;
  let lastRequestAt = null;
  let halted = null; // RateLimited once a 429 was seen: no further network requests this run
  const cachePath = (key) =>
    path.join(cacheDir, createHash('sha256').update(key).digest('hex') + '.json');
  async function readCache(key, validate) {
    if (!cacheDir) return undefined;
    try {
      const e = JSON.parse(await readFile(cachePath(key), 'utf8'));
      if (e?.v !== CACHE_VERSION || e.key !== key || typeof e.fetchedAt !== 'number')
        return undefined;
      return validate(e) ? e.body : undefined;
    } catch {
      return undefined; // missing, corrupt or invalid => miss
    }
  }
  async function writeCache(key, body) {
    if (!cacheDir) return;
    await mkdir(cacheDir, { recursive: true });
    const p = cachePath(key);
    const tmp = `${p}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ v: CACHE_VERSION, key, fetchedAt: now(), body }));
    await rename(tmp, p);
  }
  async function guardedFetch(url, headers, max) {
    if (halted) throw halted; // never re-contact the server after 429
    if (++used > maxRequests) throw new BudgetExceeded(`request budget ${maxRequests} exhausted`);
    if (lastRequestAt !== null) {
      const wait = lastRequestAt + minIntervalMs - now();
      if (wait > 0) await sleep(wait);
    }
    lastRequestAt = now();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetchImpl(url, { headers, redirect: 'manual', signal: ctl.signal });
      if (r.type === 'opaqueredirect' || r.redirected || (r.status >= 300 && r.status < 400))
        throw new Error(`redirect-not-allowed:${r.status}`);
      if (r.status === 429) {
        const ra = parseRetryAfter(r.headers?.get?.('retry-after'), now());
        halted = new RateLimited(
          429,
          ra,
          ra === null ? null : new Date(now() + ra * 1000).toISOString(),
        );
        throw halted;
      }
      if (!r.ok) throw new Error(`http-${r.status}`);
      return await readBounded(r, max);
    } finally {
      clearTimeout(timer);
    }
  }
  async function getJson(params) {
    const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
    const key = `api:v${CACHE_VERSION}:${url}`;
    const fresh = (e) => offline || now() - e.fetchedAt <= maxAgeMs; // offline: stale allowed by design
    const hit = await readCache(key, (e) => fresh(e) && safeApi(e.body));
    if (hit !== undefined) return hit;
    if (offline) throw new Error(`offline-cache-miss:${key}`);
    const bytes = await guardedFetch(
      url,
      { 'User-Agent': userAgent, 'Api-User-Agent': userAgent },
      MAX_JSON_BYTES,
    );
    const res = assertApiOk(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
    await writeCache(key, res);
    return res;
  }
  const safeApi = (b) => {
    try {
      assertApiOk(b);
      return true;
    } catch {
      return false;
    }
  };
  /** Lists SVG files in a category with imageinfo + revision metadata, following `continue`. */
  async function listCategory(category, { pageLimit = 5, batch = 50 } = {}) {
    const files = [];
    let cont = {};
    for (let page = 0; page < pageLimit; page++) {
      const res = await getJson({
        action: 'query',
        generator: 'categorymembers',
        gcmtitle: category,
        gcmtype: 'file',
        gcmlimit: String(batch),
        prop: 'imageinfo|revisions',
        iiprop: 'url|sha1|size|mime|timestamp|extmetadata',
        rvprop: 'ids|timestamp',
        ...cont,
      });
      for (const p of res.query?.pages ?? []) files.push(p);
      if (!res.continue) return { files, complete: true };
      cont = res.continue;
    }
    return { files, complete: false, continuation: cont }; // truncated: caller must not claim full coverage
  }
  /** Looks up exact File: titles (batches of 50). Missing titles come back with `missing: true`. */
  async function listTitles(titles, { batch = 50 } = {}) {
    const files = [];
    const sorted = [...new Set(titles)].sort();
    for (let i = 0; i < sorted.length; i += batch) {
      const res = await getJson({
        action: 'query',
        titles: sorted.slice(i, i + batch).join('|'),
        prop: 'imageinfo|revisions',
        iiprop: 'url|sha1|size|mime|timestamp|extmetadata',
        rvprop: 'ids|timestamp',
      });
      for (const p of res.query?.pages ?? []) files.push(p);
    }
    return { files, complete: true };
  }
  /**
   * Downloads one SVG. `sha1` (upstream, hex or base36) is mandatory: the cache key is bound to
   * it (a changed upstream file can never be served from an old cache entry) and the raw bytes
   * are verified against it on download AND on every cache read.
   */
  async function downloadSvg(url, { sha1 } = {}) {
    if (!isCommonsFileUrl(url)) throw new Error(`url-not-allowed:${url}`);
    const want = normalizeSha1(sha1);
    if (!want) throw new Error('sha1-required');
    const key = `file:v${CACHE_VERSION}:${want}:${url}`;
    const dec = (b) => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b);
    const hit = await readCache(key, (e) => {
      try {
        return typeof e.body === 'string' && verifySha1(Buffer.from(e.body, 'utf8'), want);
      } catch {
        return false;
      }
    });
    if (hit !== undefined) return hit;
    if (offline) throw new Error(`offline-cache-miss:${key}`);
    const bytes = await guardedFetch(url, { 'User-Agent': userAgent }, MAX_FILE_BYTES);
    if (!verifySha1(bytes, want)) throw new Error('sha1-mismatch');
    const text = dec(bytes);
    await writeCache(key, text);
    return text;
  }
  return { listCategory, listTitles, downloadSvg, requestsUsed: () => used, rateLimited: () => halted };
}
