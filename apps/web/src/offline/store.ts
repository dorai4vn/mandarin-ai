import {
  LEARNING_EVENT_ENTITY,
  LearningEventPayloadSchema,
  QUIZ_ATTEMPT_ENTITY,
  VOCABULARY_ENTITY,
  type ContentSnapshot,
  type LearningEventPayload,
  type QuizAttemptPayload,
  type PulledSyncOperation,
  type SyncOperation,
} from '@mandarin/contracts';
import {
  applyVocabularyOp,
  attemptFromOp,
  cardKey,
  foldCard,
  type OutboxEntry,
  type QuizSessionState,
  type ReviewCard,
  type StoredAttempt,
  type Reconciliation,
  type VocabularyItem,
} from '@mandarin/domain';
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
  /** Highest server_seq already pulled (bidirectional sync, M1). */
  pullCursor(): Promise<number>;
  /** Applies operations pulled from the server (idempotent) and advances the cursor atomically. */
  applyPulled(ops: PulledSyncOperation[], cursor: number): Promise<void>;
  /** Personal vocabulary (projection of the account's operations, D-043), including tombstones. */
  listVocabulary(): Promise<VocabularyItem[]>;
  /**
   * Records a vocabulary operation made on this device: projection + outbox row in ONE
   * transaction (D-021). Returns the updated item.
   */
  recordVocabulary(
    opType: SyncOperation['opType'],
    payload: Record<string, unknown>,
    now?: Date,
  ): Promise<VocabularyItem | undefined>;
  /** Cached shared content snapshot (offline reading, M2). */
  getContent(): Promise<ContentSnapshot | null>;
  putContent(snapshot: ContentSnapshot): Promise<void>;
  /**
   * Records one quiz answer made on this device (M3): the attempt, its `quiz.answered` event, the
   * updated review card and two outbox rows in ONE transaction. Idempotent by attempt id: a repeat
   * changes nothing and returns the current card.
   */
  recordAttempt(attempt: QuizAttemptPayload, now?: Date): Promise<ReviewCard | undefined>;
  /** Records a learning event (session started/completed…); a repeated id is a no-op. */
  recordLearningEvent(event: LearningEventPayload, now?: Date): Promise<boolean>;
  /** Every review card (recall, home counters). */
  listCards(): Promise<ReviewCard[]>;
  /**
   * Cards of `skill` due on/before `today`, oldest first — uses the `due` index. Only cards whose
   * word is live in this account's vocabulary count; orphans are filtered before `limit`.
   */
  dueCards(today: string, skill: string, limit: number): Promise<ReviewCard[]>;
  /** Count of due cards (same orphan rule as `dueCards`) without loading them. */
  countDue(today: string, skill: string): Promise<number>;
  /** Ids of words that already have a card for `skill`. */
  cardedItemIds(skill: string): Promise<Set<string>>;
  listAttempts(sessionId: string): Promise<StoredAttempt[]>;
  countEvents(): Promise<number>;
  /** The session in progress (resume after reload) — one per account. */
  getSession(): Promise<QuizSessionState | null>;
  putSession(session: QuizSessionState): Promise<void>;
  clearSession(): Promise<void>;
  /** Releases the database (account switch). */
  close(): void;
  /** Closes and permanently deletes this account's local data (sign-out, D-042). */
  destroy(): Promise<void>;
}

/** Name of an account's local database: never shared between accounts (D-042). */
export const localDbName = (userId: string) => `mandarin-ai:${userId}`;

/** Deletes an account's local database even if it is not open in this tab (sign-out). */
export async function deleteLocalDb(userId: string): Promise<void> {
  if (typeof indexedDB === 'undefined' || indexedDB === null) return;
  await Dexie.delete(localDbName(userId));
}

/** Notes carried by a pulled `spike_note` create (other entity types arrive in later milestones). */
function pulledNotes(ops: PulledSyncOperation[]): SpikeNote[] {
  return ops.flatMap((op) => {
    const { id, text } = op.payload as { id?: unknown; text?: unknown };
    return op.entityType === 'spike_note' &&
      op.opType === 'create' &&
      typeof id === 'string' &&
      typeof text === 'string'
      ? [{ id, text, createdAt: op.occurredAt }]
      : [];
  });
}

