import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ArtworkWorker,
  LocalArtworkStorage,
  MemoryArtworkQueue,
  MemoryArtworkStorage,
  MockArtworkProvider,
  backoffMs,
  processImage,
  readWebpHeader,
  runQc,
  sha256Hex,
  type ArtworkRequest,
} from './index.js';

const req = (n: number): ArtworkRequest => ({
  subjectId: `subject-${n}`,
  prompt: `draw ${n}`,
  style: 'flat',
  seed: n,
});
function setup(opts = {}) {
  let t = 1_000_000;
  const now = () => t;
  const queue = new MemoryArtworkQueue(now);
  const storage = new MemoryArtworkStorage();
  const provider = new MockArtworkProvider();
  const worker = new ArtworkWorker(queue, provider, storage, { now, ...opts });
  return { queue, storage, provider, worker, advance: (ms: number) => (t += ms) };
}

describe('mock provider + processing', () => {
  it('is deterministic and labelled', async () => {
    const p = new MockArtworkProvider();
    const ac = new AbortController();
    const a = await p.generate(req(1), { signal: ac.signal });
    const b = await p.generate(req(1), { signal: ac.signal });
    expect(sha256Hex(a.bytes)).toBe(sha256Hex(b.bytes));
    expect(new TextDecoder().decode(a.bytes)).toContain('not a real illustration');
    expect(p.kind).toBe('mock');
  });
  it('produces 4:3 webp container with checksum', async () => {
    const p = new MockArtworkProvider();
    const img = await p.generate(req(2), { signal: new AbortController().signal });
    const { bytes, metadata } = processImage(img);
    expect(readWebpHeader(bytes)).toEqual({ width: 1024, height: 768, mock: true });
    expect(metadata.sha256).toBe(sha256Hex(bytes));
  });
});

describe('worker end to end', () => {
  it('generates, stores, records provenance; mock is never evidence', async () => {
    const { queue, storage, worker } = setup();
    const job = queue.enqueue('k1', req(1));
    const rep = await worker.drain();
    expect(rep.succeeded).toBe(1);
    const done = queue.get(job.id)!;
    expect(done.status).toBe('succeeded');
    const res = done.result!;
    expect(res.provenance).toMatchObject({
      source: 'mock',
      placeholder: true,
      isHistoricalEvidence: false,
      historicalEvidence: [],
    });
    expect(res.qc.passed).toBe(true);
    expect(await storage.exists(res.storageKey)).toBe(true);
  });
  it('idempotency: duplicate enqueue creates one job and one asset', async () => {
    const { queue, storage, worker } = setup();
    const a = queue.enqueue('same', req(1));
    const b = queue.enqueue('same', req(1));
    expect(a.id).toBe(b.id);
    queue.enqueue('other-key-same-content', req(1));
    await worker.drain();
    expect(queue.list()).toHaveLength(2);
    expect(storage.size).toBe(1); // content-addressed dedupe
  });
  it('retries with bounded backoff then succeeds', async () => {
    const { queue, provider, worker, advance } = setup({ baseBackoffMs: 1000 });
    provider.failTimes('subject-1', 2);
    const job = queue.enqueue('k', req(1));
    expect((await worker.drain()).retried).toBe(1);
    expect((await worker.drain()).processed).toBe(0); // not due yet
    advance(1000);
    expect((await worker.drain()).retried).toBe(1);
    advance(2000);
    expect((await worker.drain()).succeeded).toBe(1);
    expect(queue.get(job.id)!.attempts).toBe(3);
    expect(backoffMs(20, 1000, 30_000)).toBe(30_000);
  });
  it('fails permanently after maxAttempts', async () => {
    const { queue, provider, worker, advance } = setup({ maxAttempts: 2 });
    provider.failTimes('subject-1', 99);
    const job = queue.enqueue('k', req(1));
    await worker.drain();
    advance(10_000);
    await worker.drain();
    expect(queue.get(job.id)).toMatchObject({ status: 'failed', attempts: 2 });
  });
  it('respects budget: leftover jobs stay queued', async () => {
    const { queue, provider, worker } = setup({ budgetUnits: 2 });
    provider.estimateCost = () => 1;
    for (let i = 0; i < 5; i++) queue.enqueue(`k${i}`, req(i));
    const rep = await worker.drain();
    expect(rep.budgetExhausted).toBe(true);
    expect(rep.succeeded).toBe(2);
    expect(queue.list().filter((j) => j.status === 'queued')).toHaveLength(3);
    expect(queue.list().every((j) => j.attempts <= 1)).toBe(true);
  });
  it('limits concurrency', async () => {
    const { queue, provider, worker } = setup({ concurrency: 3 });
    let cur = 0,
      peak = 0;
    const orig = provider.generate.bind(provider);
    provider.generate = async (r, o) => {
      cur++;
      peak = Math.max(peak, cur);
      await new Promise((res) => setTimeout(res, 2));
      cur--;
      return orig(r, o);
    };
    for (let i = 0; i < 12; i++) queue.enqueue(`k${i}`, req(i));
    await worker.drain();
    expect(peak).toBe(3);
  });
  it('cancels in-flight job and does not store', async () => {
    const { queue, storage, provider, worker } = setup();
    const orig = provider.generate.bind(provider);
    provider.generate = async (r, o) => {
      await new Promise((res) => setTimeout(res, 5));
      return orig(r, o);
    };
    const job = queue.enqueue('k', req(1));
    const p = worker.drain();
    worker.cancel(job.id);
    await p;
    expect(queue.get(job.id)!.status).toBe('cancelled');
    expect(storage.size).toBe(0);
  });
  it('resumes a crashed worker after lease expiry, and requeue regenerates', async () => {
    const { queue, worker, advance } = setup({ leaseMs: 1000 });
    const job = queue.enqueue('k', req(1));
    queue.claim('dead-worker', 1000); // crashed holding the lease
    expect((await worker.drain()).processed).toBe(0);
    advance(1001);
    expect((await worker.drain()).succeeded).toBe(1);
    expect(queue.get(job.id)!.attempts).toBe(2);
    expect(queue.requeue(job.id)).toBe(false); // succeeded is not requeueable
    queue.cancel(job.id);
  });
  it('processes 1000 synthetic jobs', async () => {
    const { queue, storage, worker } = setup({ concurrency: 8 });
    for (let i = 0; i < 1000; i++) queue.enqueue(`k${i}`, req(i));
    const rep = await worker.drain();
    expect(rep.succeeded).toBe(1000);
    expect(storage.size).toBe(1000);
  });
});

