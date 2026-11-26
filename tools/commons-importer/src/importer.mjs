// Deterministic, incremental Commons import pipeline. Pure of network: takes a client.
import { createHash } from 'node:crypto';
import { classifyLicence } from './licence.mjs';
import { sanitizeSvg, SvgRejected } from './sanitize.mjs';

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
  const author = meta(ii.extmetadata, 'Artist');
  if (lic.attribution && !author) return reject('attribution-required-but-author-missing');
  if (!ii.sha1 || !ii.url) return reject('missing-provenance');
  const entry = {
    status: 'eligible',
    title,
    pageId: page.pageid,
    revisionId: page.revisions?.[0]?.revid ?? null,
    revisionTimestamp: page.revisions?.[0]?.timestamp ?? null,
    sourceUrl: ii.descriptionurl ?? null,
    fileUrl: ii.url,
    upstreamSha1: ii.sha1,
    author: author || null,
    credit: meta(ii.extmetadata, 'Credit') || null,
    licence: {
      id: lic.id,
      version: lic.version,
      name: lic.rawName,
      url: meta(ii.extmetadata, 'LicenseUrl') || null,
      attributionRequired: lic.attribution,
      shareAlike: lic.shareAlike,
    },
    // Stage/character are NOT inferred from file names here; they require human/curated mapping.
    stage: null,
    character: null,
  };
  if (downloaded !== null) {
    try {
      const clean = sanitizeSvg(downloaded);
      entry.sanitizedSha256 = sha256(clean);
      entry.svg = clean;
    } catch (e) {
      if (e instanceof SvgRejected) return reject(`svg-unsafe:${e.reason}`);
      throw e;
    }
  }
  return entry;
}

/**
 * prior: previous manifest ({entries}) or null. Incremental: a file is re-downloaded only
 * if absent from prior or its upstream sha1/revision changed. dryRun => no downloads, no svg output.
 */
export async function runImport({
  client,
  categories,
  prior = null,
  dryRun = false,
  pageLimit = 5,
}) {
  const priorByTitle = new Map((prior?.entries ?? []).map((e) => [e.title, e]));
  const seen = new Map();
  const rejected = [];
  const stats = { listed: 0, duplicates: 0, reused: 0, downloaded: 0 };
  const truncated = [];
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
  const entries = [];
  for (const title of [...seen.keys()].sort()) {
    const page = seen.get(title);
    const base = evaluateFile(page);
    if (base.status === 'rejected') {
      rejected.push({ title, reason: base.reason });
      continue;
    }
    const old = priorByTitle.get(title);
    if (
      old &&
      old.upstreamSha1 === base.upstreamSha1 &&
      old.revisionId === base.revisionId &&
      old.sanitizedSha256 &&
      old.file
    ) {
      entries.push({
        ...base,
        sanitizedSha256: old.sanitizedSha256,
        file: old.file,
        stage: old.stage,
        character: old.character,
      });
      stats.reused++;
      continue;
    }
    if (dryRun) {
      entries.push(base);
      continue;
    }
    const raw = await client.downloadSvg(base.fileUrl);
    stats.downloaded++;
    const full = evaluateFile(page, { downloaded: raw });
    if (full.status === 'rejected') {
      rejected.push({ title, reason: full.reason });
      continue;
    }
    if (old) {
      full.stage = old.stage;
      full.character = old.character;
    }
    entries.push(full);
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
  const manifest = {
    schema: 'commons-import-manifest/1',
    categories: [...categories].sort(),
    complete: truncated.length === 0,
    truncatedCategories: truncated,
    entries: finalEntries,
    rejected,
  };
  // Source coverage vs eligible coverage; deliberately NO per-character coverage claim.
  const report = {
    dryRun,
    ...stats,
    eligible: finalEntries.length,
    rejected: rejected.length,
    complete: manifest.complete,
    characterCoverage: 'unverified: stage/character mapping not performed by importer',
  };
  return { manifest, report };
}

export const serialize = (manifest) => JSON.stringify(manifest, null, 2) + '\n';
