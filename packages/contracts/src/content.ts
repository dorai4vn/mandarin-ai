import { z } from 'zod';

/**
 * Shared, read-only learning content (M2, D-001/D-012/D-043): the canonical lexicon and the
 * course → chapter → lesson tree. Learners never write it; the API serves a versioned snapshot
 * that the app keeps in IndexedDB for offline reading.
 */
export const LexemeSchema = z.object({
  id: z.string().min(1).max(64),
  simplified: z.string().min(1).max(32),
  traditional: z.string().max(32).nullable(),
  pinyin: z.string().min(1).max(80),
  meaningVi: z.string().min(1).max(300),
  example: z.string().max(300).nullable(),
  exampleVi: z.string().max(300).nullable(),
});
export type Lexeme = z.infer<typeof LexemeSchema>;

export const LessonSchema = z.object({
  id: z.string().min(1).max(64),
  ordinal: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  /** Shared lexemes taught in this lesson, in teaching order. */
  lexemeIds: z.array(z.string()),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ChapterSchema = z.object({
  id: z.string().min(1).max(64),
  ordinal: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  lessons: z.array(LessonSchema),
});
export type Chapter = z.infer<typeof ChapterSchema>;

export const CourseSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  level: z.string().max(40),
  description: z.string().max(1000),
  /** Where the content comes from and under which terms (D-012). */
  provenance: z.string().max(500),
  chapters: z.array(ChapterSchema),
});
export type Course = z.infer<typeof CourseSchema>;

export const ContentSnapshotSchema = z.object({
  source: z.enum(['live', 'mock']),
  /** Changes whenever any shared content changes; the app re-downloads only then. */
  version: z.string().min(1).max(100),
  lexemes: z.array(LexemeSchema),
  courses: z.array(CourseSchema),
});
export type ContentSnapshot = z.infer<typeof ContentSnapshotSchema>;
