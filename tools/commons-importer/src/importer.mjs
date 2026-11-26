// Deterministic, incremental Commons import pipeline. Pure of network: takes a client.
import { createHash } from 'node:crypto';
import { checkLicenceUrl, classifyLicence } from './licence.mjs';
import { isCommonsFileUrl, isCommonsPageUrl, normalizeSha1, verifySha1 } from './provenance.mjs';
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
  };
  if (downloaded !== null) {
    if (!verifySha1(Buffer.from(downloaded, 'utf8'), sha1)) return reject('sha1-mismatch');
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
}) {
  const priorByTitle = new Map((prior?.entries ?? []).map((e) => [e.title, e]));
  const seen = new Map();
  const rejected = [];
  const stats = { listed: 0, duplicates: 0, reused: 0, downloaded: 0, mappingsDropped: 0 };
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
  const missing = [];
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
  const entries = [];
  for (const title of [...seen.keys()].sort()) {
    const page = seen.get(title);
    const base = evaluateFile(page);
    if (base.status === 'rejected') {
      rejected.push({ title, reason: base.reason });
      continue;
    }
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
    const raw = await client.downloadSvg(base.fileUrl, { sha1: base.upstreamSha1 });
    stats.downloaded++;
    const full = evaluateFile(page, { downloaded: raw });
    if (full.status === 'rejected') {
      rejected.push({ title, reason: full.reason });
      continue;
    }
    if (unchanged) {
      full.stage = old.stage;
      full.character = old.character;
    } else if (old && (old.stage != null || old.character != null)) {
      stats.mappingsDropped++; // evidence changed: curated mapping must be re-reviewed
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
    missingTitles: missing,
  };
  // Source coverage vs eligible coverage; deliberately NO per-character coverage claim.
  const report = {
    dryRun,
    ...stats,
    eligible: finalEntries.length,
    rejected: rejected.length,
    missing: missing.length,
    complete: manifest.complete,
    characterCoverage: 'unverified: stage/character mapping not performed by importer',
  };
  return { manifest, report };
}

export const serialize = (manifest) => JSON.stringify(manifest, null, 2) + '\n';
