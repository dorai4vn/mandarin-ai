// Strict allowlist SVG sanitizer. Rejects (does not silently repair) anything
// that could load external resources or run script. Output is rebuilt
// deterministically from parsed tokens.
const ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'title',
  'desc',
  'clippath',
  'lineargradient',
  'radialgradient',
  'stop',
]);
const CANON = {
  clippath: 'clipPath',
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient',
};
const ATTRS = new Set([
  'd',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'points',
  'transform',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-miterlimit',
  'opacity',
  'viewbox',
  'xmlns',
  'version',
  'id',
  'offset',
  'stop-color',
  'stop-opacity',
  'clip-path',
  'clip-rule',
  'gradientunits',
  'gradienttransform',
  'preserveaspectratio',
]);
const CANON_ATTR = {
  viewbox: 'viewBox',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  preserveaspectratio: 'preserveAspectRatio',
};
const MAX_BYTES = 512 * 1024;

export class SvgRejected extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}
const esc = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function sanitizeSvg(input) {
  if (typeof input !== 'string') throw new SvgRejected('not-a-string');
  if (Buffer.byteLength(input) > MAX_BYTES) throw new SvgRejected('too-large');
  let s = input.replace(/^﻿/, '');
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(s)) throw new SvgRejected('doctype-entity-cdata');
  s = s.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  if (/<\?/.test(s)) throw new SvgRejected('processing-instruction');
  const re =
    /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>|([^<]+)|(<)/g;
  const out = [];
  const stack = [];
  let m;
  let seenRoot = false;
  let last = 0;
  while ((m = re.exec(s))) {
    if (m.index !== last) throw new SvgRejected('malformed');
    last = re.lastIndex;
    if (m[6]) throw new SvgRejected('malformed');
    if (m[5] !== undefined) {
      if (m[5].trim()) {
        const top = stack[stack.length - 1];
        if (top !== 'title' && top !== 'desc') throw new SvgRejected('stray-text');
        if (/[&]/.test(m[5].replace(/&(amp|lt|gt|quot|apos);/g, '')))
          throw new SvgRejected('entity');
        out.push(m[5].trim());
      }
      continue;
    }
    const closing = m[1] === '/';
    const raw = m[2];
    const name = raw.toLowerCase();
    if (raw.includes(':') && name !== 'svg') throw new SvgRejected(`namespaced-element:${raw}`);
    if (!ELEMENTS.has(name)) throw new SvgRejected(`element-not-allowed:${raw}`);
    const canon = CANON[name] ?? name;
    if (closing) {
      if (stack.pop() !== canon) throw new SvgRejected('mismatched-tags');
      out.push(`</${canon}>`);
      continue;
    }
    if (!stack.length) {
      if (seenRoot || canon !== 'svg') throw new SvgRejected('bad-root');
      seenRoot = true;
    } else if (!seenRoot) throw new SvgRejected('bad-root');
    const attrs = [];
    const ar = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
    let a;
    while ((a = ar.exec(m[3] ?? ''))) {
      const an = a[1].toLowerCase();
      const val = a[2] ?? a[3] ?? '';
      if (an.startsWith('on')) throw new SvgRejected(`event-handler:${an}`);
      if (an === 'href' || an.endsWith(':href') || an === 'style' || an === 'src')
        throw new SvgRejected(`attribute-not-allowed:${an}`);
      if (an.startsWith('xmlns:') || an.startsWith('xml:')) {
        if (an === 'xml:space') continue;
        throw new SvgRejected(`attribute-not-allowed:${an}`);
      }
      if (!ATTRS.has(an)) throw new SvgRejected(`attribute-not-allowed:${an}`);
      const decoded = val.replace(/&#x?[0-9a-f]+;?/gi, '\u0000');
      if (decoded.includes('\u0000')) throw new SvgRejected('char-reference');
      if (/javascript:|data:|vbscript:|@import|expression\(/i.test(val))
        throw new SvgRejected('dangerous-value');
      if (/url\(/i.test(val) && !/^\s*url\(\s*#[\w.-]+\s*\)\s*$/i.test(val))
        throw new SvgRejected('external-url');
      if (an === 'xmlns' && val !== 'http://www.w3.org/2000/svg')
        throw new SvgRejected('bad-xmlns');
      attrs.push([CANON_ATTR[an] ?? an, val]);
    }
    attrs.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
    const sa = attrs.map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
    if (m[4] === '/') out.push(`<${canon}${sa}/>`);
    else {
      stack.push(canon);
      out.push(`<${canon}${sa}>`);
    }
  }
  if (last !== s.length || stack.length || !seenRoot) throw new SvgRejected('malformed');
  return out.join('');
}
