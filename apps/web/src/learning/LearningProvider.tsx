'use client';
import type {
  ContentSnapshot,
  Course,
  EntryMethod,
  Lexeme,
  VocabularyFields,
} from '@mandarin/contracts';
import { findDuplicate, type VocabularyItem } from '@mandarin/domain';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useOffline } from '@/components/OfflineProvider';
import { api } from '@/lib/api-client';

/**
 * Learning data for the signed-in account (M2, D-043):
 *  - shared content (lexicon + courses): a versioned snapshot cached in IndexedDB, refreshed only
 *    when the server's version changes, readable offline;
 *  - personal vocabulary: the projection of the account's own operations, written through the
 *    outbox (offline-first) and synced to the account's other devices.
 */
export interface LessonRef {
  course: Course;
  chapterTitle: string;
  lessonId: string;
  lessonTitle: string;
}

export interface NewWord {
  lexemeId: string | null;
  fields: VocabularyFields;
  method: EntryMethod;
  lessonId?: string | null;
  courseId?: string | null;
}

export type AddResult = { item: VocabularyItem; duplicate: boolean };

interface LearningState {
  content: ContentSnapshot | null;
  contentStatus: 'idle' | 'loading' | 'ready' | 'unavailable';
  lexemes: Map<string, Lexeme>;
  /** Lessons that teach each shared lexeme (one lexeme, several occurrences — PRD-11). */
  lessonsByLexeme: Map<string, LessonRef[]>;
  lessonById: Map<string, LessonRef & { lexemeIds: string[] }>;
  /** Personal vocabulary (deleted entries excluded), newest first. */
  vocabulary: VocabularyItem[];
  /** False while the account's local database is still opening (cold start): writes must wait. */
  storeReady: boolean;
  addWord: (word: NewWord) => Promise<AddResult>;
  updateWord: (id: string, fields: Partial<VocabularyFields>) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  /** Adds every word of a lesson (links words you already have instead of duplicating them). */
  addLesson: (lessonId: string) => Promise<{ added: number; linked: number }>;
}

const Ctx = createContext<LearningState | null>(null);

