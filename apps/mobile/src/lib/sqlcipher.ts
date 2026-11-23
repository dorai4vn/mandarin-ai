/** 32 random bytes as lowercase hex (64 chars). */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const RAW_KEY = /^[0-9a-f]{64}$/;

/**
 * Builds the SQLCipher `PRAGMA key` statement for a raw 256-bit key.
 * PRAGMA cannot use bound parameters, so the key is strictly validated before
 * interpolation (only [0-9a-f]{64} is accepted).
 */
export function buildKeyPragma(hexKey: string): string {
  if (!RAW_KEY.test(hexKey)) throw new Error('Database key must be 64 lowercase hex characters');
  return `PRAGMA key = "x'${hexKey}'";`;
}

/** `PRAGMA cipher_version` returns a non-empty version only when SQLCipher is linked. */
export function isSqlCipherVersion(value: unknown): boolean {
  return typeof value === 'string' && /^\d+\.\d+\.\d+/.test(value.trim());
}
