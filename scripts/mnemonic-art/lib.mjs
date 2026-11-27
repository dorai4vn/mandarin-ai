// Lightweight on-demand mnemonic artwork generator (M3.5). Personal-use-first: NOT a queue/worker/admin
// platform. Pure, injectable functions so every step is testable with mocks and no network.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

export const IMAGE_WIDTH = 1600;
export const IMAGE_HEIGHT = 1200;
export const MAX_RETRIES_CAP = 3;
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function loadDataset(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(data.characters) || !data.meta) throw new Error('dataset: bad shape');
  return data;
}

export function buildPrompt(char, meta) {
  return [
    meta.artworkStyle,
    `Scene: ${char.artwork.brief}`,
    'Absolutely no text, letters, Chinese characters, logos or watermarks anywhere in the image.',
    'Landscape 4:3 composition, subject clearly readable, safe margins.',
  ].join('\n');
}
export const promptHash = (prompt) => sha256(Buffer.from(prompt, 'utf8'));

/** Weak-brief / Vietnamese content review before any spend. Returns [{id,hanzi,issue}]. */
export function reviewDataset(data) {
  const out = [];
  const add = (c, issue, severity = 'error') =>
    out.push({ id: c.id, hanzi: c.hanzi, issue, severity });
  const abstract = /\b(concept|idea|abstract|feeling|symbol of|represents|metaphor)\b/i;
  const visual =
    /\b(light|lit|glow|sunlight|shadow|dusk|dawn|morning|window|lantern|steam|golden|moon|mist|fog|rim|backlit|candle)/i;
  const texture =
    /\b(wood|stone|porcelain|silk|paper|moss|bamboo|lacquer|ceramic|linen|cotton|metal|brass|clay|leaf|leaves|water|snow|grain|fabric|steel|iron|glass|rain|bark|rock|sand|rice|tea|ink)/i;
  for (const c of data.characters) {
    const b = c.artwork?.brief ?? '';
    if (b.length < 70) add(c, `brief too short (${b.length} chars)`);
    if (abstract.test(b)) add(c, 'brief uses abstract wording; needs a concrete scene');
    if (!visual.test(b))
      add(
        c,
        'brief has no lighting/atmosphere cue (global style prompt supplies lighting)',
        'warn',
      );
    if (!texture.test(b))
      add(c, 'brief names no material/texture (global style prompt supplies textures)', 'warn');
    if (/[一-鿿]/.test(b)) add(c, 'brief contains Hanzi (artwork must have no characters)');
    if (!c.meaningVi || c.meaningVi.trim().length < 2) add(c, 'meaningVi empty');
    for (const e of c.examples ?? []) {
      if (!e.vi || e.vi.trim().length < 2) add(c, `example "${e.zh}" lacks Vietnamese gloss`);
      if (e.zh && !e.zh.includes(c.hanzi)) add(c, `example "${e.zh}" lacks character`);
    }
  }
  return out;
}

/** Explicit selection only: --only 山,水  or --ids 1-10,15. Returns characters. */
export function select(data, { only, ids, all }) {
  const chars = data.characters;
  if (all) return chars;
  const picked = new Set();
  if (only)
    for (const h of only
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      const c = chars.find((x) => x.hanzi === h || x.artwork.file === h);
      if (!c) throw new Error(`select: unknown character/file "${h}"`);
      picked.add(c);
    }
  if (ids)
    for (const part of ids.split(',')) {
      const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
      if (!m) throw new Error(`select: bad id range "${part}"`);
      const a = Number(m[1]),
        b = Number(m[2] ?? m[1]);
      for (let i = a; i <= b; i++) {
        const c = chars.find((x) => x.id === i);
        if (!c) throw new Error(`select: unknown id ${i}`);
        picked.add(c);
      }
    }
  return [...picked];
}

