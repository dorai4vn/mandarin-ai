import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg, SvgRejected } from '../src/sanitize.mjs';
import { SAFE_SVG } from './helpers.mjs';
const wrap = (inner, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg"${attrs}>${inner}</svg>`;
test('accepts safe svg and is deterministic', () => {
  const a = sanitizeSvg(SAFE_SVG);
  assert.equal(a, sanitizeSvg(`<?xml version="1.0"?><!-- c -->${SAFE_SVG}`));
  assert.ok(a.includes('viewBox="0 0 10 10"'));
});
const bad = {
  script: wrap('<script>alert(1)</script>'),
  foreignObject: wrap('<foreignObject><div/></foreignObject>'),
  image: wrap('<image href="https://evil/x.png"/>'),
  use: wrap('<use href="https://evil/x.svg#a"/>'),
  onload: wrap('<path d="M0 0" onclick="x()"/>'),
  onloadRoot: wrap('', ' onload="x()"'),
  style: wrap('<path d="M0 0" style="fill:url(http://e)"/>'),
  styleEl: wrap('<style>@import url(http://e)</style>'),
  externalFill: wrap('<path d="M0 0" fill="url(http://e/x)"/>'),
  jsHref: wrap('<a href="javascript:alert(1)"><path d="M0 0"/></a>'),
  doctype: '<!DOCTYPE svg [<!ENTITY x "y">]>' + wrap(''),
  charref: wrap('<path d="M0 0" fill="&#106;avascript:"/>'),
  nsHref: wrap(
    '<path d="M0 0" xlink:href="http://e"/>',
    ' xmlns:xlink="http://www.w3.org/1999/xlink"',
  ),
  nonSvgRoot: '<html></html>',
  twoRoots: wrap('') + wrap(''),
  mismatched: '<svg xmlns="http://www.w3.org/2000/svg"><g></svg></g>',
  unclosed: '<svg xmlns="http://www.w3.org/2000/svg"><g>',
  animate: wrap('<animate attributeName="href" to="javascript:x"/>'),
  stray: 'hello' + wrap(''),
};
for (const [k, v] of Object.entries(bad))
  test(`rejects ${k}`, () => assert.throws(() => sanitizeSvg(v), SvgRejected));
test('rejects oversize', () =>
  assert.throws(() => sanitizeSvg(wrap(`<title>${'a'.repeat(600000)}</title>`)), SvgRejected));
test('allows internal gradient url(#id)', () => {
  assert.ok(
    sanitizeSvg(
      wrap(
        '<defs><linearGradient id="g"><stop offset="0" stop-color="#000"/></linearGradient></defs><path d="M0 0" fill="url(#g)"/>',
      ),
    ).includes('url(#g)'),
  );
});
