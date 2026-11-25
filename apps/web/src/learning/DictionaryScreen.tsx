'use client';
import type { VocabularyItem } from '@mandarin/domain';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HanziText, Pinyin } from '@/components/Hanzi';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Dialog,
  EmptyState,
  Input,
  SearchInput,
  Textarea,
  useToast,
} from '@/components/ui';
import { AddWordDialog } from './AddWordDialog';
import { useLearning } from './LearningProvider';
import { indexLexemes, indexVocabulary, searchDictionary, type DictionaryEntry } from './search';

const METHOD: Record<string, string> = {
  manual: 'Tự thêm',
  lesson: 'Từ bài học',
  dictionary: 'Từ từ điển',
};

/** Dictionary (PRD-02, SCREEN_BLUEPRINTS_V2 §3): phone = list → detail; ≥ 1024 px side by side. */
export function DictionaryScreen() {
  const { vocabulary, lexemes, contentStatus, content } = useLearning();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const lexemeIndex = useMemo(() => indexLexemes(lexemes), [lexemes]);
  const vocabIndex = useMemo(() => indexVocabulary(vocabulary), [vocabulary]);
  const results = useMemo(
    () => searchDictionary(query, vocabIndex, lexemeIndex, lexemes),
    [query, vocabIndex, lexemeIndex, lexemes],
  );
  const current =
    results.find((r) => r.key === selected) ??
    // Keep showing the selected word after it was added (key changes from lexeme to personal).
    (selected?.startsWith('l:')
      ? results.find((r) => r.lexeme?.id === selected.slice(2))
      : undefined) ??
    null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput
          label="Tìm trong từ đã lưu và kho từ chung"
          placeholder="Hán tự, pinyin hoặc tiếng Việt"
          value={query}
          onValueChange={setQuery}
          className="min-w-0 flex-1"
          data-testid="dictionary-search"
        />
        <Button onClick={() => setAdding(true)} data-testid="add-word-open">
          Thêm từ
        </Button>
      </div>
      {contentStatus === 'unavailable' && !content && (
        <p className="mb-4 text-sm text-fg-muted" role="note" data-testid="content-unavailable">
          Chưa tải được kho từ chung dùng để gợi ý (cần mạng lần đầu). Từ đã lưu của bạn vẫn dùng
          được.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          aria-label={query ? 'Kết quả tìm kiếm' : 'Từ đã lưu'}
          className={current ? 'hidden lg:block' : ''}
        >
          {query && (
            <p className="mb-2 text-sm text-fg-muted" data-testid="dictionary-search-note">
              Kết quả gồm từ bạn đã lưu và gợi ý từ kho từ chung — bấm một gợi ý để lưu vào từ điển
              cá nhân.
            </p>
          )}
          <h2 className="mb-2 text-sm font-semibold text-fg-muted">
            {query
              ? `Kết quả (${results.length}${results.length === 50 ? '+' : ''})`
              : `Từ đã lưu (${vocabulary.length})`}
          </h2>
          {results.length === 0 ? (
            query ? (
              <Card>
                <EmptyState
                  variant="no-results"
                  title="Không tìm thấy"
                  description="Thử pinyin không dấu, chữ Hán hoặc nghĩa tiếng Việt khác — hoặc tự thêm từ này."
                  primaryAction={
                    <Button variant="secondary" onClick={() => setAdding(true)}>
                      Thêm từ
                    </Button>
                  }
                />
              </Card>
            ) : (
              <Card data-testid="dictionary-empty">
                <EmptyState
                  hanzi="字"
                  headingLevel="h2"
                  title="Chưa có từ nào trong từ điển cá nhân"
                  description="Bấm “Thêm từ” để lưu từ bạn vừa học, hoặc thêm cả bài từ giáo trình."
                  primaryAction={<Button onClick={() => setAdding(true)}>Thêm từ</Button>}
                  secondaryAction={
                    <ButtonLink href="/library" variant="secondary">
                      Xem giáo trình
                    </ButtonLink>
                  }
                />
              </Card>
            )
          ) : (
            <div className="flex flex-col gap-4" data-testid="dictionary-results">
              {[
                { id: 'saved', title: 'Đã lưu', rows: results.filter((r) => r.mine) },
                {
                  id: 'suggested',
                  title: 'Gợi ý từ kho chung',
                  rows: results.filter((r) => !r.mine),
                },
              ]
                .filter((g) => g.rows.length > 0)
                .map((g) => (
                  <div key={g.id} data-testid={`dictionary-group-${g.id}`}>
                    {query && (
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                        {g.title} ({g.rows.length})
                      </h3>
                    )}
                    <ul className="flex flex-col gap-2">
                      {g.rows.map((r) => (
                        <li key={r.key}>
                          <button
                            type="button"
                            onClick={() => setSelected(r.key)}
                            aria-current={current?.key === r.key ? 'true' : undefined}
                            className={`flex w-full min-w-0 items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors ${current?.key === r.key ? 'border-primary-base bg-primary-subtle' : r.mine ? 'border-line bg-surface hover:bg-[var(--state-hover)]' : 'border-dashed border-line-strong/50 bg-sunken hover:bg-[var(--state-hover)]'}`}
                            data-testid="dictionary-row"
                          >
                            <HanziText className="shrink-0 text-2xl">{r.simplified}</HanziText>
                            <span className="min-w-0 flex-1">
                              <Pinyin className="block text-sm text-fg-muted">{r.pinyin}</Pinyin>
                              <span className="block truncate">{r.meaningVi}</span>
                            </span>
                            {r.mine ? (
                              <Badge variant="primary">Đã lưu</Badge>
                            ) : (
                              <Badge>Gợi ý</Badge>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section aria-label="Chi tiết từ" className={current ? '' : 'hidden lg:block'}>
          {current ? (
            <WordDetail entry={current} onBack={() => setSelected(null)} onSelect={setSelected} />
          ) : (
            <Card className="hidden lg:block">
              <p className="text-fg-muted">Chọn một từ để xem chi tiết.</p>
            </Card>
          )}
        </section>
      </div>

      <AddWordDialog
        open={adding}
        initialHanzi={/\p{Script=Han}/u.test(query) ? query.trim() : ''}
        onClose={() => setAdding(false)}
        onAdded={(r) => {
          toast({
            message: r.duplicate ? 'Từ này đã có trong danh sách của bạn.' : 'Đã thêm từ.',
            tone: r.duplicate ? 'neutral' : 'success',
          });
          setQuery('');
          setSelected(`v:${r.item.id}`);
        }}
      />
    </>
  );
}

function WordDetail({
  entry,
  onBack,
  onSelect,
}: {
  entry: DictionaryEntry;
  onBack: () => void;
  onSelect: (key: string) => void;
}) {
  const { lessonsByLexeme, lessonById, addWord, updateWord, deleteWord } = useLearning();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mine = entry.mine;
  const lx = entry.lexeme;
  const lessons = lx ? (lessonsByLexeme.get(lx.id) ?? []) : [];
  const example = mine?.example ?? lx?.example ?? null;

  return (
    <Card data-testid="word-detail">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 mb-3 rounded-control px-1 text-sm font-medium text-link lg:hidden"
      >
        ‹ Danh sách
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <HanziText className="block text-5xl leading-tight" data-testid="word-hanzi">
            {entry.simplified}
          </HanziText>
          {entry.traditional && entry.traditional !== entry.simplified && (
            <p className="mt-1 text-sm text-fg-muted">
              Phồn thể: <HanziText>{entry.traditional}</HanziText>
            </p>
          )}
          <Pinyin className="mt-1 block text-xl">{entry.pinyin}</Pinyin>
          <p className="mt-1 text-lg">{entry.meaningVi}</p>
        </div>
        {mine ? (
          <Badge variant="primary">Đã lưu trong từ điển cá nhân</Badge>
        ) : (
          <Button
            onClick={() =>
              void addWord({
                lexemeId: lx!.id,
                method: 'dictionary',
                fields: {
                  simplified: lx!.simplified,
                  traditional: lx!.traditional,
                  pinyin: lx!.pinyin,
                  meaningVi: lx!.meaningVi,
                  example: lx!.example,
                  notes: null,
                  tags: [],
                },
              }).then((r) => {
                toast({ message: 'Đã lưu vào từ điển cá nhân.', tone: 'success' });
                onSelect(`v:${r.item.id}`);
              })
            }
            data-testid="word-add"
          >
            Lưu vào từ điển cá nhân
          </Button>
        )}
      </div>

      {example && (
        <div className="mt-4 rounded-control bg-subtle p-3">
          <HanziText className="block">{example}</HanziText>
          {lx?.exampleVi && example === lx.example && (
            <p className="mt-1 text-sm text-fg-muted">{lx.exampleVi}</p>
          )}
        </div>
      )}

      {lessons.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-fg-muted">Xuất hiện trong bài</h3>
          <ul className="flex flex-col gap-1 text-sm" data-testid="word-lessons">
            {lessons.map((l) => (
              <li key={l.lessonId}>
                <Link
                  href={`/library/lesson?id=${l.lessonId}`}
                  className="text-link underline underline-offset-2"
                >
                  {l.course.title} · {l.chapterTitle} · {l.lessonTitle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mine && (
        <PersonalSection
          key={mine.id}
          item={mine}
          lessonTitle={(id) => lessonById.get(id)?.lessonTitle ?? null}
          onSave={(fields) =>
            void updateWord(mine.id, fields).then(() => toast({ message: 'Đã lưu.' }))
          }
          onDelete={() => setConfirmDelete(true)}
        />
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Xóa khỏi từ điển cá nhân?"
        description="Ghi chú và tag của từ này sẽ bị xóa trên mọi thiết bị của bạn. Kho từ chung không bị ảnh hưởng."
        data-testid="word-delete-confirm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              data-testid="word-delete-yes"
              onClick={() => {
                setConfirmDelete(false);
                void deleteWord(mine!.id).then(() => {
                  toast({ message: 'Đã xóa khỏi từ điển cá nhân.' });
                  onBack();
                });
              }}
            >
              Xóa
            </Button>
          </>
        }
      />
    </Card>
  );
}

function PersonalSection({
  item,
  lessonTitle,
  onSave,
  onDelete,
}: {
  item: VocabularyItem;
  lessonTitle: (id: string) => string | null;
  onSave: (fields: { notes: string | null; tags: string[] }) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? '');
  const [tags, setTags] = useState(item.tags.join(', '));
  // The saved values changed (this device or another one, after a pull): show them. Compared by
  // value, so re-reading the same entry from IndexedDB never wipes what the learner is typing.
  const savedTags = item.tags.join(', ');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(item.notes ?? '');
  }, [item.notes]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTags(savedTags);
  }, [savedTags]);
  const dirty = notes !== (item.notes ?? '') || tags !== savedTags;

  return (
    <div className="mt-5 border-t border-line pt-4" data-testid="word-personal">
      <Textarea
        label="Ghi chú của tôi"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        data-testid="word-notes"
      />
      <Input
        label="Tag"
        hint="Cách nhau bằng dấu phẩy"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="mt-3"
        data-testid="word-tags"
      />
      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() =>
            onSave({
              notes: notes.trim() || null,
              tags: [
                ...new Set(
                  tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                ),
              ].slice(0, 20),
            })
          }
          data-testid="word-save"
        >
          Lưu
        </Button>
        <Button size="sm" variant="secondary" onClick={onDelete} data-testid="word-delete">
          Xóa khỏi từ điển cá nhân
        </Button>
      </div>
      <h3 className="mb-1 mt-4 text-sm font-semibold text-fg-muted">Đã thêm</h3>
      <ul className="text-sm text-fg-muted" data-testid="word-additions">
        {item.additions.map((a) => (
          <li key={a.key}>
            {new Date(`${a.studyDate}T00:00:00`).toLocaleDateString('vi-VN')} ·{' '}
            {a.lessonId ? `Bài: ${lessonTitle(a.lessonId) ?? a.lessonId}` : METHOD[a.method]}
          </li>
        ))}
      </ul>
    </div>
  );
}
