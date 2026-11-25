import {
  VOCABULARY_ENTITY,
  VocabularyAdditionPayloadSchema,
  VocabularyCreatePayloadSchema,
  VocabularyDeletePayloadSchema,
  VocabularyUpdatePayloadSchema,
  type SyncOperation,
  type VocabularyAddition,
  type VocabularyFields,
} from '@mandarin/contracts';
import { pinyinKey } from '../dictionary/search.js';

/**
 * Personal vocabulary as a projection of the learner's own operations (D-043). Every device applies
 * the same operations (its own immediately, others' after a pull) and converges: each field keeps
 * the value with the highest stamp (last writer wins), additions are a set keyed by `key`, and a
 * delete is a tombstone that also follows last-writer-wins.
 */
export type FieldName = keyof VocabularyFields | 'deleted';

export interface VocabularyItem extends VocabularyFields {
  id: string;
  lexemeId: string | null;
  additions: VocabularyAddition[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  /** Stamp of the operation that last set each field. */
  stamps: Partial<Record<FieldName, string>>;
}

/** Total order of operations: time, then device, then the device's own counter. */
export function opStamp(op: Pick<SyncOperation, 'occurredAt' | 'deviceId' | 'logicalClock'>) {
  return `${new Date(op.occurredAt).toISOString()}|${op.deviceId}|${String(op.logicalClock).padStart(12, '0')}`;
}

const FIELDS: (keyof VocabularyFields)[] = [
  'simplified',
  'traditional',
  'pinyin',
  'meaningVi',
  'example',
  'notes',
  'tags',
];

const cloneItem = (i: VocabularyItem): VocabularyItem => ({
  ...i,
  tags: [...i.tags],
  additions: [...i.additions],
  stamps: { ...i.stamps },
});

function setField<K extends FieldName>(
  item: VocabularyItem,
  name: K,
  value: K extends keyof VocabularyFields ? VocabularyFields[K] : boolean,
  stamp: string,
): boolean {
  const current = item.stamps[name];
  if (current && current >= stamp) return false;
  (item as unknown as Record<string, unknown>)[name] = value;
  item.stamps[name] = stamp;
  return true;
}

function addAddition(item: VocabularyItem, addition: VocabularyAddition): boolean {
  if (item.additions.some((a) => a.key === addition.key)) return false;
  item.additions = [...item.additions, addition].sort((a, b) =>
    a.studyDate === b.studyDate
      ? a.key.localeCompare(b.key)
      : a.studyDate.localeCompare(b.studyDate),
  );
  return true;
}

/**
 * Applies one operation to the current item (undefined if unknown). Returns the new item, or the
 * same object when nothing changed; unknown/invalid operations are ignored (never throw on data
 * from the server).
 */
export function applyVocabularyOp(
  current: VocabularyItem | undefined,
  op: SyncOperation,
): VocabularyItem | undefined {
  if (op.entityType !== VOCABULARY_ENTITY) return current;
  const stamp = opStamp(op);
  const at = new Date(op.occurredAt).toISOString();
  const touch = (item: VocabularyItem) => {
    if (at > item.updatedAt) item.updatedAt = at;
    return item;
  };

  if (op.opType === 'create') {
    const p = VocabularyCreatePayloadSchema.safeParse(op.payload);
    if (!p.success) return current;
    const item: VocabularyItem = current
      ? cloneItem(current)
      : {
          id: p.data.id,
          lexemeId: p.data.lexemeId,
          ...p.data.fields,
          additions: [],
          deleted: false,
          createdAt: at,
          updatedAt: at,
          stamps: {},
        };
    if (!current) {
      for (const f of FIELDS) item.stamps[f] = stamp;
      item.stamps.deleted = stamp;
    } else {
      for (const f of FIELDS) setField(item, f, p.data.fields[f] as never, stamp);
      setField(item, 'deleted', false, stamp);
      if (at < item.createdAt) item.createdAt = at;
    }
    addAddition(item, p.data.addition);
    return touch(item);
  }
  if (!current) return current; // update/addition/delete for an item this device never saw

  if (op.opType === 'update') {
    const p = VocabularyUpdatePayloadSchema.safeParse(op.payload);
    if (!p.success || p.data.id !== current.id) return current;
    const item = cloneItem(current);
    let changed = false;
    for (const f of FIELDS)
      if (f in p.data.fields)
        changed = setField(item, f, p.data.fields[f] as never, stamp) || changed;
    return changed ? touch(item) : current;
  }
  if (op.opType === 'event') {
    const p = VocabularyAdditionPayloadSchema.safeParse(op.payload);
    if (!p.success || p.data.id !== current.id) return current;
    const item = cloneItem(current);
    return addAddition(item, p.data.addition) ? touch(item) : current;
  }
  if (op.opType === 'delete') {
    const p = VocabularyDeletePayloadSchema.safeParse(op.payload);
    if (!p.success || p.data.id !== current.id) return current;
    const item = cloneItem(current);
    return setField(item, 'deleted', true, stamp) ? touch(item) : current;
  }
  return current;
}

/**
 * The personal entry that a new word duplicates, if any (PRD-01: link, never duplicate): same
 * shared lexeme, or same Hanzi + same pinyin (ignoring tones/spacing).
 */
export function findDuplicate(
  items: Iterable<VocabularyItem>,
  word: { lexemeId: string | null; simplified: string; pinyin: string },
): VocabularyItem | undefined {
  const key = pinyinKey(word.pinyin);
  for (const item of items) {
    if (item.deleted) continue;
    if (word.lexemeId && item.lexemeId === word.lexemeId) return item;
    if (item.simplified === word.simplified.trim() && pinyinKey(item.pinyin) === key) return item;
  }
  return undefined;
}
