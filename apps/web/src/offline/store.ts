import type { SyncOperation } from '@mandarin/contracts';
import type { OutboxEntry, Reconciliation } from '@mandarin/domain';
import Dexie, { type Table } from 'dexie';

/** Demo entity for the M0 offline spike; real entities (attempts, notes) arrive in M1–M3. */
export interface SpikeNote {
  id: string;
  text: string;
  createdAt: string;
}

interface OutboxRow extends OutboxEntry {
  operationId: string;
  logicalClock: number;
}

/**
 * Local store used by the UI. Two implementations: IndexedDB (persistent) and in-memory
 * fallback when IndexedDB is unavailable (e.g. some private-browsing modes) — D-021/D-028.
 */
export interface LocalStore {
  readonly kind: 'indexeddb' | 'memory';
  readonly deviceId: string;
  addNote(text: string, now?: Date): Promise<SpikeNote>;
  listNotes(): Promise<SpikeNote[]>;
  listOutbox(): Promise<OutboxEntry[]>;
  applyReconciliation(rec: Reconciliation): Promise<void>;
  recordFailure(operationIds: string[], error: string): Promise<void>;
  clearAll(): Promise<void>;
}

const newId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}-0000`;

function makeOp(deviceId: string, clock: number, note: SpikeNote): SyncOperation {
  return {
    operationId: newId(),
    deviceId,
    entityType: 'spike_note',
    opType: 'create',
    schemaVersion: 1,
    logicalClock: clock,
    occurredAt: note.createdAt,
    payload: { id: note.id, text: note.text },
  };
}

class MandarinDb extends Dexie {
  notes!: Table<SpikeNote, string>;
  outbox!: Table<OutboxRow, string>;
  meta!: Table<{ key: string; value: string | number }, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      notes: 'id, createdAt',
      outbox: 'operationId, logicalClock, status',
      meta: 'key',
    });
  }
}

export class IndexedDbStore implements LocalStore {
  readonly kind = 'indexeddb' as const;
  private constructor(
    private readonly db: MandarinDb,
    readonly deviceId: string,
  ) {}

  static async open(name = 'mandarin-ai'): Promise<IndexedDbStore> {
    const db = new MandarinDb(name);
    await db.open();
    let device = (await db.meta.get('deviceId'))?.value as string | undefined;
    if (!device) {
      device = `web-${newId()}`;
      await db.meta.put({ key: 'deviceId', value: device });
    }
    return new IndexedDbStore(db, device);
  }

  /** Entity row + outbox row in ONE transaction: either both persist or neither (D-021). */
  async addNote(text: string, now = new Date()): Promise<SpikeNote> {
    const note: SpikeNote = { id: newId(), text, createdAt: now.toISOString() };
    await this.db.transaction('rw', this.db.notes, this.db.outbox, this.db.meta, async () => {
      const clock = (((await this.db.meta.get('clock'))?.value as number | undefined) ?? 0) + 1;
      await this.db.meta.put({ key: 'clock', value: clock });
      const op = makeOp(this.deviceId, clock, note);
      await this.db.notes.add(note);
      await this.db.outbox.add({
        op,
        operationId: op.operationId,
        logicalClock: clock,
        status: 'pending',
        attempts: 0,
        lastError: null,
      });
    });
    return note;
  }

  listNotes() {
    return this.db.notes.orderBy('createdAt').reverse().toArray();
  }

  async listOutbox(): Promise<OutboxEntry[]> {
    return (await this.db.outbox.orderBy('logicalClock').toArray()).map(
      ({ op, status, attempts, lastError }) => ({ op, status, attempts, lastError }),
    );
  }

  async applyReconciliation(rec: Reconciliation) {
    await this.db.transaction('rw', this.db.outbox, async () => {
      await this.db.outbox.bulkDelete(rec.acknowledged);
      for (const r of rec.rejected)
        await this.db.outbox.update(r.operationId, { status: 'rejected', lastError: r.error });
      for (const id of rec.retry)
        await this.db.outbox
          .where('operationId')
          .equals(id)
          .modify((row) => void (row.attempts += 1));
    });
  }

  async recordFailure(operationIds: string[], error: string) {
    await this.db.outbox
      .where('operationId')
      .anyOf(operationIds)
      .modify((row) => {
        row.attempts += 1;
        row.lastError = error;
      });
  }

  async clearAll() {
    await this.db.transaction('rw', this.db.notes, this.db.outbox, async () => {
      await this.db.notes.clear();
      await this.db.outbox.clear();
    });
  }
}

/** Fallback: works for the session only; the UI says offline storage is unavailable. */
export class MemoryStore implements LocalStore {
  readonly kind = 'memory' as const;
  readonly deviceId = `web-mem-${newId()}`;
  private notes: SpikeNote[] = [];
  private outbox: OutboxEntry[] = [];
  private clock = 0;

  async addNote(text: string, now = new Date()) {
    const note: SpikeNote = { id: newId(), text, createdAt: now.toISOString() };
    this.clock += 1;
    this.notes.unshift(note);
    this.outbox.push({
      op: makeOp(this.deviceId, this.clock, note),
      status: 'pending',
      attempts: 0,
      lastError: null,
    });
    return note;
  }
  async listNotes() {
    return [...this.notes];
  }
  async listOutbox() {
    return this.outbox.map((e) => ({ ...e }));
  }
  async applyReconciliation(rec: Reconciliation) {
    const acked = new Set(rec.acknowledged);
    this.outbox = this.outbox.filter((e) => !acked.has(e.op.operationId));
    for (const r of rec.rejected) {
      const e = this.outbox.find((x) => x.op.operationId === r.operationId);
      if (e) Object.assign(e, { status: 'rejected', lastError: r.error });
    }
    for (const id of rec.retry) {
      const e = this.outbox.find((x) => x.op.operationId === id);
      if (e) e.attempts += 1;
    }
  }
  async recordFailure(ids: string[], error: string) {
    for (const e of this.outbox)
      if (ids.includes(e.op.operationId))
        Object.assign(e, { attempts: e.attempts + 1, lastError: error });
  }
  async clearAll() {
    this.notes = [];
    this.outbox = [];
  }
}

/** Opens IndexedDB when available and working; otherwise falls back to memory. Never throws. */
export async function openLocalStore(name?: string, timeoutMs = 4000): Promise<LocalStore> {
  if (typeof indexedDB === 'undefined' || indexedDB === null) return new MemoryStore();
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('IndexedDB open timeout')), timeoutMs),
    );
    return await Promise.race([IndexedDbStore.open(name), timeout]);
  } catch {
    return new MemoryStore();
  }
}
