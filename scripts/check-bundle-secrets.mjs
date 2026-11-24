#!/usr/bin/env node
/**
 * Browser-bundle secret scan. Run after `next build` with BAIT values in the server-only secret
 * variables (see the CI step): no bait — and nothing that looks like a real server key — may
 * appear anywhere in the Next.js output. `.next/cache` is ignored (build cache, never served).
 * Usage: node scripts/check-bundle-secrets.mjs apps/web/.next
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'apps/web/.next';
const PATTERNS = [
  [/BAIT_SECRET_[A-Z0-9_]+/, 'bait server secret'],
  [/sb_secret_[A-Za-z0-9_-]{16,}/, 'Supabase secret key'],
  [/(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9]{32,}/, 'OpenAI API key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
];

const hits = [];
let scanned = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    // Build cache and server file-trace manifests (lists of file paths) are never served.
    if (name === 'cache' || name.endsWith('.nft.json')) continue;
    const st = statSync(path);
    if (st.isDirectory()) walk(path);
    else if (/\.(js|mjs|cjs|json|html|txt|rsc|css|map)$/.test(name)) {
      scanned += 1;
      const text = readFileSync(path, 'utf8');
      for (const [re, label] of PATTERNS) if (re.test(text)) hits.push(`${path}: ${label}`);
    }
  }
};
walk(root);
if (scanned === 0) {
  console.error(`check-bundle-secrets: nothing scanned under ${root} — build first`);
  process.exit(1);
}
if (hits.length > 0) {
  console.error(`check-bundle-secrets: FOUND\n - ${hits.join('\n - ')}`);
  process.exit(1);
}
console.log(`check-bundle-secrets: OK (${scanned} files under ${root}, no server secret)`);
