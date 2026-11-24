#!/usr/bin/env node
/**
 * WCAG 2.2 contrast gate for the Design System V2 LIGHT tokens (D-039, TOKENS_V2 §3).
 * Reads the real values from apps/web/src/design/tokens.css, so a token change that drops a pair
 * below AA fails CI. Pairs = every foreground/background combination the UI actually uses.
 *   4.5 : normal text   ·   3 : large text, UI components, focus indicator (WCAG 1.4.3 / 1.4.11)
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../apps/web/src/design/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]),
);

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = 4.5;
const UI = 3;
/** [foreground token, background token, minimum, where it is used] */
const PAIRS = [
  ['fg-default', 'bg-page', TEXT, 'body text'],
  ['fg-default', 'surface-default', TEXT, 'text in cards, sidebar'],
  ['fg-default', 'bg-subtle', TEXT, 'text on subtle panels / hover'],
  ['fg-default', 'surface-sunken', TEXT, 'Mono blocks, canvas frame'],
  ['fg-default', 'warning-subtle', TEXT, 'compatibility notice'],
  ['fg-muted', 'bg-page', TEXT, 'leads, descriptions'],
  ['fg-muted', 'surface-default', TEXT, 'secondary text in cards, inactive bottom nav'],
  ['fg-muted', 'bg-subtle', TEXT, 'secondary text on subtle'],
  ['fg-subtle', 'bg-page', TEXT, 'captions'],
  ['fg-subtle', 'surface-default', TEXT, 'captions in cards'],
  ['fg-link', 'bg-page', TEXT, 'links'],
  ['fg-link', 'surface-default', TEXT, 'links in cards'],
  ['primary-on', 'primary-solid', TEXT, 'primary button label'],
  ['primary-on', 'primary-hover', TEXT, 'primary button hover'],
  ['primary-on', 'primary-active', TEXT, 'primary button pressed'],
  ['primary-text', 'surface-default', TEXT, 'active bottom-nav label, LIVE text'],
  ['primary-text', 'bg-page', TEXT, 'primary text on page'],
  ['primary-text-strong', 'primary-subtle', TEXT, 'active sidebar item, LIVE badge'],
  ['success-text', 'surface-default', TEXT, 'supported capability (alias jade)'],
  ['success-text', 'bg-page', TEXT, 'success text on page'],
  ['success-text-strong', 'success-subtle', TEXT, 'VERIFIED badge'],
  ['warning-text', 'surface-default', TEXT, 'optional capability (alias amber)'],
  ['warning-text', 'warning-subtle', TEXT, 'MOCK badge'],
  ['error-text', 'surface-default', TEXT, 'missing core capability, errors'],
  ['error-text', 'bg-page', TEXT, 'errors on page'],
  ['error-text-strong', 'error-subtle', TEXT, 'BLOCKED badge'],
  ['error-on', 'error-solid', TEXT, 'danger button (future)'],
  ['secondary-text', 'surface-default', TEXT, 'lavender text'],
  ['secondary-on', 'secondary-solid', TEXT, 'secondary solid label'],
  ['accent-text', 'surface-default', TEXT, 'coral text'],
  ['accent-text-strong', 'accent-subtle', TEXT, 'coral text on subtle'],
  ['accent-on', 'accent-base', TEXT, 'text on coral'],
  ['logo-fg', 'logo-bg', TEXT, 'logo mark 学 (unchanged identity)'],
  ['border-focus', 'bg-page', UI, 'focus ring on page'],
  ['border-focus', 'surface-default', UI, 'focus ring in cards'],
  ['border-focus', 'bg-subtle', UI, 'focus ring on subtle'],
  ['border-focus', 'surface-sunken', UI, 'focus ring on sunken'],
  ['border-strong', 'surface-default', UI, 'input / secondary button outline'],
  ['border-strong', 'bg-page', UI, 'input outline on page'],
  ['primary-base', 'surface-default', UI, 'pending dot, selected candidate, drop target'],
  ['primary-base', 'primary-subtle', UI, 'drop target border on primary-subtle'],
  ['error-base', 'surface-default', UI, 'sync error dot'],
  ['success-solid', 'surface-default', UI, 'synced dot, VERIFIED border'],
  ['stroke-ink', 'surface-sunken', UI, 'handwriting strokes'],
];

let failures = 0;
const rows = [];
for (const [fg, bg, min, use] of PAIRS) {
  const a = tokens[fg];
  const b = tokens[bg];
  if (!a || !b) {
    rows.push(`MISSING  --${fg} / --${bg}`);
    failures += 1;
    continue;
  }
  const r = ratio(a, b);
  const ok = r >= min;
  if (!ok) failures += 1;
  rows.push(
    `${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)} ≥ ${min}  --${fg} ${a} on --${bg} ${b}  (${use})`,
  );
}
console.log(rows.join('\n'));
if (failures > 0) {
  console.error(`check-contrast: ${failures} pair(s) below WCAG AA`);
  process.exit(1);
}
console.log(`check-contrast: OK (${PAIRS.length} pairs, WCAG 2.2 AA)`);
