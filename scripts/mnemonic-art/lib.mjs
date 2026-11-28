// Lightweight on-demand mnemonic artwork generator (M3.5). Personal-use-first: NOT a queue/worker/admin
// platform. Pure, injectable functions so every step is testable with mocks and no network.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

export const IMAGE_WIDTH = 1600;
export const IMAGE_HEIGHT = 1200;
export const MAX_RETRIES_CAP = 3;
/** Owner-approved pilot bounds (budget note 2026-11-27): max $1 incl. retries, max 10 images. Raise only by code change after owner approval. */
export const PILOT_MAX_USD = 1;
export const PILOT_MAX_IMAGES = 10;
// Production (240 new active images) mode: explicit owner budget per dispatch. This is a sanity ceiling on a typo, NOT a
// provider-enforced cap and NOT the approved budget (the owner's --max-spend-usd is). Provider-side limit still advised.
export const PRODUCTION_SANITY_MAX_USD = 6; // owner-approved cumulative ESTIMATED budget for this scope (2026-11-27)
export const PRODUCTION_MAX_BATCH = 200;
export const PRODUCTION_MIN_STORED = 10; // pilot images must already be stored (carried manifest) before bulk spend
/** Active = in the Level 1 syllabus set. Records without a `set` (synthetic test fixtures, old datasets) count as active. */
export const isActive = (c) => c.set === undefined || c.set === 'syllabus-l1';
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function loadDataset(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(data.characters) || !data.meta) throw new Error('dataset: bad shape');
  return data;
}

/**
 * Prompt versions. 'v1' is FROZEN: it is byte-for-byte the prompt used for the owner-accepted pilot images, so the
 * stored promptHash of those images stays valid (no accidental regeneration/spend). Any character without
 * artwork.promptVersion === 'v1' gets the v2 prompt, which appends the thumbnail-legibility guidance.
 */
export const THUMBNAIL_GUIDANCE =
  'Thumbnail legibility: the main subject must stay unmistakable when the image is shrunk to about 160 px wide: one dominant subject filling at least half of the frame height, a simple strong silhouette, high value contrast against a calmer, subordinate background, minimal clutter.';
