// Licence allowlist: CC0, public domain, CC BY, CC BY-SA. Everything else is rejected.
export const ALLOWED = Object.freeze({
  CC0: { attribution: false, shareAlike: false },
  PD: { attribution: false, shareAlike: false },
  'CC-BY': { attribution: true, shareAlike: false },
  'CC-BY-SA': { attribution: true, shareAlike: true },
});

/** Returns {ok, id, version, attribution, shareAlike, reason}. Unknown => ok:false. */
export function classifyLicence(shortName) {
  const raw = String(shortName ?? '').trim();
  if (!raw) return { ok: false, reason: 'licence-missing' };
  const s = raw.toLowerCase().replace(/[_\s]+/g, ' ');
  if (
    /\b(nc|nd|noncommercial|no derivatives|gfdl|fair use|non-free|all rights reserved)\b/.test(s) ||
    /-nc|-nd/.test(s)
  ) {
    return { ok: false, reason: `licence-not-allowed:${raw}` };
  }
  let m;
  if (/^cc0\b/.test(s) || /^cc zero/.test(s) || /^cc-zero/.test(s)) return done('CC0', null, raw);
  if (/^(public domain|pd)\b/.test(s) || /^pd-/.test(s)) return done('PD', null, raw);
  if ((m = s.match(/^cc[- ]by[- ]sa[- ](\d\.\d)\b/))) return done('CC-BY-SA', m[1], raw);
  if ((m = s.match(/^cc[- ]by[- ](\d\.\d)\b/))) return done('CC-BY', m[1], raw);
  return { ok: false, reason: `licence-unknown:${raw}` };
}
function done(id, version, raw) {
  return {
    ok: true,
    id,
    version,
    rawName: raw,
    attribution: ALLOWED[id].attribution,
    shareAlike: ALLOWED[id].shareAlike,
  };
}
