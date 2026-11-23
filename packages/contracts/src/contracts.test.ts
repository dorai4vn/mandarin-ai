import { describe, expect, it } from 'vitest';
import {
  InkRecognitionRequestSchema,
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