export function buildPrompt(char, meta) {
  const lines = [
    meta.artworkStyle,
    `Scene: ${char.artwork.brief}`,
    'Absolutely no text, letters, Chinese characters, logos or watermarks anywhere in the image.',
    'Landscape 4:3 composition, subject clearly readable, safe margins.',
  ];
  if (char.artwork.promptVersion !== 'v1') lines.push(THUMBNAIL_GUIDANCE);
  return lines.join('\n');
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
  // --all = ACTIVE set only. Archive ('extension') records are reachable only by explicit --only/--ids (never production).
  if (all) return chars.filter(isActive);
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
const HEX64 = /^[0-9a-f]{64}$/;
const SUPERSEDED_PATH = /^mnemonic\/superseded\/[0-9a-f]{12}-[a-z0-9][a-z0-9.-]*\.webp$/;
const validPrice = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
/**
 * The historical run chain (dataset meta.retainedPilot.priorRuns, pinned from the real artifact) must be an unchanged
 * PREFIX of manifest.runs: same runId, commit, `only`, and spentUsdEstimatedAfter, in order; amounts monotonic and the
 * last prior amount is a floor for the current spend. Later production runs may append; they may not rewrite the prefix.
 */
function verifyRunChain(manifest, prior, bad) {
  if (!Array.isArray(prior) || !prior.length) {
    bad.push('dataset declares no priorRuns to verify the run history against');
    return;
  }
  const runs = Array.isArray(manifest.runs) ? manifest.runs : [];
  let last = 0;
  prior.forEach((p, i) => {
    const r = runs[i];
    if (!r) return void bad.push(`run history: missing prior run #${i + 1} (${p.runId})`);
    for (const k of ['runId', 'commit', 'only'])
      if (r[k] !== p[k]) bad.push(`run history #${i + 1}: ${k} altered/reordered (${p.runId})`);
    if (r.spentUsdEstimatedAfter !== p.spentUsdEstimatedAfter)
      bad.push(`run history #${i + 1}: spentUsdEstimatedAfter altered (${p.runId})`);
    if (!(p.spentUsdEstimatedAfter >= last)) bad.push(`run history #${i + 1}: not monotonic`);
    last = p.spentUsdEstimatedAfter;
  });
  if (typeof manifest.spentUsdEstimated === 'number' && manifest.spentUsdEstimated + 1e-9 < last)
    bad.push(
      `spentUsdEstimated ${manifest.spentUsdEstimated} is below final prior run amount ${last}`,
    );
  let prev = last;
  for (const r of runs.slice(prior.length)) {
    if (!(r.spentUsdEstimatedAfter >= prev))
      bad.push('run history: later run amounts not monotonic');
    prev = r.spentUsdEstimatedAfter;
  }
}
/**
 * Production fail-closed guard for datasets that declare `meta.retainedPilot` (files + priorRequestsAtLeast).
 * The carried manifest must contain ALL retained images (active AND archive) as stored, checksum-valid in storage,
 * with a promptHash equal to the dataset's current prompt (frozen v1 / revised v2 are therefore stable), no unresolved
 * 'requested'/'failed' entries, no orphan entries, and a spend ledger that is not lower than what the entries
 * themselves prove (price of every stored image + every archived revision in history). Throws on any problem.
 */
export async function verifyCarriedLedger({ manifest, data, storage }) {
  const rp = data.meta?.retainedPilot;
  if (!rp) return;
  const bad = [];
  const byFile = new Map(data.characters.map((c) => [c.artwork.file, c]));
  const spent = manifest.spentUsdEstimated;
  if (typeof spent !== 'number' || !Number.isFinite(spent) || spent <= 0)
    bad.push('spentUsdEstimated missing or not a positive number');
  let proven = 0;
  let requests = 0;
  for (const file of rp.files) {
    const e = manifest.entries[file];
    const c = byFile.get(file);
    if (!c) {
      bad.push(`${file}: not in dataset`);
      continue;
    }
    if (!e || e.status !== 'stored') {
      bad.push(`${file}: not stored in carried manifest`);
      continue;
    }
    if (e.hanzi !== c.hanzi) bad.push(`${file}: entry hanzi ${e.hanzi} != dataset ${c.hanzi}`);
    if (e.path !== `mnemonic/${file}`) bad.push(`${file}: entry path is not mnemonic/${file}`);
    if (!validPrice(e.priceUsdEstimated)) bad.push(`${file}: price missing/negative/not finite`);
    if (!HEX64.test(e.sha256 ?? '') || typeof e.path !== 'string')
      bad.push(`${file}: no checksum/path`);
    else {
      const body = await storage.get(e.path);
      if (!body || sha256(body) !== e.sha256)
        bad.push(`${file}: stored file missing or checksum mismatch`);
    }
    if (e.promptHash !== promptHash(buildPrompt(c, data.meta)))
      bad.push(`${file}: promptHash differs from dataset prompt (would force regeneration)`);
    proven += Number(e.priceUsdEstimated) || 0;
    requests += 1;
    for (const h of e.history ?? []) {
      proven += Number(h.priceUsdEstimated) || 0;
      requests += 1;
      // Every superseded revision must still exist byte-for-byte (approved/rejected candidates are never lost).
      if (!validPrice(h.priceUsdEstimated)) bad.push(`${file}: history price missing/negative`);
      if (typeof h.archivedAt !== 'string' || !SUPERSEDED_PATH.test(h.archivedAt))
        bad.push(`${file}: history archivedAt is not a safe mnemonic/superseded path`);
      else if (!HEX64.test(h.sha256 ?? '') || !h.archivedAt.includes(`/${h.sha256.slice(0, 12)}-`))
        bad.push(`${file}: history entry has no valid checksum`);
      else {
        const old = await storage.get(h.archivedAt);
        if (!old || sha256(old) !== h.sha256)
          bad.push(`${file}: superseded file ${h.archivedAt} missing or checksum mismatch`);
      }
    }
  }
  for (const [file, e] of Object.entries(manifest.entries)) {
    if (!byFile.has(file)) bad.push(`${file}: orphan manifest entry`);
    else if (e.status === 'requested' || e.status === 'failed')
      bad.push(`${file}: unresolved ${e.status} entry (needs owner review, never auto-retried)`);
  }
  if (requests < rp.priorRequestsAtLeast)
    bad.push(
      `ledger shows ${requests} prior requests, expected at least ${rp.priorRequestsAtLeast}`,
    );
  verifyRunChain(manifest, rp.priorRuns, bad);
  if (Number.isFinite(spent) && spent + 1e-9 < proven)
    bad.push(
      `spentUsdEstimated ${spent} is lower than ${proven} proven by stored entries (tampered ledger)`,
    );
  if (bad.length) throw new Error(`carried ledger rejected (fail closed): ${bad.join('; ')}`);
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

/** Real optimizer: sharp (pinned root devDependency, exact 0.35.5). */
export async function sharpOptimizer() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error('sharp not installed: run `pnpm install`');
  }
  return async (input) => {
    const { data, info } = await sharp(input)
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'cover' })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { body: data, width: info.width, height: info.height };
  };
}

