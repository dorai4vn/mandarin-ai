import type { SyncOperation } from '@mandarin/contracts';
import { describe, expect, it } from 'vitest';
import { applyVocabularyOp, findDuplicate, type VocabularyItem } from './projection.js';

const fields = {
  simplified: '山',
  traditional: null,
  pinyin: 'shān',
  meaningVi: 'núi',
  example: null,
  notes: null,
  tags: [],
};
let clock = 0;
const op = (
  opType: SyncOperation['opType'],
  payload: Record<string, unknown>,
  at: string,
  deviceId = 'device-aaaaaaaa',
): SyncOperation => ({
  operationId: `op-${String(++clock).padStart(20, '0')}`,
  deviceId,
  entityType: 'vocabulary_item',
  opType,
  schemaVersion: 1,
  logicalClock: clock,
  occurredAt: at,
  payload,
});
const addition = (key: string, lessonId: string | null = null) => ({
  key,
  studyDate: '2026-11-25',
  method: lessonId ? ('lesson' as const) : ('manual' as const),
  lessonId,
  courseId: null,
});
const ID = 'vocab-0001-aaaa';
const create = (at: string) =>
  op('create', { id: ID, lexemeId: 'lx-shan', fields, addition: addition('manual:1') }, at);

function fold(ops: SyncOperation[]) {
  return ops.reduce<VocabularyItem | undefined>((item, o) => applyVocabularyOp(item, o), undefined);
}

describe('personal vocabulary projection (D-043)', () => {
  it('creates, updates per field and records additions without duplicates', () => {
    const item = fold([
      create('2026-11-25T10:00:00Z'),
      op('update', { id: ID, fields: { notes: 'chữ tượng hình' } }, '2026-11-25T10:01:00Z'),
      op('event', { id: ID, addition: addition('lesson:l1', 'l1') }, '2026-11-25T10:02:00Z'),
      op('event', { id: ID, addition: addition('lesson:l1', 'l1') }, '2026-11-25T10:03:00Z'),
    ])!;
    expect(item.notes).toBe('chữ tượng hình');
    expect(item.meaningVi).toBe('núi');
    expect(item.additions.map((a) => a.key)).toEqual(['lesson:l1', 'manual:1']);
    expect(item.updatedAt).toBe('2026-11-25T10:02:00.000Z');
  });

  it('converges whatever the order in which devices receive the operations', () => {
    const c = create('2026-11-25T10:00:00Z');
    const phone = op(
      'update',
      { id: ID, fields: { notes: 'từ điện thoại' } },
      '2026-11-25T10:05:00Z',
      'device-phone-01',
    );
    const laptop = op(
      'update',
      { id: ID, fields: { notes: 'từ máy tính', tags: ['HSK1'] } },
      '2026-11-25T10:04:00Z',
      'device-laptop-1',
    );
    const a = fold([c, phone, laptop])!;
    const b = fold([c, laptop, phone])!;
    expect(a.notes).toBe('từ điện thoại'); // later write wins
    expect(a.tags).toEqual(['HSK1']); // untouched by the later write
    expect({ ...a, stamps: null }).toEqual({ ...b, stamps: null });
    // Re-applying an operation changes nothing (exactly-once effect even if seen twice).
    expect(applyVocabularyOp(a, phone)).toBe(a);
  });

  it('delete is a tombstone that also follows last-writer-wins', () => {
    const del = op('delete', { id: ID }, '2026-11-25T11:00:00Z');
    const earlierEdit = op('update', { id: ID, fields: { notes: 'cũ' } }, '2026-11-25T10:30:00Z');
    const item = fold([create('2026-11-25T10:00:00Z'), del, earlierEdit])!;
    expect(item.deleted).toBe(true);
    expect(item.notes).toBe('cũ');
  });

  it('ignores invalid payloads, other entities and operations for unknown items', () => {
    expect(
      fold([op('update', { id: ID, fields: { notes: 'x' } }, '2026-11-25T10:00:00Z')]),
    ).toBeUndefined();
    expect(fold([op('create', { id: ID }, '2026-11-25T10:00:00Z')])).toBeUndefined();
    const other = { ...create('2026-11-25T10:00:00Z'), entityType: 'spike_note' };
    expect(fold([other])).toBeUndefined();
  });

  it('finds duplicates by shared lexeme or by Hanzi + pinyin ignoring tones', () => {
    const item = fold([create('2026-11-25T10:00:00Z')])!;
    expect(findDuplicate([item], { lexemeId: 'lx-shan', simplified: '岳', pinyin: 'yue4' })).toBe(
      item,
    );
    expect(findDuplicate([item], { lexemeId: null, simplified: '山', pinyin: 'shan1' })).toBe(item);
    expect(findDuplicate([item], { lexemeId: null, simplified: '山', pinyin: 'shàn' })).toBe(item);
    expect(
      findDuplicate([item], { lexemeId: null, simplified: '水', pinyin: 'shui3' }),
    ).toBeUndefined();
    expect(
      findDuplicate([{ ...item, deleted: true }], {
        lexemeId: 'lx-shan',
        simplified: '山',
        pinyin: 'shan',
      }),
    ).toBeUndefined();
  });
});
