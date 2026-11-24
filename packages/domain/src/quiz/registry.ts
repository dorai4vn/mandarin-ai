import type { QuizTypeId, Skill } from '@mandarin/contracts';

/** Outcome of grading a single answer. Graders are pure and deterministic. */
export interface GradeResult {
  correct: boolean;
  /** Machine-readable reason, used for feedback and analytics. */
  reason: string;
}

/**
 * A registered quiz type. Generic over prompt (`P`) and answer (`A`).
 * New quiz types are added by registration; existing graders are never edited (D-002).
 */
export interface QuizTypeDefinition<P = unknown, A = unknown> {
  readonly id: QuizTypeId | (string & {});
  readonly version: number;
  readonly skill: Skill;
  /** Validates untrusted answer input; returns the typed answer or throws. */
  parseAnswer(input: unknown): A;
  grade(prompt: P, answer: A): GradeResult;
}

// The registry stores heterogeneous definitions; callers narrow via `get`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDefinition = QuizTypeDefinition<any, any>;

export class QuizTypeRegistry {
  private readonly byKey = new Map<string, AnyDefinition>();
  private readonly latest = new Map<string, AnyDefinition>();

  register(definition: AnyDefinition): this {
    if (!Number.isInteger(definition.version) || definition.version < 1) {
      throw new Error(`Quiz type ${definition.id} has invalid version ${definition.version}`);
    }
    const key = `${definition.id}@${definition.version}`;
    if (this.byKey.has(key)) {
      throw new Error(`Quiz type ${key} is already registered`);
    }
    this.byKey.set(key, definition);
    const current = this.latest.get(definition.id);
    if (!current || current.version < definition.version) {
      this.latest.set(definition.id, definition);
    }
    return this;
  }

  /** Exact version lookup (used when re-grading historical attempts). */
  get(id: string, version?: number): AnyDefinition | undefined {
    return version === undefined ? this.latest.get(id) : this.byKey.get(`${id}@${version}`);
  }

  /** Latest version of every registered type, in registration order. */
  list(): AnyDefinition[] {
    return [...this.latest.values()];
  }
}