/**
 * Request shape per the OpenAI "Create image" reference (checked 2026-11-27; documented contract only,
 * NOT verified live). Allowlist: gpt-image-2, gpt-image-2.5-{flare,sunburst}, gpt-image-2.6-{flare,sunburst}
 * (dated snapshots allowed). Retired/unsuitable models (gpt-image-1, gpt-image-1-mini, dall-e-*, chatgpt-image-latest,
 * anything unknown) are rejected. Size 1536x1024 is the documented GPT-image size (3:2, cover-cropped to 4:3);
 * custom sizes are NOT used because the page does not state that 2.6 models accept them. Quality is limited to
 * low|medium|high (xhigh/max exist only on 2.5+ and cost more; not allowed in the pilot). No `response_format`,
 * no `style`. The API returns b64_json for GPT image models.
 */
export const ALLOWED_MODEL = /^gpt-image-2(\.[56]-(flare|sunburst))?(-\d{4}-\d{2}-\d{2})?$/;
export const ALLOWED_QUALITY = ['low', 'medium', 'high'];
export function imageRequestBody(model, prompt, { quality = 'medium' } = {}) {
  if (!ALLOWED_MODEL.test(model))
    throw new Error(
      `model "${model}" not supported: allowlist is gpt-image-2, gpt-image-2.5-*, gpt-image-2.6-* (gpt-image-1 is retired; dall-e is not used)`,
    );
  if (!ALLOWED_QUALITY.includes(quality))
    throw new Error(`quality must be one of ${ALLOWED_QUALITY.join('|')}`);
  return { model, prompt, n: 1, size: '1536x1024', quality, output_format: 'png' };
}

/**
 * Conservative per-call cost CEILING for token-priced image models:
 *   bound = maxInputTokens * inputUsdPerM/1e6 + maxOutputTokens * outputUsdPerM/1e6
 * Rates and token ceilings are supplied by a human from the provider pricing page / image guide. This is a
 * ceiling derived from owner-supplied numbers, NOT a fixed unit price and NOT a provider-enforced hard cap.
 * If any figure is missing/non-positive the bound is undefined and live runs must stop.
 */