const newId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}-0000`;

function entityOp(
  entityType: string,
  deviceId: string,
  clock: number,
  opType: SyncOperation['opType'],
  payload: Record<string, unknown>,
  now: Date,
): SyncOperation {
  return {
    operationId: newId(),
    deviceId,
    entityType,
    opType,
    schemaVersion: 1,
    logicalClock: clock,
    occurredAt: now.toISOString(),
    payload,
  };
}

const vocabOp = (
  deviceId: string,
  clock: number,
  opType: SyncOperation['opType'],
  payload: Record<string, unknown>,
  now: Date,
) => entityOp(VOCABULARY_ENTITY, deviceId, clock, opType, payload, now);

/** The attempt operation and its `quiz.answered` event operation (two outbox rows). */
function attemptOps(deviceId: string, clock: number, a: QuizAttemptPayload, now: Date) {
  const attemptOp = entityOp(QUIZ_ATTEMPT_ENTITY, deviceId, clock, 'create', { ...a }, now);
  const event: LearningEventPayload = {
    id: `${a.id}:answered`,
    eventType: 'quiz.answered',
    eventVersion: 1,
    sessionId: a.sessionId,
    data: {
      attemptId: a.id,
      vocabularyItemId: a.vocabularyItemId,
      skill: a.skill,
      quizType: a.quizType,
      correct: a.correct,
    },
  };
  const eventOp = entityOp(LEARNING_EVENT_ENTITY, deviceId, clock + 1, 'event', { ...event }, now);
  return { attemptOp, eventOp, event };
}

/** Learning events carried by pulled operations. */
function pulledEvents(ops: PulledSyncOperation[]): LearningEventPayload[] {
  return ops.flatMap((op) => {
    if (op.entityType !== LEARNING_EVENT_ENTITY) return [];
    const p = LearningEventPayloadSchema.safeParse(op.payload);
    return p.success ? [p.data] : [];
  });
}

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
  vocab!: Table<VocabularyItem, string>;
  content!: Table<{ key: string; snapshot: ContentSnapshot }, string>;
  attempts!: Table<StoredAttempt, string>;
  cards!: Table<ReviewCard, string>;
  events!: Table<LearningEventPayload, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      notes: 'id, createdAt',
      outbox: 'operationId, logicalClock, status',
      meta: 'key',
    });
    // M2: personal vocabulary projection + cached shared content.
    this.version(2).stores({ vocab: 'id, updatedAt', content: 'key' });
    // M3: attempts, per-skill review cards (indexed by due day), learning events.
    this.version(3).stores({
      attempts: 'id, cardKey, sessionId',
      cards: 'key, [skill+due], skill',
      events: 'id',
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

  async pullCursor() {
    return ((await this.db.meta.get('pullCursor'))?.value as number | undefined) ?? 0;
  }

  async applyPulled(ops: PulledSyncOperation[], cursor: number) {
    const db = this.db;
    await db.transaction(
      'rw',
      [db.notes, db.vocab, db.meta, db.attempts, db.cards, db.events],
      async () => {
        // put: the same note (same id) arriving again — e.g. our own operation — is a no-op.
        await this.db.notes.bulkPut(pulledNotes(ops));
        const touched = new Set<string>();
        for (const op of ops) {
          const a = attemptFromOp(op);
          if (a && !(await this.db.attempts.get(a.id))) {
            await this.db.attempts.put(a);
            touched.add(a.cardKey);
          }
        }
        for (const k of touched) await this.refoldCard(k);
        for (const e of pulledEvents(ops)) await this.db.events.put(e);
        for (const op of ops) {
          if (op.entityType !== VOCABULARY_ENTITY) continue;
          const id = (op.payload as { id?: unknown }).id;
          if (typeof id !== 'string') continue;
          const before = await this.db.vocab.get(id);
          const after = applyVocabularyOp(before, op);
          if (after && after !== before) await this.db.vocab.put(after);
        }
        await this.db.meta.put({ key: 'pullCursor', value: cursor });
      },
    );
  }

  /** The card is the fold of all its attempts (order-independent, replay-safe). */
  private async refoldCard(key: string) {
    const card = foldCard(await this.db.attempts.where('cardKey').equals(key).toArray());
    if (card) await this.db.cards.put(card);
  }

  async recordAttempt(attempt: QuizAttemptPayload, now = new Date()) {
    const db = this.db;
    const key = cardKey(attempt.vocabularyItemId, attempt.skill);
    await db.transaction('rw', [db.attempts, db.cards, db.events, db.outbox, db.meta], async () => {
      if (await db.attempts.get(attempt.id)) return; // replay: nothing to do
      const clock = (((await db.meta.get('clock'))?.value as number | undefined) ?? 0) + 1;
      await db.meta.put({ key: 'clock', value: clock + 1 });
      const { attemptOp, eventOp, event } = attemptOps(this.deviceId, clock, attempt, now);
      await db.attempts.put(attemptFromOp(attemptOp)!);
      await this.refoldCard(key);
      await db.events.put(event);
      for (const [op, c] of [
        [attemptOp, clock],
        [eventOp, clock + 1],
      ] as const)
        await db.outbox.add({
          op,
          operationId: op.operationId,
          logicalClock: c,
          status: 'pending',
          attempts: 0,
          lastError: null,
        });
    });
    return db.cards.get(key);
  }

  async recordLearningEvent(event: LearningEventPayload, now = new Date()) {
    const db = this.db;
    let recorded = false;
    await db.transaction('rw', [db.events, db.outbox, db.meta], async () => {
      if (await db.events.get(event.id)) return;
      const clock = (((await db.meta.get('clock'))?.value as number | undefined) ?? 0) + 1;
      await db.meta.put({ key: 'clock', value: clock });
      const op = entityOp(LEARNING_EVENT_ENTITY, this.deviceId, clock, 'event', { ...event }, now);
      await db.events.put(event);
      await db.outbox.add({
        op,
        operationId: op.operationId,
        logicalClock: clock,
        status: 'pending',
        attempts: 0,
        lastError: null,
      });
      recorded = true;
    });
    return recorded;
  }

  listCards() {
    return this.db.cards.toArray();
  }
  /** Ids of this account's live (non-deleted) words: the only words a card may be studied for. */
  private async liveItemIds() {
    const keys = await this.db.vocab.filter((v) => !v.deleted).primaryKeys();
    return new Set(keys);
  }
  async dueCards(today: string, skill: string, limit: number) {
    const live = await this.liveItemIds();
    // Orphans are filtered BEFORE the limit, so they can never push a valid card out of a session.
    return this.db.cards
      .where('[skill+due]')
      .between([skill, ''], [skill, today], true, true)
      .filter((c) => live.has(c.vocabularyItemId))
      .limit(limit)
      .toArray();
  }
  async countDue(today: string, skill: string) {
    const live = await this.liveItemIds();
    return this.db.cards
      .where('[skill+due]')
      .between([skill, ''], [skill, today], true, true)
      .filter((c) => live.has(c.vocabularyItemId))
      .count();
  }
  async cardedItemIds(skill: string) {
    const cards = await this.db.cards.where('skill').equals(skill).toArray();
    return new Set(cards.map((c) => c.vocabularyItemId));
  }
  listAttempts(sessionId: string) {
    return this.db.attempts.where('sessionId').equals(sessionId).toArray();
  }
  countEvents() {
    return this.db.events.count();
  }
  async getSession() {
    return ((await this.db.meta.get('quizSession'))?.value as QuizSessionState | undefined) ?? null;
  }
  async putSession(session: QuizSessionState) {
    await this.db.meta.put({ key: 'quizSession', value: session as never });
  }
  async clearSession() {
    await this.db.meta.delete('quizSession');
  }

  listVocabulary() {
    return this.db.vocab.toArray();
  }

  async recordVocabulary(
    opType: SyncOperation['opType'],
    payload: Record<string, unknown>,
    now = new Date(),
  ) {
    let result: VocabularyItem | undefined;
    await this.db.transaction('rw', this.db.vocab, this.db.outbox, this.db.meta, async () => {
      const clock = (((await this.db.meta.get('clock'))?.value as number | undefined) ?? 0) + 1;
      await this.db.meta.put({ key: 'clock', value: clock });
      const op = vocabOp(this.deviceId, clock, opType, payload, now);
      const id = String(payload.id);
      const before = await this.db.vocab.get(id);
      result = applyVocabularyOp(before, op);
      if (!result || result === before) throw new Error('vocabulary operation had no effect');
      await this.db.vocab.put(result);
      await this.db.outbox.add({
        op,
        operationId: op.operationId,
        logicalClock: clock,
        status: 'pending',
        attempts: 0,
        lastError: null,
      });
    });
    return result;
  }

  async getContent() {
    return (await this.db.content.get('shared'))?.snapshot ?? null;
  }

  async putContent(snapshot: ContentSnapshot) {
    await this.db.content.put({ key: 'shared', snapshot });
  }

  close() {
    this.db.close();
  }

  async destroy() {
    this.db.close();
    await Dexie.delete(this.db.name);
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
  private cursor = 0;
  async pullCursor() {
    return this.cursor;
  }
  private vocab = new Map<string, VocabularyItem>();
  private content: ContentSnapshot | null = null;
  async listVocabulary() {
    return [...this.vocab.values()];
  }
  async recordVocabulary(
    opType: SyncOperation['opType'],
    payload: Record<string, unknown>,
    now = new Date(),
  ) {
    this.clock += 1;
    const op = vocabOp(this.deviceId, this.clock, opType, payload, now);
    const id = String(payload.id);
    const before = this.vocab.get(id);
    const after = applyVocabularyOp(before, op);
    if (!after || after === before) throw new Error('vocabulary operation had no effect');
    this.vocab.set(id, after);
    this.outbox.push({ op, status: 'pending', attempts: 0, lastError: null });
    return after;
  }
  async getContent() {
    return this.content;
  }
  async putContent(snapshot: ContentSnapshot) {
    this.content = snapshot;
  }
  async applyPulled(ops: PulledSyncOperation[], cursor: number) {
    for (const op of ops) {
      if (op.entityType !== VOCABULARY_ENTITY) continue;
      const id = (op.payload as { id?: unknown }).id;
      if (typeof id !== 'string') continue;
      const after = applyVocabularyOp(this.vocab.get(id), op);
      if (after) this.vocab.set(id, after);
    }
    const touched = new Set<string>();
    for (const op of ops) {
      const a = attemptFromOp(op);
      if (a && !this.attempts.has(a.id)) {
        this.attempts.set(a.id, a);
        touched.add(a.cardKey);
      }
    }
    touched.forEach((k) => this.refold(k));
    for (const e of pulledEvents(ops)) this.events.set(e.id, e);
    const known = new Set(this.notes.map((n) => n.id));
    for (const n of pulledNotes(ops)) if (!known.has(n.id)) this.notes.unshift(n);
    this.notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this.cursor = cursor;
  }
  private attempts = new Map<string, StoredAttempt>();
  private cards = new Map<string, ReviewCard>();
  private events = new Map<string, LearningEventPayload>();
  private session: QuizSessionState | null = null;
  private refold(key: string) {
    const card = foldCard([...this.attempts.values()].filter((a) => a.cardKey === key));
    if (card) this.cards.set(key, card);
  }
  async recordAttempt(attempt: QuizAttemptPayload, now = new Date()) {
    const key = cardKey(attempt.vocabularyItemId, attempt.skill);
    if (this.attempts.has(attempt.id)) return this.cards.get(key);
    const clock = this.clock + 1;
    this.clock += 2;
    const { attemptOp, eventOp, event } = attemptOps(this.deviceId, clock, attempt, now);
    this.attempts.set(attempt.id, attemptFromOp(attemptOp)!);
    this.refold(key);
    this.events.set(event.id, event);
    this.outbox.push(
      { op: attemptOp, status: 'pending', attempts: 0, lastError: null },
      { op: eventOp, status: 'pending', attempts: 0, lastError: null },
    );
    return this.cards.get(key);
  }
  async recordLearningEvent(event: LearningEventPayload, now = new Date()) {
    if (this.events.has(event.id)) return false;
    this.clock += 1;
    this.events.set(event.id, event);
    this.outbox.push({
      op: entityOp(LEARNING_EVENT_ENTITY, this.deviceId, this.clock, 'event', { ...event }, now),
      status: 'pending',
      attempts: 0,
      lastError: null,
    });
    return true;
  }
  async listCards() {
    return [...this.cards.values()];
  }
  private isLive(c: ReviewCard) {
    const v = this.vocab.get(c.vocabularyItemId);
    return !!v && !v.deleted;
  }
  async dueCards(today: string, skill: string, limit: number) {
    return [...this.cards.values()]
      .filter((c) => c.skill === skill && c.due <= today && this.isLive(c))
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, limit);
  }
  async countDue(today: string, skill: string) {
    return [...this.cards.values()].filter(
      (c) => c.skill === skill && c.due <= today && this.isLive(c),
    ).length;
  }
  async cardedItemIds(skill: string) {
    return new Set(
      [...this.cards.values()].filter((c) => c.skill === skill).map((c) => c.vocabularyItemId),
    );
  }
  async listAttempts(sessionId: string) {
    return [...this.attempts.values()].filter((a) => a.sessionId === sessionId);
  }
  async countEvents() {
    return this.events.size;
  }
  async getSession() {
    return this.session;
  }
  async putSession(session: QuizSessionState) {
    this.session = session;
  }
  async clearSession() {
    this.session = null;
  }
  close() {}
  async destroy() {
    this.attempts.clear();
    this.cards.clear();
    this.events.clear();
    this.session = null;
    await this.clearAll();
    this.cursor = 0;
    this.vocab.clear();
    this.content = null;
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
