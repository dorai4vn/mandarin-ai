#!/usr/bin/env node
/**
 * Every `var(--name)` used in apps/web must be defined (tokens.css / globals.css / a component's
 * own style), or be set at runtime by a known source (next/font). A misspelt variable silently
 * falls back to nothing — e.g. a focus outline with no colour — which no type checker catches.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../apps/web/', import.meta.url).pathname;
/** Set outside CSS: next/font injects these on <html>. */
const RUNTIME = new Set(['font-inter', 'font-noto-sc']);

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(p);
  }
};
walk(join(ROOT, 'app'));
walk(join(ROOT, 'src'));

const defined = new Set(RUNTIME);
const used = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:^|[\s{;'"`])--([a-z][a-z0-9-]*)\s*:/g)) defined.add(m[1]);
  // Inline style objects: { '--sidebar-w': … }
  for (const m of src.matchAll(/['"]--([a-z][a-z0-9-]*)['"]\s*:/g)) defined.add(m[1]);
  for (const m of src.matchAll(/var\(--([a-z][a-z0-9-]*)/g)) {
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1]).add(f.replace(ROOT, 'apps/web/'));
  }
}
const missing = [...used].filter(([name]) => !defined.has(name));
if (missing.length > 0) {
  for (const [name, where] of missing)
    console.error(`undefined --${name} in ${[...where].join(', ')}`);
  console.error(`check-css-vars: ${missing.length} undefined CSS variable(s)`);
  process.exit(1);
}
console.log(`check-css-vars: OK (${used.size} variables used, all defined)`);
