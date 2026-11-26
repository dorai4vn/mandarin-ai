// Deterministic, incremental Commons import pipeline. Pure of network: takes a client.
import { createHash } from 'node:crypto';
import { checkLicenceUrl, classifyLicence } from './licence.mjs';
import { isCommonsFileUrl, isCommonsPageUrl, normalizeSha1, verifySha1 } from './provenance.mjs';
import { BudgetExceeded, RateLimited } from './client.mjs';
import { sanitizeSvg, SvgRejected } from './sanitize.mjs';
import { stripInertMetadata } from './xmlclean.mjs';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const strip = (h) =>
  String(h ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const meta = (em, k) => strip(em?.[k]?.value);

/** Build one manifest entry from a Commons page object, or a rejection record. */
export function evaluateFile(page, { downloaded = null } = {}) {
  const ii = page.imageinfo?.[0];
  const title = page.title;
  const reject = (reason) => ({ status: 'rejected', title, reason });
  if (!ii) return reject('no-imageinfo');
  if (ii.mime !== 'image/svg+xml') return reject(`mime-not-svg:${ii.mime}`);
  const lic = classifyLicence(meta(ii.extmetadata, 'LicenseShortName'));
  if (!lic.ok) return reject(lic.reason);
  const licUrl = checkLicenceUrl(lic, meta(ii.extmetadata, 'LicenseUrl'));
  if (!licUrl.ok) return reject('licence-url-not-canonical');
  const author = meta(ii.extmetadata, 'Artist');
  if (lic.attribution && !author) return reject('attribution-required-but-author-missing');
  const sha1 = normalizeSha1(ii.sha1);
  if (!sha1) return reject('sha1-invalid');
  const rev = page.revisions?.[0];
  if (!Number.isInteger(rev?.revid) || !rev?.timestamp) return reject('revision-missing');
  if (!isCommonsPageUrl(ii.descriptionurl)) return reject('source-url-invalid');
  if (!isCommonsFileUrl(ii.url)) return reject('file-url-invalid');
  const entry = {
    status: 'eligible',
    title,
    pageId: page.pageid,
    revisionId: rev.revid,
    revisionTimestamp: rev.timestamp,
    sourceUrl: ii.descriptionurl,
    fileUrl: ii.url,
    upstreamSha1: sha1, // normalised to hex
    author: author || null,
    credit: meta(ii.extmetadata, 'Credit') || null,
    licence: {
      id: lic.id,
      version: lic.version,
      name: lic.rawName,
      url: licUrl.url,
      attributionRequired: lic.attribution,
      shareAlike: lic.shareAlike,
    },
    // Stage/character are NOT inferred from file names here; they require human/curated mapping.
    stage: null,
    character: null,
    review: 'pending-review', // never auto-approved as historical evidence
  };
  if (downloaded !== null) {
    if (!verifySha1(Buffer.from(downloaded, 'utf8'), sha1)) return reject('sha1-mismatch');
    try {
      // 1) strict XML parse + removal of recognised inert editor metadata, 2) strict sanitizer.
      const { svg: pre, stripped } = stripInertMetadata(downloaded);
      const clean = sanitizeSvg(pre);
      entry.sanitizedSha256 = sha256(clean);
      entry.svg = clean;
      entry.metadataStripped = stripped;
    } catch (e) {
      if (e instanceof SvgRejected) return reject(`svg-unsafe:${e.reason}`);
      throw e;
    }
  }
  return entry;
}

/** Everything the stage/character mapping and licence compliance rest on. */
export const evidenceKey = (e) =>
  JSON.stringify([
    e.upstreamSha1,
    e.revisionId,
    e.fileUrl,
    e.sourceUrl,
    e.author,
    e.licence?.id,
    e.licence?.version,
    e.licence?.name,
    e.licence?.url,
  ]);

/**
 * prior: previous manifest ({entries}) or null. Incremental: a file is re-downloaded only
 * if absent from prior or its upstream sha1/revision changed. dryRun => no downloads, no svg output.
 */
export async function runImport({
  client,
  categories = [],
  titles = null, // exact File: titles (pilot); pages that do not exist are counted, not imported
  prior = null,
  dryRun = false,
  pageLimit = 5,
  readLocal = null, // async (entry) => sanitized svg text | null; required for reuse
  maxDownloads = Infinity, // bounded pilot: further files stay `downloadStatus: pending`
  onCheckpoint = null, // async (manifest) => void; called after every verified download
  now = () => Date.now(),
}) {
  // A persisted cool-down (429/503 Retry-After from an earlier run) is honoured across runs:
  // no network request at all until retryAt has passed. Unparseable/absent retryAt cannot be honoured.
  const priorRetryAt = prior?.halted?.retryAt ? Date.parse(prior.halted.retryAt) : NaN;
  if (!dryRun && Number.isFinite(priorRetryAt) && now() < priorRetryAt) {
    const blocked = { reason: 'cooldown-active', retryAt: prior.halted.retryAt, originalReason: prior.halted.reason };
    return {
      // keep the ORIGINAL halted record (with its retryAt) so the cool-down persists, not a new one
      manifest: { ...prior, halted: prior.halted },
      report: { dryRun, blocked, networkRequests: 0, persisted: prior.entries?.length ?? 0, note: 'cool-down from prior run still active; no requests made' },
    };
  }
  const priorByTitle = new Map((prior?.entries ?? []).map((e) => [e.title, e]));
  const seen = new Map();
  const rejected = [];
  const stats = { listed: 0, duplicates: 0, reused: 0, downloaded: 0, mappingsDropped: 0 };
  const truncated = [];
  const missing = [];
  let halt = null; // { reason, retryAfterSeconds?, retryAt? }
  const haltFrom = (e) => {
    if (e instanceof RateLimited)
      return { reason: 'http-429', retryAfterSeconds: e.retryAfterSeconds, retryAt: e.retryAt };
    if (e instanceof BudgetExceeded) return { reason: 'request-budget' };
    throw e;
  };
  try {
  for (const cat of [...categories].sort()) {
    const { files, complete } = await client.listCategory(cat, { pageLimit });
    if (!complete) truncated.push(cat);
    for (const page of files) {
      stats.listed++;
      if (seen.has(page.title)) {
        stats.duplicates++;
        continue;
      }
      seen.set(page.title, page);
    }
  }
  if (titles?.length) {
    const { files } = await client.listTitles(titles);
    for (const page of files) {
      if (page.missing || !page.imageinfo) {
        missing.push(page.title);
        continue;
      }
      stats.listed++;
      if (!seen.has(page.title)) seen.set(page.title, page);
    }
    missing.sort();
  }
  } catch (e) {
    halt = haltFrom(e);
    // Listing incomplete: do not rebuild the manifest from partial data; keep prior untouched.
    const kept = prior ?? { schema: 'commons-import-manifest/1', categories: [], entries: [], rejected: [], missingTitles: [] };
    return {
      manifest: { ...kept, complete: false, halted: halt },
      report: { dryRun, ...stats, halted: halt, persisted: kept.entries.length, note: 'listing halted; prior manifest preserved' },
    };
  }
  const buildManifest = (es) => ({
    schema: 'commons-import-manifest/1',
    categories: [...categories].sort(),
    complete: truncated.length === 0,
    truncatedCategories: truncated,
    partial: es.some((e) => e.downloadStatus === 'pending') || halt !== null,
    halted: halt,
    entries: es,
    rejected,
    missingTitles: missing,
  });
  const entries = [];
  // Pre-pass: metadata-level evaluation of EVERY listed title so a checkpoint can list all of them.
  const order = [...seen.keys()].sort();
  const bases = new Map();
  for (const title of order) {
    const base = evaluateFile(seen.get(title));
    if (base.status === 'rejected') rejected.push({ title, reason: base.reason });
    else bases.set(title, base);
  }
  const todo = order.filter((t) => bases.has(t));
  let idx = 0; // todo[idx..] are unprocessed => explicitly `downloadStatus: pending` in any checkpoint
  const pendingTail = () =>
    todo.slice(idx).map((t) => ({ ...bases.get(t), downloadStatus: 'pending' }));
  for (; idx < todo.length; idx++) {
    const title = todo[idx];
    const page = seen.get(title);
    const base = bases.get(title);
    const old = priorByTitle.get(title);
    const unchanged = old && evidenceKey(old) === evidenceKey(base);
    if (unchanged && old.sanitizedSha256 && old.file && readLocal) {
      // Reuse only if the local file still exists, matches its recorded checksum and is still safe.
      let local = null;
      try {
        local = await readLocal(old);
        if (
          typeof local !== 'string' ||
          sha256(local) !== old.sanitizedSha256 ||
          sanitizeSvg(local) !== local
        )
          local = null;
      } catch {
        local = null;
      }
      if (local !== null) {
        entries.push({
          ...base,
          sanitizedSha256: old.sanitizedSha256,
          file: old.file,
          stage: old.stage,
          review: old.review ?? 'pending-review',
          character: old.character,
        });
        stats.reused++;
        continue;
      }
    }
    if (dryRun) {
      entries.push(base);
      continue;
    }
    const keepPending = () => entries.push({ ...base, downloadStatus: 'pending' });
    if (halt || stats.downloaded >= maxDownloads) {
      if (!halt) halt = { reason: 'max-downloads' };
      keepPending();
      continue;
    }
    let raw;
    try {
      raw = await client.downloadSvg(base.fileUrl, { sha1: base.upstreamSha1 });
    } catch (e) {
      halt = haltFrom(e);
      keepPending();
      continue;
    }
    stats.downloaded++;
    const full = evaluateFile(page, { downloaded: raw });
    if (full.status === 'rejected') {
      rejected.push({ title, reason: full.reason });
      if (onCheckpoint) {
        idx++;
        await onCheckpoint(buildManifest(entries.concat(pendingTail())));
        idx--;
      }
      continue;
    }
    if (unchanged) {
      full.stage = old.stage;
      full.review = old.review ?? 'pending-review';
      full.character = old.character;
    } else if (old && (old.stage != null || old.character != null)) {
      stats.mappingsDropped++; // evidence changed: curated mapping must be re-reviewed
    }
    entries.push(full);
    if (onCheckpoint) {
      idx++; // this title is now processed; everything after it is explicitly pending
      await onCheckpoint(buildManifest(entries.concat(pendingTail())));
      idx--;
    }
  }
  // Dedupe identical sanitized content (different titles, same bytes): keep first by title.
  const byHash = new Map();
  const finalEntries = [];
  for (const e of entries) {
    if (e.sanitizedSha256 && byHash.has(e.sanitizedSha256)) {
      rejected.push({
        title: e.title,
        reason: `duplicate-content-of:${byHash.get(e.sanitizedSha256)}`,
      });
      continue;
    }
    if (e.sanitizedSha256) byHash.set(e.sanitizedSha256, e.title);
    finalEntries.push(e);
  }
  rejected.sort((a, b) => (a.title < b.title ? -1 : 1));
  const manifest = buildManifest(finalEntries);
  manifest.rejected = rejected;
  // Source coverage vs eligible coverage; deliberately NO per-character coverage claim.
  const report = {
    dryRun,
    ...stats,
    eligible: finalEntries.length,
    persistedVerified: finalEntries.filter((e) => e.sanitizedSha256).length,
    pendingDownload: finalEntries.filter((e) => e.downloadStatus === 'pending').length,
    halted: halt,
    rejected: rejected.length,
    missing: missing.length,
    titlesRequested: titles?.length ? new Set(titles).size : 0,
    complete: manifest.complete,
    characterCoverage: 'unverified: stage/character mapping not performed by importer',
  };
  return { manifest, report };
}

export const serialize = (manifest) => JSON.stringify(manifest, null, 2) + '\n';
