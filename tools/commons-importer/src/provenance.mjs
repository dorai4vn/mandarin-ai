// Provenance helpers: SHA1 normalisation/verification and URL validation. No network.
import { createHash } from 'node:crypto';

/**
 * Normalise an upstream SHA1 to 40-char lowercase hex.
 * Accepts hex (what the Action API imageinfo `sha1` returns) or MediaWiki's base36
 * form (what the database stores; 31 chars). Anything else => null.
 */
export function normalizeSha1(s) {
  const v = String(s ?? '').toLowerCase();
  if (/^[0-9a-f]{40}$/.test(v)) return v;
  if (/^[0-9a-z]{31}$/.test(v)) {
    let n = 0n;
    for (const ch of v) n = n * 36n + BigInt(parseInt(ch, 36));
    if (n >= 1n << 160n) return null;
    return n.toString(16).padStart(40, '0');
  }
  return null;
}
export const sha1Hex = (bytes) => createHash('sha1').update(bytes).digest('hex');

/** True iff raw bytes hash to the (hex or base36) upstream sha1. */
export function verifySha1(bytes, upstream) {
  const want = normalizeSha1(upstream);
  return want !== null && sha1Hex(bytes) === want;
}

function httpsUrl(u, host) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:' || x.hostname !== host || x.port || x.username || x.password)
      return null;
    return x;
  } catch {
    return null;
  }
}
export const isCommonsFileUrl = (u) =>
  httpsUrl(u, 'upload.wikimedia.org')?.pathname.startsWith('/wikipedia/commons/') ?? false;
export const isCommonsPageUrl = (u) =>
  httpsUrl(u, 'commons.wikimedia.org')?.pathname.startsWith('/wiki/') ?? false;