const newId = () =>
  typeof crypto?.randomUUID === 'function'
    ? `vocab-${crypto.randomUUID()}`
    : `vocab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function LearningProvider({ children }: { children: ReactNode }) {
  const { store, online, lastSync, refresh, syncNow } = useOffline();
  const [content, setContent] = useState<ContentSnapshot | null>(null);
  const [contentStatus, setContentStatus] = useState<LearningState['contentStatus']>('idle');
  const [all, setAll] = useState<VocabularyItem[]>([]);

  const reloadVocabulary = useCallback(async () => {
    setAll(store ? await store.listVocabulary() : []);
  }, [store]);

  // Account changed: show its cached content and words immediately (works offline).
  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    setContent(null);
    setAll([]);
    setContentStatus(store ? 'loading' : 'idle');
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!store) return;
    void Promise.all([store.getContent(), store.listVocabulary()]).then(([c, v]) => {
      if (cancelled) return;
      setContent(c);
      setAll(v);
      if (c) setContentStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  // Refresh the shared content when online and the server's version differs.
  useEffect(() => {
    if (!store || !online) return;
    let cancelled = false;
    void (async () => {
      try {
        const cached = await store.getContent();
        const version = await api.contentVersion();
        if (cached?.version === version) return;
        const fresh = await api.content();
        if (cancelled) return;
        await store.putContent(fresh);
        setContent(fresh);
        setContentStatus('ready');
      } catch {
        if (!cancelled) setContentStatus((s) => (s === 'loading' ? 'unavailable' : s));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, online]);

  // A sync may have pulled words from another device.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadVocabulary();
  }, [reloadVocabulary, lastSync]);

  const after = useCallback(async () => {
    await reloadVocabulary();
    await refresh();
    if (navigator.onLine) void syncNow();
  }, [reloadVocabulary, refresh, syncNow]);

  const { lexemes, lessonsByLexeme, lessonById } = useMemo(() => {
    const lexemes = new Map((content?.lexemes ?? []).map((l) => [l.id, l]));
    const lessonsByLexeme = new Map<string, LessonRef[]>();
    const lessonById = new Map<string, LessonRef & { lexemeIds: string[] }>();
    for (const course of content?.courses ?? [])
      for (const ch of course.chapters)
        for (const l of ch.lessons) {
          const ref = { course, chapterTitle: ch.title, lessonId: l.id, lessonTitle: l.title };
          lessonById.set(l.id, { ...ref, lexemeIds: l.lexemeIds });
          for (const id of l.lexemeIds)
            lessonsByLexeme.set(id, [...(lessonsByLexeme.get(id) ?? []), ref]);
        }
    return { lexemes, lessonsByLexeme, lessonById };
  }, [content]);

  const vocabulary = useMemo(
    () => all.filter((i) => !i.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all],
  );

  const addOne = useCallback(
    async (word: NewWord, current: VocabularyItem[]): Promise<AddResult> => {
      if (!store) throw new Error('not signed in');
      const addition = {
        key: word.lessonId ? `lesson:${word.lessonId}` : `${word.method}:${today()}`,
        studyDate: today(),
        method: word.method,
        lessonId: word.lessonId ?? null,
        courseId: word.courseId ?? null,
      };
      const dup = findDuplicate(current, {
        lexemeId: word.lexemeId,
        simplified: word.fields.simplified,
        pinyin: word.fields.pinyin,
      });
      if (dup) {
        // Link this encounter (e.g. another lesson) instead of creating a second entry.
        if (dup.additions.some((a) => a.key === addition.key))
          return { item: dup, duplicate: true };
        const item = await store.recordVocabulary('event', { id: dup.id, addition });
        return { item: item ?? dup, duplicate: true };
      }
      const item = await store.recordVocabulary('create', {
        id: newId(),
        lexemeId: word.lexemeId,
        fields: word.fields,
        addition,
      });
      return { item: item!, duplicate: false };
    },
    [store],
  );

  const addWord = useCallback(
    async (word: NewWord) => {
      const r = await addOne(word, store ? await store.listVocabulary() : []);
      await after();
      return r;
    },
    [addOne, after, store],
  );

  const addLesson = useCallback(
    async (lessonId: string) => {
      const lesson = lessonById.get(lessonId);
      if (!lesson || !store) return { added: 0, linked: 0 };
      let added = 0;
      let linked = 0;
      for (const id of lesson.lexemeIds) {
        const lx = lexemes.get(id);
        if (!lx) continue;
        const r = await addOne(
          {
            lexemeId: lx.id,
            fields: {
              simplified: lx.simplified,
              traditional: lx.traditional,
              pinyin: lx.pinyin,
              meaningVi: lx.meaningVi,
              example: lx.example,
              notes: null,
              tags: [],
            },
            method: 'lesson',
            lessonId,
            courseId: lesson.course.id,
          },
          await store.listVocabulary(),
        );
        if (r.duplicate) linked += 1;
        else added += 1;
      }
      await after();
      return { added, linked };
    },
    [addOne, after, lessonById, lexemes, store],
  );

  const updateWord = useCallback(
    async (id: string, fields: Partial<VocabularyFields>) => {
      if (!store) return;
      await store.recordVocabulary('update', { id, fields }).catch(() => undefined);
      await after();
    },
    [after, store],
  );

  const deleteWord = useCallback(
    async (id: string) => {
      if (!store) return;
      await store.recordVocabulary('delete', { id }).catch(() => undefined);
      await after();
    },
    [after, store],
  );

  const value = useMemo(
    () => ({
      content,
      contentStatus,
      lexemes,
      lessonsByLexeme,
      lessonById,
      vocabulary,
      storeReady: store !== null,
      addWord,
      updateWord,
      deleteWord,
      addLesson,
    }),
    [
      content,
      contentStatus,
      lexemes,
      lessonsByLexeme,
      lessonById,
      vocabulary,
      store,
      addWord,
      updateWord,
      deleteWord,
      addLesson,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearning(): LearningState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLearning outside LearningProvider');
  return v;
}
