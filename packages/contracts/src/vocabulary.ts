import { z } from 'zod';

/**
 * Personal vocabulary (PRD-01/02, D-001, D-006, D-043). A learner's word list is the projection of
 * their own sync operations (`entityType: 'vocabulary_item'`), so it works offline, syncs to every
 * device of the same account and is isolated by the sync_operations RLS.
 */
export const VOCABULARY_ENTITY = 'vocabulary_item';

export const EntryMethodSchema = z.enum(['manual', 'lesson', 'dictionary']);
export type EntryMethod = z.infer<typeof EntryMethodSchema>;

/** Provenance of one time the word was added/encountered (D-006). */
export const VocabularyAdditionSchema = z.object({
  /** Stable key: the same lesson added twice is one addition. */
  key: z.string().min(1).max(120),
  studyDate: z.iso.date(),
  method: EntryMethodSchema,
  lessonId: z.string().max(64).nullable(),
  courseId: z.string().max(64).nullable(),
});
export type VocabularyAddition = z.infer<typeof VocabularyAdditionSchema>;

/** Editable fields (last writer wins per field across devices). */
export const VocabularyFieldsSchema = z.object({
  simplified: z.string().trim().min(1).max(32),
  traditional: z.string().trim().max(32).nullable(),
  pinyin: z.string().trim().min(1).max(80),
  meaningVi: z.string().trim().min(1).max(300),
  example: z.string().trim().max(300).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});
export type VocabularyFields = z.infer<typeof VocabularyFieldsSchema>;

export const VocabularyCreatePayloadSchema = z.object({
  id: z.string().min(8).max(64),
  /** Shared lexeme this entry is linked to (never edited through it, D-001). */
  lexemeId: z.string().max(64).nullable(),
  fields: VocabularyFieldsSchema,
  addition: VocabularyAdditionSchema,
});
export const VocabularyUpdatePayloadSchema = z.object({
  id: z.string().min(8).max(64),
  fields: VocabularyFieldsSchema.partial(),
});
/** opType 'event': the word was met again (e.g. another lesson) — links, never duplicates. */
export const VocabularyAdditionPayloadSchema = z.object({
  id: z.string().min(8).max(64),
  addition: VocabularyAdditionSchema,
});
export const VocabularyDeletePayloadSchema = z.object({ id: z.string().min(8).max(64) });
