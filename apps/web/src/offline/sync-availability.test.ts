import 'fake-indexeddb/auto';
import type { SyncOperation, SyncPushResponse } from '@mandarin/contracts';
import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from './store';
import { SyncEngine, type SyncGate } from './sync';
import { SyncAvailabilityProbe, type HealthLike } from './sync-availability';

const health = (sync: HealthLike['providers']['sync']) => async (): Promise<HealthLike> => ({
  providers: { sync },
});

class Unavailable503 extends Error {
  readonly status = 503;
  readonly code = 'provider_unavailable';
}

function liveServer() {
  const push = vi.fn(async (ops: SyncOperation[]): Promise<SyncPushResponse> => ({
    source: 'live',
    results: ops.map((o) => ({
      operationId: o.operationId,
      status: 'applied',
      serverVersion: 1,
      error: null,
    })),
  }));
  return push;
}

function gateFor(probe: SyncAvailabilityProbe): SyncGate {
  return {
    check: (force) => probe.check(force),
    markUnavailable: () => probe.markUnavailable(),
    isUnavailableError: (e) => e instanceof Unavailable503,
  };
}

describe('SyncAvailabilityProbe (GET /health → providers.sync)', () => {
  it('maps live → available, disabled → disabled, mock → available only in dev/E2E', async () => {
    expect(await new SyncAvailabilityProbe(health('live'), { acceptMock: false }).check()).toBe(
      'available',
    );
    expect(await new SyncAvailabilityProbe(health('disabled'), { acceptMock: true }).check()).toBe(
      'disabled',
    );
    expect(await new SyncAvailabilityProbe(health('mock'), { acceptMock: false }).check()).toBe(
      'disabled',
    );
    expect(await new SyncAvailabilityProbe(health('mock'), { acceptMock: true }).check()).toBe(
      'available',
    );
  });

  it('caches the answer (no request per 30 s tick) and re-checks when forced or stale', async () => {
    let now = 0;
    const h = vi.fn(health('disabled'));
    const p = new SyncAvailabilityProbe(h, { acceptMock: false, ttlMs: 600_000, now: () => now });
    await p.check();
    now += 30_000;
    await p.check();
    expect(h).toHaveBeenCalledTimes(1);
    await p.check(true);
    expect(h).toHaveBeenCalledTimes(2);
    now += 600_001;
    await p.check();
    expect(h).toHaveBeenCalledTimes(3);
  });

  it('a failed probe is "unknown" and retried sooner; markUnavailable flips state', async () => {
    let now = 0;
    const h = vi.fn(async (): Promise<HealthLike> => {
      throw new Error('network');
    });
    const p = new SyncAvailabilityProbe(h, {
      acceptMock: false,
      unknownRetryMs: 60_000,
      now: () => now,
    });
    expect(await p.check()).toBe('unknown');
    now += 59_000;
    await p.check();
    expect(h).toHaveBeenCalledTimes(1);
    now += 2_000;
    await p.check();
    expect(h).toHaveBeenCalledTimes(2);
    const seen: string[] = [];
    p.onChange((s) => seen.push(s));
    p.markUnavailable();
    expect(p.current).toBe('disabled');
    expect(seen).toEqual(['disabled']);
  });
});

describe('SyncEngine with the availability gate (M0: server sync disabled)', () => {
  it('never pushes while sync is disabled and leaves the outbox untouched', async () => {
    const store = new MemoryStore();
    await store.addNote('học offline');
    const push = liveServer();
    const probe = new SyncAvailabilityProbe(health('disabled'), { acceptMock: false });
    const engine = new SyncEngine(store, push, undefined, false, gateFor(probe));
    for (let i = 0; i < 5; i++) {
      const s = await engine.syncNow();
      expect(s.error).toBe('sync_unavailable');
      expect(s.applied).toBe(0);
    }
    expect(push).not.toHaveBeenCalled();
    const outbox = await store.listOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('does not even probe when nothing is queued', async () => {
    const h = vi.fn(health('disabled'));
    const engine = new SyncEngine(
      new MemoryStore(),
      liveServer(),
      undefined,
      false,
      gateFor(new SyncAvailabilityProbe(h, { acceptMock: false })),
    );
    await engine.syncNow();
    expect(h).not.toHaveBeenCalled();
  });

  it('a 503 provider_unavailable push is remembered: one request, then none', async () => {
    const store = new MemoryStore();
    await store.addNote('a');
    const push = vi.fn(async (): Promise<SyncPushResponse> => {
      throw new Unavailable503('API 503: provider_unavailable');
    });
    // /health said live (e.g. stale) but the push endpoint answers 503.
    const probe = new SyncAvailabilityProbe(health('live'), { acceptMock: false });
    const engine = new SyncEngine(store, push, undefined, false, gateFor(probe));
    expect((await engine.syncNow()).error).toBe('sync_unavailable');
    await engine.syncNow();
    await engine.syncNow();
    expect(push).toHaveBeenCalledTimes(1);
    expect(probe.current).toBe('disabled');
    expect((await store.listOutbox())[0]).toMatchObject({ status: 'pending' });
  });

  it('when the network is down the probe is unknown and nothing is pushed or lost', async () => {
    const store = new MemoryStore();
    await store.addNote('offline');
    const push = liveServer();
    const probe = new SyncAvailabilityProbe(
      async () => {
        throw new TypeError('Failed to fetch');
      },
      { acceptMock: false },
    );
    const s = await new SyncEngine(store, push, undefined, false, gateFor(probe)).syncNow();
    expect(s.error).toBe('sync_status_unknown');
    expect(push).not.toHaveBeenCalled();
    expect(await store.listOutbox()).toHaveLength(1);
  });

  it('when sync is enabled again, a forced check resumes and the queued data is sent once', async () => {
    const store = new MemoryStore();
    await store.addNote('chờ đồng bộ');
    let sync: HealthLike['providers']['sync'] = 'disabled';
    const probe = new SyncAvailabilityProbe(async () => ({ providers: { sync } }), {
      acceptMock: false,
    });
    const push = liveServer();
    const engine = new SyncEngine(store, push, undefined, false, gateFor(probe));
    expect((await engine.syncNow()).error).toBe('sync_unavailable');
    sync = 'live';
    // Cached "disabled" is respected until the user/online event forces a re-check.
    expect((await engine.syncNow()).error).toBe('sync_unavailable');
    const s = await engine.syncNow({ force: true });
    expect(s).toMatchObject({ applied: 1, error: null, source: 'live' });
    expect(push).toHaveBeenCalledTimes(1);
    expect(await store.listOutbox()).toHaveLength(0);
  });
});
