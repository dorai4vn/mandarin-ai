#!/usr/bin/env node
/**
 * D-040 — PDF upload limit against the REAL local Supabase Storage (storage-api + Kong) started by
 * `supabase start`, using supabase/config.toml (storage.file_size_limit = "50MiB"). Uses the exact
 * adapter the Railway API uses (`SupabaseObjectStorage`, standard single-request upload with the
 * secret key, server side) — no mock. Requires `pnpm --filter @mandarin/adapters... build`.
 *
 * Proves:
 *   1. 20 MiB, 49 MiB and exactly 50 MiB (52 428 800 bytes) PDFs are stored, with the exact size.
 *   2. With the recommended bucket settings (file_size_limit = 52 428 800, MIME application/pdf),
 *      Storage itself refuses 50 MiB + 1 byte and non-PDF content types — a second gate behind the
 *      API (which is the primary gate). The project-wide limit alone is reported, not relied on:
 *      CI run 45425461714 showed the local project-wide "50MiB" did NOT reject 50 MiB + 1.
 *   3. The bucket is private: no public read, no upload with the publishable key, none without a key.
 *
 * Keys come from `supabase status` (local demo keys) and are never printed.
 */
import { execFileSync } from 'node:child_process';
import { SupabaseObjectStorage } from '../packages/adapters/dist/server/supabase-storage.js';
import { PDF_UPLOAD_LIMITS } from '../packages/contracts/dist/upload.js';

const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const status = JSON.parse(raw.slice(raw.indexOf('{')));
const api = status.API_URL;
const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
const publishable = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (!api || !secret || !publishable) throw new Error('supabase status: missing URL or keys');

const BUCKET = 'documents';
const MiB = 1024 * 1024;
const results = [];
let failed = false;
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed = true;
};
const adminHeaders = (extra = {}) => ({
  apikey: secret,
  ...(secret.startsWith('eyJ') ? { authorization: `Bearer ${secret}` } : {}),
  ...extra,
});
const pdfOf = (size) => {
  const b = Buffer.alloc(size);
  b.write('%PDF-1.7\n', 0, 'latin1');
  return b;
};

// Recommended bucket settings (docs/PDF_UPLOAD.md, DEPLOY_PREVIEW step 6): private, 50 MiB, PDF only.
const bucketSettings = {
  public: false,
  file_size_limit: PDF_UPLOAD_LIMITS.maxBytes,
  allowed_mime_types: ['application/pdf'],
};
const created = await fetch(`${api}/storage/v1/bucket`, {
  method: 'POST',
  headers: adminHeaders({ 'content-type': 'application/json' }),
  body: JSON.stringify({ id: BUCKET, name: BUCKET, ...bucketSettings }),
});
if (!created.ok) {
  await fetch(`${api}/storage/v1/bucket/${BUCKET}`, {
    method: 'PUT',
    headers: adminHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(bucketSettings),
  });
}
const bucket = await fetch(`${api}/storage/v1/bucket/${BUCKET}`, { headers: adminHeaders() });
const info = bucket.ok ? await bucket.json() : {};
check(
  'bucket "documents": private, 52 428 800-byte limit, PDF only',
  info.public === false &&
    Number(info.file_size_limit) === PDF_UPLOAD_LIMITS.maxBytes &&
    JSON.stringify(info.allowed_mime_types) === '["application/pdf"]',
  `HTTP ${bucket.status}`,
);

check(
  'app limit is 50 MiB = 52 428 800 bytes',
  PDF_UPLOAD_LIMITS.maxBytes === 50 * MiB,
  String(PDF_UPLOAD_LIMITS.maxBytes),
);

const storage = new SupabaseObjectStorage({ url: api, secretKey: secret, bucket: BUCKET });
const run = Date.now().toString(36);
const stored = [];
for (const [label, size] of [
  ['20 MiB', 20 * MiB],
  ['49 MiB', 49 * MiB],
  ['exactly 50 MiB', 50 * MiB],
]) {
  const path = `ci-${run}/imports/${size}.pdf`;
  const started = Date.now();
  try {
    await storage.put(path, pdfOf(size), 'application/pdf');
    stored.push(path);
    check(`stores a ${label} PDF (standard upload)`, true, `${Date.now() - started} ms`);
  } catch (e) {
    check(`stores a ${label} PDF (standard upload)`, false, `${e.code ?? ''} ${e.status ?? ''}`);
  }
}

try {
  await storage.put(`ci-${run}/imports/too-big.pdf`, pdfOf(50 * MiB + 1), 'application/pdf');
  check('bucket limit refuses 50 MiB + 1 byte', false, 'was accepted');
} catch (e) {
  // The adapter normalises Storage's "payload too large" answer to status 413 (→ API 413).
  check(
    'bucket limit refuses 50 MiB + 1 byte (adapter reports 413)',
    e.status === 413,
    `status ${e.status}`,
  );
}

try {
  await storage.put(`ci-${run}/imports/not-pdf.txt`, Buffer.from('hello'), 'text/plain');
  check('bucket refuses non-PDF content types', false, 'was accepted');
} catch (e) {
  check('bucket refuses non-PDF content types', true, `status ${e.status}`);
}

const list = await fetch(`${api}/storage/v1/object/list/${BUCKET}`, {
  method: 'POST',
  headers: adminHeaders({ 'content-type': 'application/json' }),
  body: JSON.stringify({ prefix: `ci-${run}/imports`, limit: 100 }),
});
const listed = list.ok ? await list.json() : [];
const sizes = Object.fromEntries(listed.map((o) => [o.name, o.metadata?.size]));
check(
  'stored objects have the exact byte sizes',
  sizes[`${50 * MiB}.pdf`] === 50 * MiB &&
    sizes[`${49 * MiB}.pdf`] === 49 * MiB &&
    sizes[`${20 * MiB}.pdf`] === 20 * MiB &&
    !('too-big.pdf' in sizes) &&
    !('not-pdf.txt' in sizes),
  JSON.stringify(sizes),
);

const target = stored[0] ?? `ci-${run}/imports/none.pdf`;
const publicRead = await fetch(`${api}/storage/v1/object/public/${BUCKET}/${target}`);
check('no public read of a stored PDF', !publicRead.ok, `HTTP ${publicRead.status}`);

const anonUpload = await fetch(`${api}/storage/v1/object/${BUCKET}/ci-${run}/anon.pdf`, {
  method: 'POST',
  headers: { apikey: publishable, 'content-type': 'application/pdf' },
  body: pdfOf(1024),
});
check('publishable key cannot upload', !anonUpload.ok, `HTTP ${anonUpload.status}`);

const noKey = await fetch(`${api}/storage/v1/object/${BUCKET}/ci-${run}/nokey.pdf`, {
  method: 'POST',
  headers: { 'content-type': 'application/pdf' },
  body: pdfOf(1024),
});
check('upload without any key is refused', !noKey.ok, `HTTP ${noKey.status}`);

await fetch(`${api}/storage/v1/object/${BUCKET}`, {
  method: 'DELETE',
  headers: adminHeaders({ 'content-type': 'application/json' }),
  body: JSON.stringify({ prefixes: stored }),
}).catch(() => undefined);

console.log('Storage PDF limit check (real local Supabase Storage, D-040):');
for (const line of results) console.log(`  ${line}`);
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log(`All ${results.length} checks passed.`);
