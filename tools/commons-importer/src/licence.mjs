// Licence allowlist: CC0, public domain, CC BY, CC BY-SA. Everything else is rejected.
// Names must match Commons' exact short names; CC BY / BY-SA require a known unported version
// and the licence URL must be the canonical creativecommons.org URL for that exact licence.
export const ALLOWED = Object.freeze({
  CC0: { attribution: false, shareAlike: false },
  PD: { attribution: false, shareAlike: false },
  'CC-BY': { attribution: true, shareAlike: false },
  'CC-BY-SA': { attribution: true, shareAlike: true },
});
const VERSIONS = new Set(['1.0', '2.0', '2.5', '3.0', '4.0']);

/** Returns {ok, id, version, canonicalUrl, attribution, shareAlike, reason}. Unknown => ok:false. */
export function classifyLicence(shortName) {
  const raw = String(shortName ?? '').trim();
  if (!raw) return { ok: false, reason: 'licence-missing' };
  let m;
  if (raw === 'CC0' || raw === 'CC0 1.0')
    return done('CC0', '1.0', raw, 'https://creativecommons.org/publicdomain/zero/1.0/');
  if (raw === 'Public domain' || /^PD-[A-Za-z0-9-]+$/.test(raw)) return done('PD', null, raw, null);
  if ((m = raw.match(/^CC BY-SA (\d\.\d)$/)) && VERSIONS.has(m[1]))
    return done('CC-BY-SA', m[1], raw, `https://creativecommons.org/licenses/by-sa/${m[1]}/`);
  if ((m = raw.match(/^CC BY (\d\.\d)$/)) && VERSIONS.has(m[1]))
    return done('CC-BY', m[1], raw, `https://creativecommons.org/licenses/by/${m[1]}/`);
  if (/\b(NC|ND)\b|-NC|-ND|GFDL|fair use|non-free/i.test(raw))
    return { ok: false, reason: `licence-not-allowed:${raw}` };
  return { ok: false, reason: `licence-unknown:${raw}` };
}

/**
 * Checks the reported LicenseUrl against the canonical one. Returns the canonical URL to store,
 * or null when it does not match. PD has no single canonical URL: empty or the CC PD-mark URL only.
 */
export function checkLicenceUrl(lic, reported) {
  const r = String(reported ?? '').trim();
  const norm = r
    .replace(/^http:/, 'https:')
    .replace(/\/deed\.[a-z-]+$/i, '')
    .replace(/\/?$/, '/');
  if (!lic.canonicalUrl) {
    const mark = 'https://creativecommons.org/publicdomain/mark/1.0/';
    return r === ''
      ? { ok: true, url: null }
      : norm === mark
        ? { ok: true, url: mark }
        : { ok: false };
  }
  return norm === lic.canonicalUrl ? { ok: true, url: lic.canonicalUrl } : { ok: false };
}
function done(id, version, raw, canonicalUrl) {
  return {
    ok: true,
    id,
    version,
    rawName: raw,
    canonicalUrl,
    attribution: ALLOWED[id].attribution,
    shareAlike: ALLOWED[id].shareAlike,
  };
}
