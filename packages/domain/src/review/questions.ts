import { createDefaultQuizTypeRegistry, type ChoicePrompt } from '../quiz/builtin.js';
import { MEANING_QUIZ_TYPES, type MeaningQuizType } from './queue.js';

/** What the quiz needs to know about a word (personal entry or shared lexeme). */
export interface Candidate {
  id: string;
  simplified: string;
  pinyin: string;
  meaningVi: string;
}

export interface QuizOption {
  id: string;
  label: string;
}

export interface Question extends ChoicePrompt {
  quizType: MeaningQuizType;
  itemId: string;
  /** Big text on the card, and a short instruction. */
  prompt: string;
  instruction: string;
  /** Shown only after answering (never reveals the answer before). */
  options: QuizOption[];
  /** The target in full, for the feedback line. */
  answerLabel: string;
}

/** FNV-1a: a stable seed so a reloaded session rebuilds exactly the same question. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

const FORMAT: Record<
  MeaningQuizType,
  { instruction: string; prompt: (c: Candidate) => string; label: (c: Candidate) => string }
> = {
  meaning_recognition: {
    instruction: 'Chọn nghĩa tiếng Việt đúng',
    prompt: (c) => c.simplified,
    label: (c) => c.meaningVi,
  },
  hanzi_recognition: {
    instruction: 'Chọn chữ Hán đúng',
    prompt: (c) => c.meaningVi,
    label: (c) => c.simplified,
  },
  pinyin_matching: {
    instruction: 'Chọn pinyin đúng',
    prompt: (c) => c.simplified,
    label: (c) => c.pinyin,
  },
};

const OPTIONS = 4;

/**
 * Builds one multiple-choice question. Distractors are probed from the pool by a seeded step
 * (bounded work whatever the pool size — 12 000 words cost the same as 12) and must differ from
 * the answer and from each other in the label that is shown. Returns null when fewer than two
 * distinct options exist.
 */
export function buildQuestion(
  quizType: MeaningQuizType,
  target: Candidate,
  pool: readonly Candidate[],
  seed: string,
): Question | null {
  const f = FORMAT[quizType];
  const answerLabel = f.label(target);
  const used = new Set([answerLabel]);
  const distractors: Candidate[] = [];
  const n = pool.length;
  if (n > 0) {
    let h = hash32(`${seed}|${quizType}`);
    const step = (h % 7919) * 2 + 1; // odd → visits distinct slots for most pool sizes
    const probes = Math.min(n, 64);
    for (let k = 0; k < probes && distractors.length < OPTIONS - 1; k++) {
      h = (h + step) >>> 0;
      const c = pool[h % n]!;
      const label = f.label(c);
      if (c.id === target.id || used.has(label)) continue;
      used.add(label);
      distractors.push(c);
    }
    if (distractors.length < OPTIONS - 1 && n <= 64) {
      for (const c of pool) {
        if (distractors.length >= OPTIONS - 1) break;
        const label = f.label(c);
        if (c.id === target.id || used.has(label)) continue;
        used.add(label);
        distractors.push(c);
      }
    }
  }
  if (distractors.length === 0) return null;
  const all = [target, ...distractors]
    .map((c) => ({ id: c.id, label: f.label(c), r: hash32(`${seed}|order|${c.id}`) }))
    .sort((a, b) => a.r - b.r || a.id.localeCompare(b.id));
  return {
    quizType,
    itemId: target.id,
    prompt: f.prompt(target),
    instruction: f.instruction,
    options: all.map(({ id, label }) => ({ id, label })),
    correctOptionId: target.id,
    answerLabel,
  };
}

/** First question type to try for a word in a session; others are fallbacks. */
export function preferredTypes(seed: string): MeaningQuizType[] {
  const start = hash32(seed) % MEANING_QUIZ_TYPES.length;
  return MEANING_QUIZ_TYPES.map(
    (_, i) => MEANING_QUIZ_TYPES[(start + i) % MEANING_QUIZ_TYPES.length]!,
  );
}

/** Grades through the registry (D-002): the same grader the server-side re-grade would use. */
const registry = createDefaultQuizTypeRegistry();
export function gradeChoice(q: Question, optionId: string) {
  const def = registry.get(q.quizType)!;
  const result = def.grade(q, def.parseAnswer({ optionId }));
  return { ...result, version: def.version as number };
}