export function loadManifest(path) {
  if (!existsSync(path)) return { version: 1, spentUsdEstimated: 0, entries: {} };
  const m = JSON.parse(readFileSync(path, 'utf8'));
  if (m.version !== 1 || typeof m.entries !== 'object') throw new Error('manifest: bad shape');
  return m;
}
/** Atomic write so a crash never leaves a half-written resumable manifest. */
export function saveManifest(path, m) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2) + '\n');
  renameSync(tmp, path);
}

/** Local mock storage; same put(path, body, contentType) shape as ObjectStoragePort. Confines writes to root. */
export function localStorage(root) {
  const base = resolve(root);
  const full = (p) => {
    const f = resolve(base, p);
    if (f !== base && !f.startsWith(base + sep)) throw new Error('storage: path escapes root');
    return f;
  };
  return {
    mode: 'mock',
    async put(path, body) {
      const f = full(path);
      mkdirSync(dirname(f), { recursive: true });
      writeFileSync(f, body);
    },
    async get(path) {
      const f = full(path);
      return existsSync(f) ? readFileSync(f) : null;
    },
  };
}

export function isWebp(buf, w = IMAGE_WIDTH, h = IMAGE_HEIGHT, dims) {
  const ok =
    buf.length > 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP';
  return ok && (!dims || (dims.width === w && dims.height === h));
}

/** Real optimizer: sharp (optional, not a repo dependency). Fails with setup instructions if absent. */
export async function sharpOptimizer() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error('sharp not installed. Install locally (not committed): npm i --no-save sharp');
  }
  return async (input) => {
    const { data, info } = await sharp(input)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'cover' })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { body: data, width: info.width, height: info.height };
  };
}

/** Provider wrapper (OpenAI-style Images API). Only constructed for --live; never logs the key. */
export function openaiProvider({ apiKey, model, fetchImpl = fetch, timeoutMs = 120000 }) {
  if (!apiKey) throw new Error('missing credential env var MNEMONIC_IMAGE_API_KEY');
  return {
    name: 'openai-images',
    model,
    async generate(prompt) {
      const res = await fetchImpl('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, prompt, n: 1, size: '1536x1024' }),
      });
      if (!res.ok) {
        const e = new Error(`provider HTTP ${res.status}`);
        e.status = res.status;
        throw e;
      }
      const j = await res.json();
      const b64 = j?.data?.[0]?.b64_json;
      if (typeof b64 !== 'string') throw new Error('provider: no b64_json in response');
      return Buffer.from(b64, 'base64');
    },
  };
}

const retryable = (e) =>
  e.status === 429 || (e.status >= 500 && e.status < 600) || e.status === undefined;

/**
 * Core run. Never makes a provider call unless live===true. Guarantees:
 * - no duplicate requests: an entry with the same promptHash and a verified file is skipped; an entry stuck in
 *   'requested' (crash after a possibly-billed call) is NOT re-requested without force;
 * - every attempt (incl. retries) counts toward the spend guard before it is made;
 * - manifest saved after every state change (resumable).
 */
