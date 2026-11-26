// Minimal MediaWiki Action API client for Wikimedia Commons.
// Official API only (no HTML scraping). fetch is injected so tests never touch the network.
// Bounded: hard cap on requests, serial, optional on-disk cache, no automatic retry.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const API = 'https://commons.wikimedia.org/w/api.php';
const FILE_HOSTS = new Set(['upload.wikimedia.org']);
const MAX_FILE_BYTES = 1024 * 1024;

export class BudgetExceeded extends Error {}

export function createClient({
  fetchImpl = globalThis.fetch,
  userAgent,
  maxRequests = 50,
  cacheDir = null,
  offline = false,
} = {}) {
  if (!userAgent) throw new Error('userAgent required (Wikimedia API policy: identify the client)');
  let used = 0;
  const cachePath = (key) =>
    path.join(cacheDir, createHash('sha256').update(key).digest('hex') + '.json');
  async function cached(key, producer) {
    if (cacheDir) {
      try {
        return JSON.parse(await readFile(cachePath(key), 'utf8'));
      } catch {
        /* miss */
      }
    }
    if (offline) throw new Error(`offline-cache-miss:${key}`);
    if (++used > maxRequests) throw new BudgetExceeded(`request budget ${maxRequests} exhausted`);
    const v = await producer();
    if (cacheDir) {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cachePath(key), JSON.stringify(v));
    }
    return v;
  }
  async function getJson(params) {
    const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
    return cached(url, async () => {
      const r = await fetchImpl(url, {
        headers: { 'User-Agent': userAgent, 'Api-User-Agent': userAgent },
      });
      if (!r.ok) throw new Error(`http-${r.status}:${url}`);
      return r.json();
    });
  }
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
    return { files, complete: false, continuation: cont }; // truncated by pageLimit: caller must not claim full coverage
  }
  async function downloadSvg(url) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !FILE_HOSTS.has(u.hostname))
      throw new Error(`host-not-allowed:${u.hostname}`);
    return cached(`file:${url}`, async () => {
      const r = await fetchImpl(url, { headers: { 'User-Agent': userAgent } });
      if (!r.ok) throw new Error(`http-${r.status}:${url}`);
      const text = await r.text();
      if (Buffer.byteLength(text) > MAX_FILE_BYTES) throw new Error('file-too-large');
      return text;
    });
  }
  return { listCategory, downloadSvg, requestsUsed: () => used };
}