describe('qc', () => {
  it('rejects tampering and mislabelled mock', async () => {
    const img = await new MockArtworkProvider().generate(req(1), {
      signal: new AbortController().signal,
    });
    const { bytes, metadata } = processImage(img);
    const prov = {
      source: 'mock',
      providerId: 'x',
      promptSha256: '',
      seed: 1,
      createdAt: '',
      placeholder: true,
      isHistoricalEvidence: false,
      historicalEvidence: [],
    } as const;
    expect(runQc(bytes, metadata, prov).passed).toBe(true);
    const bad = bytes.slice();
    bad[bad.length - 3] = (bad[bad.length - 3] ?? 0) ^ 1;
    expect(runQc(bad, metadata, prov).issues.map((i) => i.code)).toContain('checksum');
    const codes = runQc(bytes, metadata, { ...prov, placeholder: false }).issues.map((i) => i.code);
    expect(codes).toContain('mock_unlabelled');
    const ev = { sourceTitle: 'a', citation: 'b', license: 'c' };
    expect(runQc(bytes, metadata, { ...prov, historicalEvidence: [ev] }).passed).toBe(false);
    expect(runQc(new Uint8Array(4), metadata, prov).issues.map((i) => i.code)).toContain(
      'not_webp',
    );
  });
});

describe('storage contract', () => {
  const bytes = new TextEncoder().encode('hello');
  const sha = sha256Hex(bytes);
  async function contract(s: MemoryArtworkStorage | LocalArtworkStorage) {
    await s.put('artwork/a.webp', bytes, 'image/webp', sha);
    await s.put('artwork/a.webp', bytes, 'image/webp', sha); // idempotent
    expect(await s.get('artwork/a.webp')).toEqual(bytes);
    await expect(s.put('artwork/b.webp', bytes, 'image/webp', 'bad')).rejects.toThrow(/checksum/);
    for (const k of ['../x', '/etc/passwd', 'a/../../x', 'A B']) {
      await expect(s.get(k)).rejects.toThrow(/invalid/);
    }
    await s.delete('artwork/a.webp');
    expect(await s.get('artwork/a.webp')).toBeNull();
  }
  it('memory adapter', () => contract(new MemoryArtworkStorage()));
  it('local adapter', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'artwork-'));
    try {
      await contract(new LocalArtworkStorage(dir));
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
