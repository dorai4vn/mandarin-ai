// Strict, dependency-free XML tree parser + narrowly scoped removal of INERT editor metadata
// (Inkscape/Sodipodi/RDF/Dublin Core/CC), run BEFORE the strict allowlist sanitizer.
//
// Not a relaxation of the sanitizer: the sanitizer still sees (and rejects) everything that
// survives. This step only deletes things recognised by exact namespace URI:
//   - the SVG <metadata> element subtree (non-rendering by spec);
//   - elements in the sodipodi / inkscape namespaces (editor state, e.g. namedview, path-effect);
//   - attributes in the sodipodi / inkscape namespaces;
//   - xmlns declarations of the recognised namespaces (dc, cc, rdf, sodipodi, inkscape, xlink, svg).
// Everything else is parsed and kept or rejected: DOCTYPE/ENTITY/CDATA/PIs, unknown namespaces,
// undeclared prefixes, duplicate attributes (also after namespace resolution), malformed markup.
// There is no DTD processing, no entity expansion and no external resolution because nothing of
// the kind is implemented: those constructs are rejected outright.
import { SvgRejected } from './sanitize.mjs';

export const NS = Object.freeze({
  svg: 'http://www.w3.org/2000/svg',
  xml: 'http://www.w3.org/XML/1998/namespace',
  xlink: 'http://www.w3.org/1999/xlink',
  dc: 'http://purl.org/dc/elements/1.1/',
  cc: 'http://creativecommons.org/ns#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  sodipodi: 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
  inkscape: 'http://www.inkscape.org/namespaces/inkscape',
});
// Declarations that may be dropped. xlink: only the declaration; any xlink:* attribute that is
// actually used stays and is rejected by the sanitizer.
const STRIPPABLE_DECL = new Set([NS.dc, NS.cc, NS.rdf, NS.sodipodi, NS.inkscape, NS.xlink, NS.svg]);
const EDITOR_NS = new Set([NS.sodipodi, NS.inkscape]);
const NAME = /^[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?$/;
const MAX_DEPTH = 64;
const MAX_NODES = 20000;
const WS = /\s/;
const rej = (r) => {
  throw new SvgRejected(r);
};

function parseTree(src) {
  let i = 0;
  let nodes = 0;
  const n = src.length;
  const root = { children: [] };
  const open = [root];
  let seenRoot = false;
  const skipWs = () => {
    while (i < n && WS.test(src[i])) i++;
  };
  while (i < n) {
    const top = open[open.length - 1];
    if (src[i] !== '<') {
      const j = src.indexOf('<', i);
      const text = src.slice(i, j === -1 ? n : j);
      i = j === -1 ? n : j;
      if (text.trim()) {
        if (open.length === 1) rej('text-outside-root');
        if (/&(?!(amp|lt|gt|quot|apos);)/.test(text)) rej('entity');
        top.children.push({ text });
      }
      continue;
    }
    if (src.startsWith('<!--', i)) {
      const j = src.indexOf('-->', i + 4);
      if (j === -1) rej('malformed');
      if (src.slice(i + 4, j).includes('--')) rej('malformed-comment');
      i = j + 3;
      continue;
    }
    if (src.startsWith('<!', i) || src.startsWith('<?', i)) rej('doctype-entity-cdata-or-pi');
    if (src.startsWith('</', i)) {
      const j = src.indexOf('>', i);
      if (j === -1) rej('malformed');
      const name = src.slice(i + 2, j).trim();
      const cur = open.pop();
      if (open.length === 0 || cur.qname !== name) rej('mismatched-tags');
      i = j + 1;
      continue;
    }
    if (++nodes > MAX_NODES) rej('too-many-nodes');
    if (open.length > MAX_DEPTH) rej('too-deep');
    i++;
    const ns = i;
    while (i < n && !WS.test(src[i]) && src[i] !== '/' && src[i] !== '>') i++;
    const qname = src.slice(ns, i);
    if (!NAME.test(qname)) rej('malformed-name');
    const attrs = [];
    let selfClose = false;
    for (;;) {
      const hadWs = i < n && WS.test(src[i]);
      skipWs();
      if (i >= n) rej('malformed');
      if (src[i] === '>') {
        i++;
        break;
      }
      if (src[i] === '/' && src[i + 1] === '>') {
        selfClose = true;
        i += 2;
        break;
      }
      if (!hadWs) rej('malformed');
      const as = i;
      while (i < n && !WS.test(src[i]) && src[i] !== '=' && src[i] !== '>' && src[i] !== '/') i++;
      const an = src.slice(as, i);
      if (!NAME.test(an)) rej('malformed-name');
      skipWs();
      if (src[i] !== '=') rej('attribute-without-value');
      i++;
      skipWs();
      const q = src[i];
      if (q !== '"' && q !== "'") rej('unquoted-attribute');
      const e = src.indexOf(q, i + 1);
      if (e === -1) rej('malformed');
      const val = src.slice(i + 1, e);
      if (val.includes('<')) rej('malformed');
      attrs.push({ qname: an, value: val });
      i = e + 1;
    }
    const el = { qname, attrs, children: [] };
    if (!open.length) rej('malformed');
    if (open.length === 1) {
      if (seenRoot) rej('bad-root');
      seenRoot = true;
    }
    top.children.push(el);
    if (!selfClose) open.push(el);
  }
  if (open.length !== 1 || !seenRoot) rej('malformed');
  return root.children.find((c) => c.qname);
}

const split = (q) => {
  const k = q.indexOf(':');
  return k === -1 ? [null, q] : [q.slice(0, k), q.slice(k + 1)];
};

/** @returns {{ svg: string, stripped: {elements:number, attributes:number, declarations:number} }} */
export function stripInertMetadata(input) {
  if (typeof input !== 'string') rej('not-a-string');
  let s = input.replace(/^﻿/, '');
  s = s.replace(/^\s*<\?xml\s[^?>]*\?>/, ''); // the single XML declaration; any other PI is rejected
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(s)) rej('doctype-entity-cdata');
  const rootEl = parseTree(s);
  const stripped = { elements: 0, attributes: 0, declarations: 0 };
  const out = [];

  const walk = (el, scope, depth) => {
    const scopeHere = new Map(scope);
    const real = [];
    for (const a of el.attrs) {
      if (a.qname === 'xmlns') scopeHere.set('', a.value);
      else if (a.qname.startsWith('xmlns:')) {
        const p = a.qname.slice(6);
        if (p === 'xmlns' || p === 'xml') rej('reserved-prefix');
        if (!a.value) rej('empty-namespace');
        scopeHere.set(p, a.value);
      } else real.push(a);
    }
    for (const a of el.attrs) {
      if (a.qname !== 'xmlns' && !a.qname.startsWith('xmlns:')) continue;
      const uri = a.value;
      if (a.qname === 'xmlns' ? uri === NS.svg : STRIPPABLE_DECL.has(uri)) stripped.declarations++;
      else rej(`unknown-namespace-declaration:${a.qname}`);
    }
    const [ep, el0] = split(el.qname);
    const euri = scopeHere.get(ep ?? '');
    if (euri === undefined) rej(`undeclared-prefix:${ep ?? '(default)'}`);
    if (euri !== NS.svg && !EDITOR_NS.has(euri)) rej(`unknown-namespace-element:${el.qname}`);
    if (EDITOR_NS.has(euri)) {
      stripped.elements++; // whole subtree is editor state
      return;
    }
    if (el0 === 'metadata') {
      stripped.elements++; // subtree was fully parsed (well-formed, no DTD/entities) before drop
      return;
    }
    if (depth === 0 && euri !== NS.svg) rej('bad-root');
    const seen = new Set();
    const kept = [];
    for (const a of real) {
      const [ap, al] = split(a.qname);
      let auri = null;
      if (ap !== null) {
        auri = ap === 'xml' ? NS.xml : scopeHere.get(ap);
        if (auri === undefined) rej(`undeclared-prefix:${ap}`);
      }
      const ident = `${auri ?? ''}|${al}`;
      if (seen.has(ident)) rej(`duplicate-attribute:${a.qname}`);
      seen.add(ident);
      if (auri !== null && EDITOR_NS.has(auri)) {
        stripped.attributes++;
        continue;
      }
      // xml:space / unknown-namespace attributes keep their qualified name; the sanitizer decides.
      kept.push(a);
    }
    const attrStr = kept.map((a) => ` ${a.qname}="${a.value}"`).join('');
    const xmlns = depth === 0 ? ` xmlns="${NS.svg}"` : '';
    // Prefixed SVG elements are emitted unprefixed (prefix is syntax, not meaning).
    const emitName = el0;
    if (!el.children.length) {
      out.push(`<${emitName}${xmlns}${attrStr}/>`);
      return;
    }
    out.push(`<${emitName}${xmlns}${attrStr}>`);
    for (const c of el.children) {
      if (c.text !== undefined) out.push(c.text);
      else walk(c, scopeHere, depth + 1);
    }
    out.push(`</${emitName}>`);
  };
  walk(rootEl, new Map(), 0);
  return { svg: out.join(''), stripped };
}

/** Strip inert editor metadata, then the strict sanitizer runs on the result (caller). */
export const cleanThenSanitize = (input, sanitize) => {
  const { svg, stripped } = stripInertMetadata(input);
  return { svg: sanitize(svg), stripped };
};
