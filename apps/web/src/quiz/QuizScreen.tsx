'use client';
import {
  addDays,
  buildQuestion,
  gradeChoice,
  preferredTypes,
  QUIZ_SKILL_MEANING,
  SESSION_LIMITS,
  type Candidate,
  type QuizSessionState,
  type SessionMode,
} from '@mandarin/domain';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HanziText } from '@/components/Hanzi';
import { Badge, Button, ButtonLink, Card, EmptyState, ProgressBar } from '@/components/ui';
import { useLearning } from '@/learning/LearningProvider';
import { useOffline } from '@/components/OfflineProvider';
import { AttemptPersistQueue, type PersistResult } from './persist-queue';
import { buildSessionIds } from './queue-inputs';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const newSessionId = () =>
  `sess-${typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}${Math.random().toString(16).slice(2)}`}`;

const MODES: { mode: SessionMode; label: string; hint: string }[] = [
  { mode: 'mixed', label: 'Ôn hôm nay', hint: 'Thẻ đến hạn rồi đến từ mới' },
  { mode: 'due', label: 'Chỉ thẻ đến hạn', hint: 'Ôn các từ đã đến lịch' },
  { mode: 'new', label: 'Từ mới', hint: `Tối đa ${SESSION_LIMITS.new} từ chưa luyện` },
  { mode: 'recall', label: 'Nhớ lại nhiều ngày', hint: 'Từ đã học ở các ngày trước' },
];

const REASON: Record<string, string> = { match: 'Chính xác', wrong_option: 'Chưa đúng' };

function whenText(due: string, today: string) {
  if (due <= today) return 'ôn lại hôm nay';
  if (due === addDays(today, 1)) return 'ôn lại ngày mai';
  const [y, m, d] = due.split('-');
  return `ôn lại ngày ${d}/${m}/${y}`;
}

/** Quiz (M3): due review, new-day quiz, multi-day recall — keyboard-usable, offline-first. */
export function QuizScreen() {
  const { store, lastSync } = useOffline();
  const { vocabulary, lexemes, contentStatus } = useLearning();
  const [session, setSession] = useState<QuizSessionState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [counts, setCounts] = useState({ due: 0, fresh: 0 });
  const [notice, setNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    optionId: string;
    correct: boolean;
    reason: string;
  } | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [summaryRows, setSummaryRows] = useState<{ itemId: string; text: string }[]>([]);
  const persist = useMemo(() => (store ? new AttemptPersistQueue(store) : null), [store]);
  // Unsaved answers (a write failed): the quiz cannot move on or finish until they are durable.
  const [unsaved, setUnsaved] = useState(false);
  // Another tab stored a different answer for the same slot: its record is canonical.
  const [conflict, setConflict] = useState(false);
  const finishing = useRef(false);
  // Synchronous guard: set in the same tick as the first answer so key-repeat / double click /
  // click+key can never grade a second answer before React re-renders `feedback`.
  const answering = useRef(false);
  const shownAt = useRef(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const today = localDate();

  const items = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary]);
  const pool = useMemo<Candidate[]>(() => {
    const own = vocabulary.map((v) => ({
      id: v.id,
      simplified: v.simplified,
      pinyin: v.pinyin,
      meaningVi: v.meaningVi,
    }));
    return [
      ...own,
      ...[...lexemes.values()].map((l) => ({
        id: l.id,
        simplified: l.simplified,
        pinyin: l.pinyin,
        meaningVi: l.meaningVi,
      })),
    ];
  }, [vocabulary, lexemes]);

  // Resume after a reload: the session lives in this account's IndexedDB.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    void store.getSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      setResumed(!!s && !s.completed);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  // Refreshes can overlap (summary opens while the last attempt is still being written, then the
  // summary is dismissed): only the newest read may update the counters, never an older one.
  const countsSeq = useRef(0);
  const refreshCounts = useCallback(async () => {
    if (!store) return;
    const seq = ++countsSeq.current;
    const [due, carded] = await Promise.all([
      store.countDue(today, QUIZ_SKILL_MEANING),
      store.cardedItemIds(QUIZ_SKILL_MEANING),
    ]);
    if (seq !== countsSeq.current) return;
    setCounts({ due, fresh: vocabulary.filter((v) => !carded.has(v.id)).length });
  }, [store, today, vocabulary]);
  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts, session?.completed, lastSync]);

  const question = useMemo(() => {
    if (!session || session.completed) return null;
    // While feedback is shown the answer is already counted: keep showing that question.
    const entry = session.queue[session.answers.length - (feedback ? 1 : 0)];
    const item = entry && items.get(entry.itemId);
    if (!entry || !item) return null;
    return buildQuestion(entry.quizType, item, pool, `${session.id}|${item.id}`);
  }, [session, items, pool, feedback]);

  const index = session?.answers.length ?? 0;
  // A new question is on screen (no feedback): start its response timer.
  useEffect(() => {
    if (feedback) return;
    shownAt.current = performance.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersisted(false);
  }, [feedback, session?.id]);

  // A word deleted since the session began leaves no question: drop it instead of blocking.
  useEffect(() => {
    if (!session || session.completed || question || feedback || items.size === 0) return;
    if (index >= session.queue.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({ ...session, queue: session.queue.filter((_, i) => i !== index) });
  }, [session, question, feedback, index, items]);

  const finishRef = useRef<() => Promise<void>>(async () => {});
  // Every remaining word was dropped (deleted) after at least one answer: close the session.
  useEffect(() => {
    if (
      session &&
      !session.completed &&
      !question &&
      items.size > 0 &&
      index > 0 &&
      index >= session.queue.length
    ) {
      void finishRef.current();
    }
  }, [session, question, items, index]);

  const start = useCallback(
    async (mode: SessionMode) => {
      if (!store) return;
      setNotice(null);
      const ids = await buildSessionIds(
        store,
        mode,
        today,
        QUIZ_SKILL_MEANING,
        new Set(items.keys()),
        vocabulary.map((v) => v.id),
      );
      const id = newSessionId();
      const queue: QuizSessionState['queue'] = [];
      for (const itemId of ids) {
        const item = items.get(itemId)!;
        const type = preferredTypes(`${id}|${itemId}`).find((t) =>
          buildQuestion(t, item, pool, `${id}|${itemId}`),
        );
        if (type) queue.push({ itemId, quizType: type });
      }
      if (queue.length === 0) {
        setNotice(
          mode === 'recall'
            ? 'Chưa có từ nào đã học ở ngày trước để nhớ lại.'
            : mode === 'new'
              ? 'Không còn từ mới để luyện.'
              : 'Hôm nay không có thẻ đến hạn hay từ mới. Hãy thêm từ vào từ điển cá nhân.',
        );
        return;
      }
      const s: QuizSessionState = {
        id,
        mode,
        studyDate: today,
        startedAt: new Date().toISOString(),
        queue,
        answers: [],
        completed: false,
      };
      answering.current = false;
      setSession(s);
      setResumed(false);
      await store.putSession(s);
      await store.recordLearningEvent({
        id: `${id}:started`,
        eventType: 'quiz.session_started',
        eventVersion: 1,
        sessionId: id,
        data: { mode, questions: queue.length, studyDate: today },
      });
    },
    [store, today, items, vocabulary, pool],
  );

  const handleResult = useCallback((r: PersistResult) => {
    if (r.status === 'saved') {
      setUnsaved(false);
      setPersisted(true);
    } else if (r.status === 'failed') {
      setUnsaved(true);
    } else {
      setUnsaved(false);
      setConflict(true);
    }
  }, []);

  const answer = useCallback(
    (optionId: string) => {
      if (!store || !persist || !session || !question || feedback || answering.current) return;
      answering.current = true;
      // Grade and show feedback synchronously (P4); persistence follows in the background chain.
      const graded = gradeChoice(question, optionId);
      const responseMs = Math.max(0, Math.round(performance.now() - shownAt.current));
      const attemptId = `att-${session.id}-${session.answers.length}`;
      const entry = session.queue[session.answers.length]!;
      let queue = session.queue;
      if (!graded.correct && queue.filter((q) => q.itemId === entry.itemId).length === 1) {
        const item = items.get(entry.itemId)!;
        const retry = preferredTypes(`${session.id}|${item.id}|retry`).find(
          (t) =>
            t !== entry.quizType && buildQuestion(t, item, pool, `${session.id}|${item.id}|retry`),
        );
        if (retry) queue = [...queue, { itemId: entry.itemId, quizType: retry }];
      }
      const next: QuizSessionState = {
        ...session,
        queue,
        answers: [...session.answers, { itemId: entry.itemId, correct: graded.correct, attemptId }],
      };
      setFeedback({ optionId, correct: graded.correct, reason: graded.reason });
      setSession(next);
      void persist
        .enqueue({
          attempt: {
            id: attemptId,
            sessionId: session.id,
            vocabularyItemId: entry.itemId,
            skill: QUIZ_SKILL_MEANING,
            quizType: question.quizType,
            quizTypeVersion: graded.version,
            correct: graded.correct,
            reason: graded.reason.slice(0, 40),
            studyDate: session.studyDate,
            responseMs: Math.min(responseMs, 3_600_000),
          },
          session: next,
        })
        .then((r) => handleResult(r));
    },
    [store, persist, handleResult, session, question, feedback, items, pool],
  );

  const finish = useCallback(async () => {
    if (!store || !session || !persist || finishing.current) return;
    finishing.current = true;
    try {
      // Never report completion while an answer is not durable.
      const flushed = await persist.flush();
      if (flushed.status !== 'saved') {
        handleResult(flushed);
        return;
      }
      const done = { ...session, completed: true };
      try {
        await store.putSession(done);
        await store.recordLearningEvent({
          id: `${session.id}:completed`,
          eventType: 'quiz.session_completed',
          eventVersion: 1,
          sessionId: session.id,
          data: {
            answered: session.answers.length,
            correct: session.answers.filter((a) => a.correct).length,
          },
        });
        const cards = new Map((await store.listCards()).map((c) => [c.key, c]));
        setSummaryRows(
          [...new Set(session.answers.map((a) => a.itemId))].map((itemId) => {
            const c = cards.get(`${itemId}|${QUIZ_SKILL_MEANING}`);
            return { itemId, text: c ? whenText(c.due, today) : '' };
          }),
        );
        setUnsaved(false);
        setSession(done);
      } catch {
        setUnsaved(true); // completion not written: stay on the quiz, retry is safe (idempotent ids)
      }
    } finally {
      finishing.current = false;
    }
  }, [store, session, persist, today, handleResult]);

  const retrySave = useCallback(async () => {
    if (!persist) return;
    const r = await persist.retry();
    handleResult(r);
    if (r.status === 'saved' && session && session.answers.length >= session.queue.length) {
      void finish();
    }
  }, [persist, handleResult, session, finish]);

  const reloadAfterConflict = useCallback(async () => {
    if (!store) return;
    const s = await store.getSession();
    answering.current = false;
    setFeedback(null);
    setConflict(false);
    setSession(s);
    setResumed(!!s && !s.completed);
  }, [store]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const dismiss = useCallback(async () => {
    const flushed = await persist?.flush();
    if (flushed && flushed.status !== 'saved') {
      handleResult(flushed);
      return;
    }
    await store?.clearSession();
    // Counters are read after the last attempt is durable, before the home screen is shown.
    await refreshCounts();
    setSession(null);
    setSummaryRows([]);
  }, [store, persist, refreshCounts, handleResult]);

  const advance = useCallback(() => {
    if (!session || !feedback || unsaved || conflict) return;
    if (session.answers.length >= session.queue.length) void finish();
    else {
      answering.current = false;
      setFeedback(null);
    }
  }, [session, feedback, finish, unsaved, conflict]);

  // Install shortcuts before the quiz question paints so the first key is never lost.
  // Keyboard: 1–4 choose, Enter/Space continue.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (!feedback) {
        const n = Number(e.key);
        if (n >= 1 && n <= question.options.length) {
          e.preventDefault();
          answer(question.options[n - 1]!.id);
        }
      } else if (e.key === 'Enter' && t?.tagName !== 'BUTTON') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, feedback, answer, advance]);

  useEffect(() => {
    if (feedback) nextRef.current?.focus();
  }, [feedback]);

  if (!store || !loaded) return <p className="text-sm text-fg-muted">Đang mở dữ liệu học…</p>;

  const saveBanner = unsaved ? (
    <div role="alert" className="mt-4 text-sm text-fg" data-testid="quiz-save-error">
      <p>Chưa lưu được câu trả lời trên máy này. Câu trả lời vẫn được giữ; hãy thử lại.</p>
      <Button
        variant="secondary"
        className="mt-2"
        onClick={() => void retrySave()}
        data-testid="quiz-retry-save"
      >
        Thử lưu lại
      </Button>
    </div>
  ) : null;

  if (conflict) {
    return (
      <Card data-testid="quiz-conflict" title="Phiên đã thay đổi ở tab khác">
        <p className="text-sm text-fg-muted">
          Câu này đã được trả lời ở một tab khác với kết quả khác. Kết quả đã lưu được giữ nguyên;
          hãy tải lại phiên để tiếp tục từ trạng thái đó.
        </p>
        <Button
          className="mt-3"
          onClick={() => void reloadAfterConflict()}
          data-testid="quiz-conflict-reload"
        >
          Tải lại phiên
        </Button>
      </Card>
    );
  }

  // ---- Summary -----------------------------------------------------------------------------
  if (session?.completed) {
    const total = session.answers.length;
    const right = session.answers.filter((a) => a.correct).length;
    const wrong = [...new Set(session.answers.filter((a) => !a.correct).map((a) => a.itemId))];
    return (
      <Card data-testid="quiz-summary" title="Hoàn thành phiên luyện tập">
        <p className="text-2xl font-semibold text-fg" data-testid="quiz-summary-score">
          {right}/{total} câu đúng
        </p>
        <ProgressBar value={right} max={Math.max(total, 1)} label="Tỉ lệ đúng" className="mt-3" />
        {wrong.length > 0 && (
          <p className="mt-4 text-sm text-fg-muted" data-testid="quiz-summary-wrong">
            Cần ôn thêm:{' '}
            {wrong.map((id) => (
              <HanziText key={id} className="mr-2 text-fg">
                {items.get(id)?.simplified ?? '—'}
              </HanziText>
            ))}
          </p>
        )}
        <ul className="mt-4 space-y-1 text-sm" data-testid="quiz-summary-schedule">
          {summaryRows.map((r) => (
            <li key={r.itemId}>
              <HanziText className="mr-2 text-fg">
                {items.get(r.itemId)?.simplified ?? '—'}
              </HanziText>
              <span className="text-fg-muted">{r.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-3">
          <Button onClick={() => void dismiss()} data-testid="quiz-done">
            Xong
          </Button>
        </div>
      </Card>
    );
  }

  // ---- Session whose words are not loaded yet (or were all deleted) ----------------------
  if (session && !question && !session.completed) {
    return (
      <Card data-testid="quiz-loading">
        <p className="text-sm text-fg-muted">Đang mở phiên luyện tập…</p>
        <Button variant="secondary" className="mt-3" onClick={() => void dismiss()}>
          Bỏ phiên này
        </Button>
        {saveBanner}
      </Card>
    );
  }

  // ---- Question ----------------------------------------------------------------------------
  if (session && question) {
    const shown = session.answers.length + (feedback ? 0 : 1);
    return (
      <Card data-testid="quiz-question" data-persisted={persisted ? 'true' : 'false'}>
        {resumed && (
          <p className="mb-3 text-sm text-fg-muted" data-testid="quiz-resumed">
            Tiếp tục phiên đang làm dở.
          </p>
        )}
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-fg-muted">
          <span data-testid="quiz-progress">
            Câu {shown}/{session.queue.length}
          </span>
          <Badge>
            {question.quizType === 'meaning_recognition'
              ? 'Nhận nghĩa'
              : question.quizType === 'hanzi_recognition'
                ? 'Nhận Hán tự'
                : 'Ghép pinyin'}
          </Badge>
        </div>
        <ProgressBar
          value={session.answers.length}
          max={session.queue.length}
          label="Tiến độ phiên"
          thin
        />
        <p className="mt-5 text-sm text-fg-muted">{question.instruction}</p>
        <p
          className={`mt-2 text-center ${question.quizType === 'hanzi_recognition' ? 'text-2xl' : 'text-6xl'} font-semibold text-fg`}
          data-testid="quiz-prompt"
        >
          {question.quizType === 'hanzi_recognition' ? (
            question.prompt
          ) : (
            <HanziText>{question.prompt}</HanziText>
          )}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2" role="list">
          {question.options.map((o, i) => {
            const state = !feedback
              ? 'idle'
              : o.id === question.correctOptionId
                ? 'correct'
                : o.id === feedback.optionId
                  ? 'wrong'
                  : 'idle';
            return (
              <li key={o.id}>
                <button
                  type="button"
                  data-testid="quiz-option"
                  data-state={feedback ? state : undefined}
                  aria-keyshortcuts={String(i + 1)}
                  disabled={!!feedback}
                  onClick={() => answer(o.id)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    state === 'correct'
                      ? 'border-success-base bg-success-subtle text-fg'
                      : state === 'wrong'
                        ? 'border-error-base bg-error-subtle text-fg'
                        : 'border-line bg-surface text-fg hover:border-line-strong'
                  }`}
                >
                  <kbd className="hidden shrink-0 rounded border border-line px-1.5 text-xs text-fg-muted md:inline">
                    {i + 1}
                  </kbd>
                  <span lang={question.quizType === 'hanzi_recognition' ? 'zh-Hans' : undefined}>
                    {o.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div
          aria-live="polite"
          className="mt-4 min-h-12"
          data-testid="quiz-feedback"
          data-result={feedback ? (feedback.correct ? 'correct' : 'wrong') : undefined}
        >
          {feedback && (
            <p className="text-base font-semibold text-fg">
              {feedback.correct ? '✓ ' : '✗ '}
              {REASON[feedback.reason] ?? (feedback.correct ? 'Chính xác' : 'Chưa đúng')}
              {!feedback.correct && (
                <span className="ml-2 font-normal text-fg-muted">
                  Đáp án: {question.answerLabel}
                </span>
              )}
            </p>
          )}
        </div>
        {saveBanner}
        {feedback && (
          <Button ref={nextRef} onClick={advance} disabled={unsaved} data-testid="quiz-next">
            {session.answers.length >= session.queue.length ? 'Xem kết quả' : 'Câu tiếp (Enter)'}
          </Button>
        )}
        <p className="mt-3 hidden text-xs text-fg-muted md:block">
          Phím 1–4 để chọn, Enter để tiếp tục.
        </p>
      </Card>
    );
  }

  // ---- Home --------------------------------------------------------------------------------
  const empty = vocabulary.length === 0;
  return (
    <div className="space-y-4" data-testid="quiz-home">
      {empty ? (
        <Card>
          <EmptyState
            variant="first-use"
            hanzi="练"
            headingLevel="h2"
            title="Chưa có từ để luyện"
            description={
              contentStatus === 'loading'
                ? 'Đang tải dữ liệu…'
                : 'Hãy thêm từ vào từ điển cá nhân hoặc thêm cả một bài trong Thư viện; từ đã lưu sẽ xuất hiện ở đây.'
            }
            primaryAction={<ButtonLink href="/dictionary">Mở từ điển cá nhân</ButtonLink>}
          />
        </Card>
      ) : (
        <Card title="Hôm nay" data-testid="quiz-today">
          <p className="text-sm text-fg-muted">
            <span data-testid="quiz-due-count">{counts.due}</span> thẻ đến hạn ·{' '}
            <span data-testid="quiz-new-count">{counts.fresh}</span> từ mới chưa luyện
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {MODES.map((m) => {
              const disabled =
                (m.mode === 'due' && counts.due === 0) ||
                (m.mode === 'new' && counts.fresh === 0) ||
                (m.mode === 'mixed' && counts.due + counts.fresh === 0);
              return (
                <Button
                  key={m.mode}
                  variant={m.mode === 'mixed' ? 'primary' : 'secondary'}
                  disabled={disabled}
                  onClick={() => void start(m.mode)}
                  data-testid={`quiz-start-${m.mode}`}
                >
                  {m.label}
                  <span className="sr-only">. {m.hint}</span>
                </Button>
              );
            })}
          </div>
          {notice && (
            <p role="status" className="mt-3 text-sm text-fg-muted" data-testid="quiz-notice">
              {notice}
            </p>
          )}
        </Card>
      )}
      <p className="text-xs text-fg-muted">
        Ba dạng bài: nhận nghĩa, nhận Hán tự, ghép pinyin. Kết quả lưu trên máy ngay cả khi mất mạng
        và đồng bộ khi có mạng lại.{' '}
        <Link href="/dictionary" className="underline">
          Từ điển cá nhân
        </Link>
      </p>
    </div>
  );
}
