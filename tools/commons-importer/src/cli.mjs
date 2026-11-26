#!/usr/bin/env node
// Usage: node src/cli.mjs --category "Category:X" [--out dir] [--dry-run] [--offline] [--max-requests 50] [--ua "name (contact-url)"]
// Default is dry-run-safe: writes nothing unless --out is given. Not run in CI.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createClient } from './client.mjs';
import { runImport } from './importer.mjs';
import { persistManifest } from './persist.mjs';
import { candidateTitles, coverageReport, PILOT_CHARACTERS } from './mapping.mjs';

const { values } = parseArgs({
  options: {
    category: { type: 'string', multiple: true },
    pilot: { type: 'boolean' }, // look up documented-convention titles for the 10 pilot characters
    curations: { type: 'string' }, // JSON [{title, reviewer}] human-approved mappings
    out: { type: 'string' },
    'dry-run': { type: 'boolean' },
    offline: { type: 'boolean' },
    'max-requests': { type: 'string', default: '50' },
    ua: { type: 'string' },
    'max-downloads': { type: 'string', default: '10' },
    'min-interval-ms': { type: 'string', default: '2000' },
    cache: { type: 'string', default: '.cache/commons' },
  },
});
if ((!values.category?.length && !values.pilot) || !values.ua) {
  console.error(
    'required: (--category <Category:..> | --pilot) --ua "<client name (contact URL)>"',
  );
  process.exit(2);
}
const manifestPath = values.out ? path.join(values.out, 'manifest.json') : null;
let prior = null;
if (manifestPath) {
  try {
    prior = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    /* first run */
  }
}
const client = createClient({
  userAgent: values.ua,
  maxRequests: Number(values['max-requests']),
  cacheDir: values.cache,
  offline: values.offline,
  minIntervalMs: Math.max(2000, Number(values['min-interval-ms'])),
});
const { manifest, report } = await runImport({
  client,
  categories: values.category ?? [],
  titles: values.pilot ? candidateTitles() : null,
  prior,
  readLocal: async (e) => {
    if (!values.out || !/^svg\/[0-9a-f]{16}\.svg$/.test(e.file)) return null; // confine to out/svg
    return readFile(path.join(values.out, e.file), 'utf8');
  },
  dryRun: !!values['dry-run'],
  maxDownloads: Number(values['max-downloads']),
  onCheckpoint: manifestPath && !values['dry-run'] ? (m) => persistManifest(values.out, m) : null,
});
if (manifestPath && !values['dry-run']) await persistManifest(values.out, manifest);
if (values.pilot) {
  const curations = values.curations ? JSON.parse(await readFile(values.curations, 'utf8')) : [];
  const existing = [
    ...manifest.entries.map((e) => e.title),
    ...manifest.rejected.map((r) => r.title),
  ];
  report.coverage = coverageReport({
    chars: PILOT_CHARACTERS,
    existing,
    eligible: manifest.entries,
    curations,
    rejected: manifest.rejected,
  });
}
console.log(JSON.stringify(report, null, 2));
