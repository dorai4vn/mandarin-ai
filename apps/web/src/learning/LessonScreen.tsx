'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { HanziText, Pinyin } from '@/components/Hanzi';
import { Badge, Button, ButtonLink, Card, EmptyState, useToast } from '@/components/ui';
import { useLearning } from './LearningProvider';

/** A lesson of a shared course: its words, and "add all" (links words you already have). */
export function LessonScreen() {
  const id = useSearchParams().get('id') ?? '';
  const { lessonById, lexemes, vocabulary, addLesson, content } = useLearning();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const lesson = lessonById.get(id);
  if (!lesson)
    return content ? (
      <EmptyState
        title="Không tìm thấy bài học"
        primaryAction={<ButtonLink href="/library">Về Thư viện</ButtonLink>}
      />
    ) : null;
  const mine = new Map(vocabulary.filter((v) => v.lexemeId).map((v) => [v.lexemeId!, v]));
  const linkedHere = lesson.lexemeIds.filter((x) =>
    mine.get(x)?.additions.some((a) => a.lessonId === lesson.lessonId),
  ).length;

  return (
    <>
      <p className="mb-1 text-sm text-fg-muted" data-testid="lesson-breadcrumb">
        {lesson.course.title} · {lesson.chapterTitle}
      </p>
      <h2 className="mb-4 text-[22px] font-semibold leading-[30px]" data-testid="lesson-title">
        {lesson.lessonTitle}
      </h2>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          loading={busy}
          disabled={linkedHere === lesson.lexemeIds.length}
          onClick={async () => {
            setBusy(true);
            const r = await addLesson(lesson.lessonId);
            setBusy(false);
            toast({
              message:
                r.linked > 0
                  ? `Đã thêm ${r.added} từ; ${r.linked} từ đã có được liên kết với bài này.`
                  : `Đã thêm ${r.added} từ vào từ của tôi.`,
              tone: 'success',
            });
          }}
          data-testid="lesson-add-all"
        >
          {linkedHere === lesson.lexemeIds.length ? 'Đã thêm cả bài' : 'Thêm tất cả vào từ của tôi'}
        </Button>
        <span className="text-sm text-fg-muted tabular-nums" data-testid="lesson-progress">
          {lesson.lexemeIds.filter((x) => mine.has(x)).length}/{lesson.lexemeIds.length} từ đã có
        </span>
      </div>
      <ul className="grid gap-2 md:grid-cols-2" data-testid="lesson-words">
        {lesson.lexemeIds.map((lid) => {
          const l = lexemes.get(lid);
          if (!l) return null;
          return (
            <li key={lid}>
              <Card className="flex items-center gap-3 !p-4">
                <HanziText className="shrink-0 text-3xl">{l.simplified}</HanziText>
                <span className="min-w-0 flex-1">
                  <Pinyin className="block text-sm text-fg-muted">{l.pinyin}</Pinyin>
                  <span className="block">{l.meaningVi}</span>
                </span>
                {mine.has(lid) && <Badge variant="primary">Đã có</Badge>}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
