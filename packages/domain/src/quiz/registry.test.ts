import { QUIZ_TYPE_IDS, QUIZ_TYPE_SKILL } from '@mandarin/contracts';
import { describe, expect, it } from 'vitest';
import { createDefaultQuizTypeRegistry, handwritingType, dictationType } from './builtin.js';
import { QuizTypeRegistry, type QuizTypeDefinition } from './registry.js';

describe('default QuizType registry', () => {
  it('contains exactly the six contract quiz types with matching skills', () => {
    const registry = createDefaultQuizTypeRegistry();
    const ids = registry.list().map((d) => d.id);
    expect(ids).toEqual([...QUIZ_TYPE_IDS]);
    for (const def of registry.list()) {
      expect(def.skill).toBe(QUIZ_TYPE_SKILL[def.id as keyof typeof QUIZ_TYPE_SKILL]);
    }
  });

  it('rejects duplicate id@version registrations', () => {
    const registry = createDefaultQuizTypeRegistry();
    expect(() => registry.register(handwritingType)).toThrow(/already registered/);
  });

  it('adds a new quiz type without touching existing graders (architecture probe 1)', () => {
    const registry = createDefaultQuizTypeRegistry();
    const before = registry.get('handwriting');
    const toneDrill: QuizTypeDefinition<{ tone: number }, { tone: number }> = {
      id: 'tone_drill',
      version: 1,
      skill: 'listening',
      parseAnswer: (input) => input as { tone: number },
      grade: (p, a) => ({ correct: p.tone === a.tone, reason: 'tone' }),
    };
    registry.register(toneDrill);
    expect(registry.list()).toHaveLength(7);
    expect(registry.get('handwriting')).toBe(before);
  });

  it('keeps old versions addressable for re-grading history', () => {
    const registry = new QuizTypeRegistry().register(dictationType);
    registry.register({ ...dictationType, version: 2 });
    expect(registry.get('dictation')?.version).toBe(2);
    expect(registry.get('dictation', 1)?.version).toBe(1);
  });
});

describe('graders', () => {
  const registry = createDefaultQuizTypeRegistry();

  it('choice types grade by option id', () => {
    const def = registry.get('hanzi_recognition')!;
    expect(def.grade({ correctOptionId: 'a' }, def.parseAnswer({ optionId: 'a' })).correct).toBe(
      true,
    );
    expect(def.grade({ correctOptionId: 'a' }, def.parseAnswer({ optionId: 'b' })).correct).toBe(
      false,
    );
    expect(() => def.parseAnswer({ optionId: '' })).toThrow();
  });

  it('dictation ignores whitespace/punctuation but not characters', () => {
    expect(dictationType.grade({ expectedHanzi: '山' }, { text: ' 山。' }).correct).toBe(true);
    expect(dictationType.grade({ expectedHanzi: '山' }, { text: '出' }).correct).toBe(false);
    expect(dictationType.grade({ expectedHanzi: '山' }, { text: '  ' }).reason).toBe('empty');
  });

  it('handwriting counts only the top candidate (PRD-05)', () => {
    const p = { targetHanzi: '山' };
    expect(handwritingType.grade(p, { candidates: [{ text: '山', score: null }] }).correct).toBe(
      true,
    );
    const alt = handwritingType.grade(p, {
      candidates: [
        { text: '出', score: 1.2 },
        { text: '山', score: 1.5 },
      ],
    });
    expect(alt).toEqual({ correct: false, reason: 'in_alternatives' });
    expect(handwritingType.grade(p, { candidates: [] }).reason).toBe('no_candidates');
  });
});
