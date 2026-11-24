/**
 * Is cloud sync enabled on the server? (M0: Preview/production answer `sync: "disabled"` until the
 * Postgres sync store lands in M1, D-035.)
 *
 * Uses the existing, unauthenticated `GET /health` (`providers.sync`) — no backend contract change.
 * `/health` always answers 200, so probing never produces a red console error, unlike calling
 * `POST /v1/sync/push` and receiving 503. Results are cached so the 30 s sync timer does not hit
 * the network at all while sync is disabled.
 */
export type SyncAvailability = 'available' | 'disabled' | 'unknown';

export interface HealthLike {
  providers: { sync: 'live' | 'mock' | 'disabled' };
}

export interface SyncAvailabilityOptions {
  /** Development/E2E builds accept the in-memory MOCK sync server (NEXT_PUBLIC_ALLOW_MOCK_SYNC). */
  acceptMock: boolean;
  /** Re-check interval once a definite answer is known. */
  ttlMs?: number;
  /** Re-check interval after the probe itself failed (network down, API unreachable). */
  unknownRetryMs?: number;
  now?: () => number;
}

export class SyncAvailabilityProbe {
  private state: SyncAvailability = 'unknown';
  private checkedAt = Number.NEGATIVE_INFINITY;
  private inflight: Promise<SyncAvailability> | null = null;
  private readonly ttlMs: number;
  private readonly unknownRetryMs: number;
  private readonly now: () => number;
  private readonly listeners = new Set<(s: SyncAvailability) => void>();

  constructor(
    private readonly health: () => Promise<HealthLike>,
    private readonly options: SyncAvailabilityOptions,
  ) {
    this.ttlMs = options.ttlMs ?? 10 * 60_000;
    this.unknownRetryMs = options.unknownRetryMs ?? 60_000;
    this.now = options.now ?? Date.now;
  }

  get current(): SyncAvailability {
    return this.state;
  }

  onChange(listener: (s: SyncAvailability) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Cached answer unless stale or `force` (manual "sync now", back online). One probe at a time. */
  check(force = false): Promise<SyncAvailability> {
    const maxAge = this.state === 'unknown' ? this.unknownRetryMs : this.ttlMs;
    if (!force && this.now() - this.checkedAt < maxAge) return Promise.resolve(this.state);
    this.inflight ??= this.probe().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** The server answered "not available" to a push (e.g. 503 provider_unavailable). */
  markUnavailable(): void {
    this.set('disabled');
  }

  private async probe(): Promise<SyncAvailability> {
    let next: SyncAvailability;
    try {
      const sync = (await this.health()).providers.sync;
      next =
        sync === 'live' || (sync === 'mock' && this.options.acceptMock) ? 'available' : 'disabled';
    } catch {
      next = 'unknown';
    }
    this.set(next);
    return next;
  }

  private set(next: SyncAvailability) {
    this.checkedAt = this.now();
    if (next === this.state) return;
    this.state = next;
    for (const l of this.listeners) l(next);
  }
}