export function tokenCostBound({ inputUsdPerM, outputUsdPerM, maxInputTokens, maxOutputTokens }) {
  const v = [inputUsdPerM, outputUsdPerM, maxInputTokens, maxOutputTokens].map(Number);
  if (!v.every((n) => Number.isFinite(n) && n > 0))
    throw new Error(
      'cannot bound cost: need positive input/output USD per 1M tokens and token ceilings',
    );
  return round6((v[2] * v[0]) / 1e6 + (v[3] * v[1]) / 1e6);
}
/** Actual cost from response usage (text input + image output tokens), same rates. */
export function usageCost(usage, { inputUsdPerM, outputUsdPerM }) {
  if (!usage) return undefined;
  const i = Number(usage.input_tokens),
    o = Number(usage.output_tokens);
  if (!Number.isFinite(i) || !Number.isFinite(o)) return undefined;
  return round6((i * inputUsdPerM) / 1e6 + (o * outputUsdPerM) / 1e6);
}

const MAX_RESPONSE_BYTES = 40 * 1024 * 1024;

/** Provider wrapper (OpenAI-style Images API). Only constructed for --live; never logs the key. */
export function openaiProvider({
  apiKey,
  model,
  fetchImpl = fetch,
  timeoutMs = 120000,
  quality,
  baseUrl = 'https://api.openai.com',
}) {
  if (!apiKey) throw new Error('missing credential env var MNEMONIC_IMAGE_API_KEY');
  imageRequestBody(model, 'probe'); // fail fast on unsupported model
  return {
    name: 'openai-images',
    model,
    async generate(prompt) {
      const res = await fetchImpl(`${baseUrl}/v1/images/generations`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(imageRequestBody(model, prompt, { quality })),
      });
      if (!res.ok) {
        // Body deliberately not echoed (could contain prompt/request ids); status only.
        const e = new Error(`provider HTTP ${res.status}`);
        e.status = res.status;
        e.retryAfter = res.headers?.get?.('retry-after') ?? undefined;
        throw e;
      }
      const text = await res.text();
      if (text.length > MAX_RESPONSE_BYTES) throw new Error('provider: response too large');
      let j;
      try {
        j = JSON.parse(text);
      } catch {
        throw new Error('provider: response is not JSON');
      }
      if (j?.error) throw new Error('provider: error object in 2xx response');
      const b64 = j?.data?.[0]?.b64_json;
      if (typeof b64 !== 'string' || !b64) throw new Error('provider: no b64_json in response');
      const buf = Buffer.from(b64, 'base64');
      if (!buf.length) throw new Error('provider: empty image');
      this.lastUsage = j.usage && typeof j.usage === 'object' ? j.usage : undefined;
      return buf;
    },
  };
}

const SAFE_PATH = /^[a-zA-Z0-9/_.-]{1,512}$/;

/**
 * Opt-in Supabase Storage (private bucket) with the SAME REST contract as
 * packages/adapters/src/server/supabase-storage.ts (POST /storage/v1/object/{bucket}/{path}, apikey header,
 * Bearer only for legacy JWT keys, x-upsert false). Re-implemented here because that adapter is TypeScript and
 * this CLI is plain Node; keep in sync. Adds an authenticated GET for checksum readback. Transport is
 * injectable (tests use a mock); redirects rejected; bounded timeouts.
 */