export async function run({
  data,
  selection,
  manifestPath,
  storage,
  provider,
  optimize,
  live = false,
  force = false,
  maxSpendUsd = 0,
  unitPriceUsd = 0,
  maxRetries = 2,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = () => {},
}) {
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > MAX_RETRIES_CAP)
    throw new Error(`maxRetries must be 0..${MAX_RETRIES_CAP}`);
  const manifest = loadManifest(manifestPath);
  const plan = [];
  for (const c of selection) {
    const prompt = buildPrompt(c, data.meta);
    const ph = promptHash(prompt);
    const e = manifest.entries[c.artwork.file];
    let action = 'generate';
    if (e?.status === 'requested' && !force) action = 'blocked-unresolved-request';
    else if (e?.status === 'stored' && e.promptHash === ph && !force) {
      const body = await storage.get(e.path);
      action = body && sha256(body) === e.sha256 ? 'skip-verified' : 'repair-needs-force';
      if (action === 'repair-needs-force' && !force) action = 'blocked-file-mismatch';
    }
    plan.push({ char: c, prompt, ph, action });
  }
  const todo = plan.filter((p) => p.action === 'generate');
  const worst = todo.length * unitPriceUsd * (1 + maxRetries);
  const summary = {
    live,
    planned: plan.length,
    toGenerate: todo.length,
    worstCaseUsd: worst,
    generated: 0,
    failed: 0,
    skipped: 0,
    blocked: 0,
    spentUsd: 0,
  };
  summary.skipped = plan.filter((p) => p.action === 'skip-verified').length;
  summary.blocked = plan.filter((p) => p.action.startsWith('blocked')).length;
  if (!live)
    return {
      summary,
      plan: plan.map((p) => ({ hanzi: p.char.hanzi, file: p.char.artwork.file, action: p.action })),
    };

  if (!(maxSpendUsd > 0)) throw new Error('live requires --max-spend-usd > 0');
  if (!(unitPriceUsd > 0)) throw new Error('live requires a verified unit price');
  if (manifest.spentUsdEstimated + todo.length * unitPriceUsd > maxSpendUsd)
    throw new Error(
      `spend guard: ${manifest.spentUsdEstimated} spent + ${todo.length}x${unitPriceUsd} exceeds max ${maxSpendUsd}`,
    );

  for (const p of todo) {
    const file = p.char.artwork.file;
    const path = `mnemonic/${file}`;
    let attempt = 0;
    for (;;) {
      if (manifest.spentUsdEstimated + unitPriceUsd > maxSpendUsd) {
        log(`spend cap reached before ${file}`);
        saveManifest(manifestPath, manifest);
        return { summary, plan: [] };
      }
      manifest.spentUsdEstimated = round6(manifest.spentUsdEstimated + unitPriceUsd);
      summary.spentUsd = round6(summary.spentUsd + unitPriceUsd);
      manifest.entries[file] = {
        status: 'requested',
        hanzi: p.char.hanzi,
        promptHash: p.ph,
        attempts: attempt + 1,
        provider: provider.name,
        model: provider.model,
      };
      saveManifest(manifestPath, manifest);
      try {
        const raw = await provider.generate(p.prompt);
        const { body, width, height } = await optimize(raw);
        if (!isWebp(body, IMAGE_WIDTH, IMAGE_HEIGHT, { width, height }))
          throw Object.assign(new Error('optimized output is not 1600x1200 webp'), {
            status: 0,
            fatal: true,
          });
        await storage.put(path, body, 'image/webp');
        const back = await storage.get(path);
        if (!back || sha256(back) !== sha256(body))
          throw Object.assign(new Error('upload checksum mismatch'), { status: 0, fatal: true });
        manifest.entries[file] = {
          ...manifest.entries[file],
          status: 'stored',
          path,
          sha256: sha256(body),
          bytes: body.length,
          width,
          height,
          storedAt: new Date().toISOString(),
          priceUsdEstimated: unitPriceUsd,
        };
        saveManifest(manifestPath, manifest);
        summary.generated++;
        break;
      } catch (err) {
        const again = !err.fatal && retryable(err) && attempt < maxRetries;
        if (again) {
          attempt++;
          await sleep(2000 * 2 ** attempt);
          continue;
        }
        manifest.entries[file] = {
          ...manifest.entries[file],
          status: 'failed',
          error: String(err.message).slice(0, 200),
        };
        saveManifest(manifestPath, manifest);
        summary.failed++;
        break;
      }
    }
  }
  return { summary, plan: [] };
}
const round6 = (n) => Math.round(n * 1e6) / 1e6;

/** Re-verify every stored entry against storage; returns problems. */
export async function verify({ manifestPath, storage }) {
  const m = loadManifest(manifestPath);
  const bad = [];
  for (const [file, e] of Object.entries(m.entries)) {
    if (e.status !== 'stored') continue;
    const body = await storage.get(e.path);
    if (!body) bad.push(`${file}: missing`);
    else if (sha256(body) !== e.sha256) bad.push(`${file}: checksum mismatch`);
    else if (!isWebp(body)) bad.push(`${file}: not webp`);
  }
  return bad;
}
export { join };
