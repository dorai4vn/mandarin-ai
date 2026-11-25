#!/usr/bin/env node
/**
 * WCAG 2.2 contrast gate for the Design System V2 tokens, LIGHT and DARK (D-039, TOKENS_V2 §3).
 * Reads the real values from apps/web/src/design/tokens.css, so a token change that drops a pair
 * below AA fails CI. Pairs = every foreground/background combination the UI actually uses; each is
 * checked in both themes. Also fails if the two DARK blocks (explicit choice / system preference)
 * differ.
 *   4.5 : normal text   ·   3 : large text, UI components, focus indicator (WCAG 1.4.3 / 1.4.11)
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../apps/web/src/design/tokens.css', import.meta.url), 'utf8');
/** Body of the first rule whose selector matches `selector` (balanced braces). */
function block(source, selector) {
  const at = source.indexOf(selector);
  if (at < 0) throw new Error(`check-contrast: no block for ${selector}`);
  const open = source.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`check-contrast: unbalanced block for ${selector}`);
}
const vars = (body) =>
  Object.fromEntries(
    [...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [
      m[1],
      m[2].trim().toLowerCase(),
    ]),
  );
const hexOnly = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => /^#[0-9a-f]{6}$/.test(v)));

const light = vars(block(css, ':root {'));
const darkExplicit = vars(block(css, ":root[data-theme='dark'] {"));
const darkSystem = vars(block(block(css, '@media (prefers-color-scheme: dark) {'), '{'));
const drift = [...new Set([...Object.keys(darkExplicit), ...Object.keys(darkSystem)])].filter(
  (k) => darkExplicit[k] !== darkSystem[k],
);
if (drift.length > 0) {
  console.error(`check-contrast: DARK blocks differ for ${drift.map((k) => `--${k}`).join(', ')}`);
  process.exit(1);
}
const THEMES = { light: hexOnly(light), dark: hexOnly({ ...light, ...darkExplicit }) };

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
/** [foreground token, background token, minimum, where it is used, only in theme?] */
const PAIRS = [
  // UI-2B
  ['fg-inverse', 'surface-inverse', TEXT, 'tooltip text'],
  ['fg-default', 'surface-raised', TEXT, 'selected segmented tab / choice'],
  ['fg-muted', 'bg-subtle', TEXT, 'unselected segmented tab'],
  ['primary-base', 'surface-default', UI, 'underline tab indicator'],
  ['primary-base', 'bg-subtle', UI, 'progress fill on track'],
  ['success-solid', 'bg-subtle', UI, 'progress fill (success) on track'],
  ['fg-muted', 'surface-sunken', TEXT, 'read-only field placeholder, details text (M8)'],
  ['fg-muted', 'surface-default', TEXT, 'field hint (M8: fg-muted, also on subtle cards)'],
  ['error-text', 'surface-sunken', TEXT, 'error text on sunken'],
  // UI-2 Study Cards (pastel tiles from the reference): title + meta text
  ['fg-default', 'study-blue-bg', TEXT, 'study card title (blue)'],
  ['fg-muted', 'study-blue-bg', TEXT, 'study card meta (blue)'],
  ['fg-default', 'study-lavender-bg', TEXT, 'study card title (lavender, Nghe hiểu)'],
  ['fg-muted', 'study-lavender-bg', TEXT, 'study card meta (lavender)'],
  ['study-lavender-icon', 'study-lavender-bg', UI, 'study card icon (lavender)'],
  ['fg-default', 'study-mint-bg', TEXT, 'study card title (mint)'],
  ['fg-muted', 'study-mint-bg', TEXT, 'study card meta (mint)'],
  // "Sắp có" badge sits on 70 % white over the pastel tile (lighter than bg-subtle); bg-subtle is
  // the darker bound, so passing here covers it.
  ['fg-muted', 'bg-subtle', TEXT, 'neutral badge (and lower bound for "Sắp có" on tiles)'],
  // UI-2 Badge / form
  ['secondary-text', 'secondary-subtle', TEXT, 'secondary badge'],
  ['accent-text-strong', 'accent-subtle', TEXT, 'accent badge'],
  ['warning-text', 'warning-subtle', TEXT, 'warning badge'],
  ['success-text-strong', 'success-subtle', TEXT, 'success badge'],
  ['error-text-strong', 'error-subtle', TEXT, 'error badge'],
  ['error-text', 'surface-default', TEXT, 'field error message'],
  ['error-base', 'surface-default', UI, 'field error border'],
  ['border-strong', 'surface-default', UI, 'input border'],
  ['success-on', 'success-solid', TEXT, 'success button'],
  ['error-on', 'error-solid', TEXT, 'danger button'],
  ['error-on', 'error-hover', TEXT, 'danger button hover'],
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
  // UI-7B brand lockup (D-041 measured colours) on the sidebar / top bar surface
  ['brand-name', 'surface-default', TEXT, 'lockup name "Mandarin AI"'],
  ['brand-tagline', 'surface-default', TEXT, 'lockup tagline "TỰ HỌC TIẾNG TRUNG"'],
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
  // UI-4/UI-6: raised surfaces (dialog, popover) and their text
  ['fg-default', 'surface-raised', TEXT, 'dialog / popover text'],
  ['fg-muted', 'surface-raised', TEXT, 'dialog description, popover labels'],
  ['border-focus', 'surface-raised', UI, 'focus ring in dialogs'],
  ['error-text', 'surface-raised', TEXT, 'popover error count'],
  // UI-5: upload, study tiles in dark
  ['error-base', 'surface-sunken', UI, 'rejected drop zone border'],
  ['border-strong', 'surface-sunken', UI, 'drop zone / canvas frame border'],
  // Decorative icons: light keeps the reference blue/mint (see tokens.css); dark ones are checked.
  ['study-blue-icon', 'study-blue-bg', UI, 'study card icon (blue)', 'dark'],
  ['study-mint-icon', 'study-mint-bg', UI, 'study card icon (mint)', 'dark'],
];

let failures = 0;
const rows = [];
for (const [theme, tokens] of Object.entries(THEMES)) {
  for (const [fg, bg, min, use, only] of PAIRS) {
    if (only && only !== theme) continue;
    const a = tokens[fg];
    const b = tokens[bg];
    if (!a || !b) {
      rows.push(`MISSING  ${theme}  --${fg} / --${bg}`);
      failures += 1;
      continue;
    }
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) failures += 1;
    rows.push(
      `${ok ? 'PASS' : 'FAIL'}  ${theme.padEnd(5)} ${r.toFixed(2).padStart(5)} ≥ ${min}  --${fg} ${a} on --${bg} ${b}  (${use})`,
    );
  }
}
console.log(rows.join('\n'));
if (failures > 0) {
  console.error(`check-contrast: ${failures} pair(s) below WCAG AA`);
  process.exit(1);
}
console.log(`check-contrast: OK (${PAIRS.length} pairs × light + dark, WCAG 2.2 AA)`);
