import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { sha256Hex } from './mock-provider.js';
import type { ArtworkStorage } from './types.js';

const KEY_RE = /^[a-z0-9][a-z0-9/_-]*(\.[a-z0-9]+)?$/;
function checkKey(key: string): void {
  if (!KEY_RE.test(key) || key.includes('..') || key.includes('//'))
    throw new Error(`invalid storage key: ${key}`);
}
function checkBytes(bytes: Uint8Array, sha: string): void {
  if (sha256Hex(bytes) !== sha) throw new Error('checksum mismatch');
}

export class MemoryArtworkStorage implements ArtworkStorage {
  private readonly files = new Map<string, Uint8Array>();
  async put(key: string, bytes: Uint8Array, _ct: string, sha256: string): Promise<void> {
    checkKey(key);
    checkBytes(bytes, sha256);
    if (!this.files.has(key)) this.files.set(key, bytes.slice());
  }
  async get(key: string): Promise<Uint8Array | null> {
    checkKey(key);
    return this.files.get(key)?.slice() ?? null;
  }
  async exists(key: string): Promise<boolean> {
    checkKey(key);
    return this.files.has(key);
  }
  async delete(key: string): Promise<void> {
    checkKey(key);
    this.files.delete(key);
  }
  get size(): number {
    return this.files.size;
  }
}

/** Local filesystem adapter rooted at `root`; keys cannot escape it. */
export class LocalArtworkStorage implements ArtworkStorage {
  private readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }
  private path(key: string): string {
    checkKey(key);
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('path escape');
    return p;
  }
  async put(key: string, bytes: Uint8Array, _ct: string, sha256: string): Promise<void> {
    checkBytes(bytes, sha256);
    const p = this.path(key);
    if (await this.exists(key)) return;
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, bytes);
  }
  async get(key: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.path(key)));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.path(key));
      return true;
    } catch {
      return false;
    }
  }
  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
}
