import { describe, expect, it } from 'vitest';
import {
  HandwritingRecognitionRequestSchema,
  InkRecognitionRequestSchema,
  SyncPushRequestSchema,
  looksLikePdf,
  LearningEventEnvelopeSchema,
  QUIZ_TYPE_IDS,
  QUIZ_TYPE_SKILL,
  SKILLS,
} from './index.js';

describe('quiz type contract (D-002, D-007)', () => {
  it('declares exactly the six PRD quiz types, without duplicates', () => {
    expect(QUIZ_TYPE_IDS).toEqual([
      'meaning_recognition',
      'hanzi_recognition',
      'pinyin_matching',
      'audio_recognition',
      'dictation',
      'handwriting',
    ]);
    expect(new Set(QUIZ_TYPE_IDS).size).toBe(6);
  });

  it('maps every quiz type to a known skill', () => {
    for (const id of QUIZ_TYPE_IDS) {
      expect(SKILLS).toContain(QUIZ_TYPE_SKILL[id]);
    }
    expect(QUIZ_TYPE_SKILL.handwriting).toBe('writing');
    expect(QUIZ_TYPE_SKILL.hanzi_recognition).toBe('meaning');
    expect(QUIZ_TYPE_SKILL.dictation).toBe('listening');
  });

  it('has exactly four skills', () => {
    expect(SKILLS).toEqual(['meaning', 'writing', 'listening', 'speaking']);
  });
});

describe('ink contract', () => {
  it('rejects empty stroke sets and non-finite coordinates', () => {
    expect(
      InkRecognitionRequestSchema.safeParse({ languageTag: 'zh-Hani-CN', strokes: [] }).success,
    ).toBe(false);
    expect(
      InkRecognitionRequestSchema.safeParse({
        languageTag: 'zh-Hani-CN',
        strokes: [{ points: [{ x: Number.NaN, y: 0, t: 0 }] }],
      }).success,
    ).toBe(false);
  });
});

describe('learning event envelope', () => {
  it('accepts a well-formed event and rejects a bad event type', () => {
    const ok = {
      id: '0b6f8f4e-5d3a-4c1e-9f7a-2b1c3d4e5f60',
      userId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      eventType: 'quiz.attempt_recorded',
      eventVersion: 1,
      occurredAt: '2026-11-23T10:00:00+07:00',
      idempotencyKey: 'device-1:op-000001',
      payload: {},
    };
    expect(LearningEventEnvelopeSchema.safeParse(ok).success).toBe(true);
    expect(LearningEventEnvelopeSchema.safeParse({ ...ok, eventType: 'XP!' }).success).toBe(false);
  });
});

describe('handwriting contract (D-029)', () => {
  it('applies defaults and caps total points', () => {
    const ok = HandwritingRecognitionRequestSchema.parse({ strokes: [{ points: [{ x: 1, y: 1, t: 0 }] }] });
    expect(ok.limit).toBe(8);
    expect(ok.pointerType).toBe('unknown');
    const many = { strokes: [{ points: Array.from({ length: 4001 }, (_, i) => ({ x: i, y: 0, t: i })) }] };
    expect(HandwritingRecognitionRequestSchema.safeParse(many).success).toBe(false);
  });
});

describe('sync contract (D-021)', () => {
  const op = {
    operationId: '01JD8Z6Q9K2V4N7P3R5T8W1Y0A',
    deviceId: 'device-12345678',
    entityType: 'spike_note',
    opType: 'create',
    schemaVersion: 1,
    logicalClock: 1,
    occurredAt: '2026-11-23T10:00:00+07:00',
    payload: { text: '山' },
  };
  it('accepts a batch and rejects bad ids / oversize batches', () => {
    expect(SyncPushRequestSchema.safeParse({ operations: [op] }).success).toBe(true);
    expect(SyncPushRequestSchema.safeParse({ operations: [{ ...op, operationId: 'x' }] }).success).toBe(false);
    expect(SyncPushRequestSchema.safeParse({ operations: Array(101).fill(op) }).success).toBe(false);
  });
});

describe('pdf signature', () => {
  it('detects %PDF- magic bytes', () => {
    expect(looksLikePdf(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true);
    expect(looksLikePdf(Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c]))).toBe(false);
  });
});
