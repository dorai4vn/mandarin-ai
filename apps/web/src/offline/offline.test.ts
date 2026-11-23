import 'fake-indexeddb/auto';
import type { SyncOperation, SyncPushResponse } from '@mandarin/contracts';
import { describe, expect, it } from 'vitest';
import { IndexedDbStore, MemoryStore, openLocalStore } from './store';
import { SyncEngine } from './sync';

/** Server double with the same idempotency semantics as the API store. */
function fakeServer() {
  const seen = new Set<string>();
  const push = async (ops: SyncOperation[]): Promise<SyncPushResponse> => ({
    source: 'mock',
    results: ops.map((o) => {
      const dup = seen.has(o.operationId);
      seen.add(o.operationId);
      return {
        operationId: o.operationId,
        status: dup ? 'duplicate' : 'applied',
        serverVersion: 1,
        error: null,
      };
    }),
  });
  return { seen, push };
}

describe('IndexedDB store + outbox (D-021)', () => {
  it('persists note and outbox entry atomically and survives reopening', async () => {
    const a = await IndexedDbStore.open('t-persist');
    await a.addNote('山');
    const b = await IndexedDbStore.open('t-persist'); // "tab closed and reopened"
    expect((await b.listNotes()).map((n) => n.text)).toEqual(['山']);
    expect(await b.listOutbox()).toHaveLength(1);
    expect(b.deviceId).toBe(a.deviceId);
  });

  it('syncs exactly once even when the first response is lost', async () => {
    const store = await IndexedDbStore.open('t-lost-response');
    await store.addNote('水');
    await store.addNote('人');
    const server = fakeServer();
    let first = true;
    const flaky = async (ops: SyncOperation[]) => {
      const res = await server.push(ops); // server stores…
      if (first) {
        first = false;
        throw new Error('connection reset'); // …but the client never sees the answer
      }
      return res;
    };
    const engine = new SyncEngine(store, flaky, undefined);
    const s1 = await engine.syncNow();
    expect(s1.error).toBe('connection reset');
    expect(await store.listOutbox()).toHaveLength(2);
    const s2 = await engine.syncNow();
    expect(s2).toMatchObject({ applied: 0, duplicate: 2, error: null });
    expect(await store.listOutbox()).toHaveLength(0);
    expect(server.seen.size).toBe(2);
  });

  it('keeps causal order across batches', async () => {
    const store = await IndexedDbStore.open('t-order');
    for (const t of ['一', '二', '三']) await store.addNote(t);
    const clocks: number[] = [];
    await new SyncEngine(
      store,
      async (ops) => {
        clocks.push(...ops.map((o) => o.logicalClock));
        return fakeServer().push(ops);
      },
      undefined,
    ).syncNow();
    expect(clocks).toEqual([1, 2, 3]);
  });
});

describe('fallback when IndexedDB is unavailable (D-028)', () => {
  it('opens a memory store instead of failing', async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simulate a browser without IndexedDB
    globalThis.indexedDB = undefined;
    try {
      const store = await openLocalStore('t-none');
      expect(store.kind).toBe('memory');
      await store.addNote('山');
      const server = fakeServer();
      const s = await new SyncEngine(store, server.push, undefined).syncNow();
      expect(s.applied).toBe(1);
      expect(await store.listOutbox()).toHaveLength(0);
    } finally {
      globalThis.indexedDB = original;
    }
  });

  it('memory store marks rejected operations without retrying them', async () => {
    const store = new MemoryStore();
    await store.addNote('x');
    const s = await new SyncEngine(
      store,
      async (ops) => ({
        source: 'mock',
        results: ops.map((o) => ({
          operationId: o.operationId,
          status: 'rejected' as const,
          serverVersion: null,
          error: 'conflict',
        })),
      }),
      undefined,
    ).syncNow();
    expect(s.rejected).toBe(1);
    expect((await store.listOutbox())[0]?.status).toBe('rejected');
  });
});

describe('sync engine concurrency', () => {
  it('re-runs when an operation is queued after a running sync already read an empty outbox', async () => {
    const store = new MemoryStore();
    const server = fakeServer();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const original = store.listOutbox.bind(store);
    let reads = 0;
    store.listOutbox = async () => {
      const snapshot = await original(); // empty on the first read
      reads += 1;
      if (reads === 1) await gate; // the running sync is "busy" after reading
      return snapshot;
    };
    const engine = new SyncEngine(store, server.push, undefined);
    const first = engine.syncNow(); // e.g. the sync triggered on app start
    await new Promise((r) => setTimeout(r, 0));
    await store.addNote('queued during run');
    const second = engine.syncNow(); // e.g. triggered by the save
    release();
    await first;
    await second;
    expect(server.seen.size).toBe(1);
    expect(await original()).toHaveLength(0);
  });
});