export function supabaseStorage({ url, secretKey, bucket, fetchImpl = fetch, timeoutMs = 60000 }) {
  if (!url?.startsWith('https://') || !secretKey || !/^[a-z0-9_-]{1,63}$/.test(bucket ?? ''))
    throw new Error('supabase storage: need https url, secret key and bucket name');
  const base = url.replace(/\/$/, '');
  const headers = (extra = {}) => ({
    apikey: secretKey,
    ...(secretKey.startsWith('eyJ') ? { Authorization: `Bearer ${secretKey}` } : {}),
    ...extra,
  });
  const check = (path) => {
    if (!SAFE_PATH.test(path) || path.includes('..')) throw new Error('storage: invalid path');
  };
  return {
    mode: 'live',
    async put(path, body, contentType) {
      check(path);
      const res = await fetchImpl(`${base}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: headers({ 'Content-Type': contentType, 'x-upsert': 'false' }),
        body,
      });
      if (!res.ok)
        throw Object.assign(new Error(`storage put HTTP ${res.status}`), {
          status: 0,
          fatal: true,
        });
    },
    async get(path) {
      check(path);
      const res = await fetchImpl(`${base}/storage/v1/object/authenticated/${bucket}/${path}`, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: headers(),
      });
      if (res.status === 404 || res.status === 400) return null; // Storage reports missing objects as 400/404
      if (!res.ok)
        throw Object.assign(new Error(`storage get HTTP ${res.status}`), { fatal: true });
      return Buffer.from(await res.arrayBuffer());
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
  production = false,
  revise = false,
  maxImages = PILOT_MAX_IMAGES,
  rates,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = () => {},
}) {
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > MAX_RETRIES_CAP)
    throw new Error(`maxRetries must be 0..${MAX_RETRIES_CAP}`);
  if (revise && production)
    throw new Error('revise is not allowed in production mode: run QC revisions separately first');
  const manifest = loadManifest(manifestPath);
  if (production) {
    const archived = selection.filter((c) => !isActive(c));
    if (archived.length)
      throw new Error(
        `production: archive records are never generated (${archived.map((c) => c.hanzi).join('')})`,
      );
    await verifyCarriedLedger({ manifest, data, storage });
  }
  const plan = [];
  for (const c of selection) {
    const prompt = buildPrompt(c, data.meta);
    const ph = promptHash(prompt);
    const e = manifest.entries[c.artwork.file];
    let action = 'generate';
    if (e?.status === 'requested' && !force) action = 'blocked-unresolved-request';
    // Production: a failed entry may already have been billed; never silently pay again on rerun.
    else if (production && e?.status === 'failed' && !force) action = 'blocked-failed-needs-force';
    else if (e?.status === 'stored' && e.promptHash === ph && !force) {
      const body = await storage.get(e.path);
      action = body && sha256(body) === e.sha256 ? 'skip-verified' : 'repair-needs-force';
      if (action === 'repair-needs-force' && !force) action = 'blocked-file-mismatch';
    } else if (e?.status === 'stored' && e.promptHash !== ph && !revise && !force)
      // A changed prompt over an accepted image is a deliberate revision: never a silent paid overwrite.
      action = 'blocked-revision-needs-flag';
    plan.push({ char: c, prompt, ph, action, prev: e?.status === 'stored' ? e : undefined });
  }
  const allTodo = plan.filter((p) => p.action === 'generate');
  if (production) {
    if (!Number.isInteger(maxImages) || maxImages < 1 || maxImages > PRODUCTION_MAX_BATCH)
      throw new Error(`production: batch size must be 1..${PRODUCTION_MAX_BATCH}`);
    if (maxRetries !== 0)
      throw new Error('production: retries must be 0 (no automatic repeat spend)');
  }
  // Bounded batch: only the first maxImages missing items are generated; a rerun continues with the rest.
  const todo = production ? allTodo.slice(0, maxImages) : allTodo;
  const worst = todo.length * unitPriceUsd * (1 + maxRetries);
  const summary = {
    live,
    planned: plan.length,
    toGenerate: todo.length,
    deferred: allTodo.length - todo.length,
    actualUsdReported: 0,
    stoppedEarly: false,
    worstCaseUsd: worst,
    generated: 0,
    failed: 0,
    skipped: 0,
    blocked: 0,
    spentUsd: 0,
  };
  summary.skipped = plan.filter((p) => p.action === 'skip-verified').length;
  summary.blocked = plan.filter((p) => p.action.startsWith('blocked')).length;
  if (production && maxSpendUsd > 0) {
    // Budget input is validated on dry-run too, so the pre-secret preflight rejects what the live step would reject.
    if (maxSpendUsd > PRODUCTION_SANITY_MAX_USD)
      throw new Error(
        `production: --max-spend-usd above sanity ceiling ${PRODUCTION_SANITY_MAX_USD}`,
      );
    if (manifest.spentUsdEstimated > maxSpendUsd)
      throw new Error(
        `spend guard: ${manifest.spentUsdEstimated} already spent exceeds max ${maxSpendUsd}`,
      );
  }
  if (!live)
    return {
      summary,
      plan: plan.map((p) => ({ hanzi: p.char.hanzi, file: p.char.artwork.file, action: p.action })),
    };

  if (!(maxSpendUsd > 0)) throw new Error('live requires --max-spend-usd > 0');
  if (production) {
    if (maxSpendUsd > PRODUCTION_SANITY_MAX_USD)
      throw new Error(
        `production: --max-spend-usd above sanity ceiling ${PRODUCTION_SANITY_MAX_USD}`,
      );
    const stored = Object.values(manifest.entries).filter((x) => x.status === 'stored').length;
    if (stored < PRODUCTION_MIN_STORED)
      throw new Error(
        `production: carried manifest has ${stored} stored images, need >= ${PRODUCTION_MIN_STORED} (pilot incomplete or wrong manifest)`,
      );
  } else {
    if (maxSpendUsd > PILOT_MAX_USD)
      throw new Error(`pilot cap: --max-spend-usd may not exceed ${PILOT_MAX_USD}`);
    if (todo.length > PILOT_MAX_IMAGES)
      throw new Error(`pilot cap: at most ${PILOT_MAX_IMAGES} images per live run`);
  }
  if (!(unitPriceUsd > 0)) throw new Error('live requires a verified unit price');
  if (manifest.spentUsdEstimated + todo.length * unitPriceUsd > maxSpendUsd)
    throw new Error(
      `spend guard: ${manifest.spentUsdEstimated} spent + ${todo.length}x${unitPriceUsd} exceeds max ${maxSpendUsd}`,
    );

  for (const p of todo) {
    const file = p.char.artwork.file;
    const path = `mnemonic/${file}`;
    let attempt = 0;
    // Revision of an accepted image: keep the previous bytes + metadata (never lose an approved/rejected candidate).
    let history = manifest.entries[file]?.history ?? [];
    if (p.prev) {
      const old = await storage.get(p.prev.path);
      if (!old || sha256(old) !== p.prev.sha256)
        throw new Error(
          `revision of ${file}: previous stored file missing or checksum mismatch; refusing`,
        );
      const archive = `mnemonic/superseded/${p.prev.sha256.slice(0, 12)}-${file}`;
      await storage.put(archive, old, 'image/webp');
      history = [
        ...history,
        {
          archivedAt: archive,
          sha256: p.prev.sha256,
          promptHash: p.prev.promptHash,
          storedAt: p.prev.storedAt,
          priceUsdEstimated: p.prev.priceUsdEstimated,
          usageCostUsd: p.prev.usageCostUsd,
        },
      ];
    }
    for (;;) {
      if (manifest.spentUsdEstimated + unitPriceUsd > maxSpendUsd) {
        log(`spend cap reached before ${file}`);
        saveManifest(manifestPath, manifest);
        summary.stoppedEarly = true;
        return { summary, plan: [] };
      }
      manifest.spentUsdEstimated = round6(manifest.spentUsdEstimated + unitPriceUsd);
      summary.spentUsd = round6(summary.spentUsd + unitPriceUsd);
      manifest.entries[file] = {
        status: 'requested',
        ...(history.length ? { history } : {}),
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
          usage: provider.lastUsage
            ? {
                input_tokens: provider.lastUsage.input_tokens,
                output_tokens: provider.lastUsage.output_tokens,
              }
            : undefined,
        };
        const actual = rates ? usageCost(provider.lastUsage, rates) : undefined;
        if (actual !== undefined) {
          manifest.entries[file].usageCostUsd = actual;
          manifest.spentUsdActualReported = round6((manifest.spentUsdActualReported ?? 0) + actual);
          summary.actualUsdReported = round6(summary.actualUsdReported + actual);
        }
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
    if (production && summary.failed > 0) {
      // Stop on the first error: no further paid calls this run (artifact still uploaded by the workflow).
      summary.stoppedEarly = true;
      break;
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
