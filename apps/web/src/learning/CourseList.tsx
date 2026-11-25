'use client';
import Link from 'next/link';
import { Card, EmptyState, Skeleton, SkeletonGroup } from '@/components/ui';
import { useLearning } from './LearningProvider';

/** Courses → chapters → lessons (PRD-11). Shared courses are read-only. */
export function CourseList() {
  const { content, contentStatus, vocabulary } = useLearning();
  if (!content)
    return contentStatus === 'unavailable' ? (
      <EmptyState
        title="Chưa tải được giáo trình"
        description="Cần có mạng ở lần mở đầu tiên; sau đó giáo trình đọc được cả khi offline."
      />
    ) : (
      <SkeletonGroup label="Đang tải giáo trình">
        <Skeleton className="h-40 w-full" radius="card" />
      </SkeletonGroup>
    );
  const mine = new Set(vocabulary.map((v) => v.lexemeId).filter(Boolean));
  return (
    <div className="flex flex-col gap-4" data-testid="course-list">
      {content.courses.map((course) => (
        <Card key={course.id} title={course.title} headingLevel="h2">
          <p className="text-sm text-fg-muted">
            {course.level} · {course.description}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {course.chapters.map((ch) => (
              <div key={ch.id}>
                <h3 className="mb-2 font-semibold">
                  Chương {ch.ordinal}. {ch.title}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {ch.lessons.map((l) => {
                    const done = l.lexemeIds.filter((id) => mine.has(id)).length;
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/library/lesson?id=${l.id}`}
                          className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2 hover:bg-[var(--state-hover)]"
                          data-testid="lesson-link"
                        >
                          <span className="min-w-0">
                            Bài {l.ordinal}. {l.title}
                          </span>
                          <span className="shrink-0 text-xs text-fg-muted tabular-nums">
                            {done}/{l.lexemeIds.length} từ
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-fg-muted">Nguồn: {course.provenance}</p>
        </Card>
      ))}
    </div>
  );
}
