'use client';
import type { Lexeme } from '@mandarin/contracts';
import { numberedToMarked } from '@mandarin/domain';
import { useEffect, useState } from 'react';
import { Button, Dialog, Input, Textarea } from '@/components/ui';
import { HanziText, Pinyin } from '@/components/Hanzi';
import { useLearning, type AddResult } from './LearningProvider';

const EMPTY = { simplified: '', pinyin: '', meaningVi: '', example: '', notes: '', tags: '' };

/**
 * Manual entry (PRD-01): Hanzi, pinyin (numbers become tone marks), Vietnamese meaning, optional
 * example/notes/tags. If the Hanzi exists in the shared lexicon the app SUGGESTS linking to it —
 * it never silently overwrites what the learner typed. Duplicates link instead of repeating.
 */
export function AddWordDialog({
  open,
  onClose,
  onAdded,
  initialHanzi = '',
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (r: AddResult) => void;
  initialHanzi?: string;
}) {
  const { lexemes, addWord, storeReady } = useLearning();
  const [f, setF] = useState({ ...EMPTY, simplified: initialHanzi });
  const [lexemeId, setLexemeId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({});
  const [busy, setBusy] = useState(false);
  // Each time the dialog opens, start from the Hanzi typed in the search box (if any).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setF({ ...EMPTY, simplified: initialHanzi });
  }, [open, initialHanzi]);

  const suggestions: Lexeme[] = f.simplified.trim()
    ? [...lexemes.values()].filter((l) => l.simplified === f.simplified.trim()).slice(0, 3)
    : [];
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setF((v) => ({ ...v, [k]: e.target.value }));
    if (k === 'simplified') setLexemeId(null);
  };
  const close = () => {
    setF({ ...EMPTY });
    setLexemeId(null);
    setErrors({});
    onClose();
  };

  const submit = async () => {
    // The local database opens asynchronously on a cold start; saving before that would fail.
    if (!storeReady || busy) return;
    const e: typeof errors = {};
    if (!f.simplified.trim()) e.simplified = 'Hãy nhập chữ Hán.';
    if (!f.pinyin.trim()) e.pinyin = 'Hãy nhập pinyin.';
    if (!f.meaningVi.trim()) e.meaningVi = 'Hãy nhập nghĩa tiếng Việt.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await addWord({
        lexemeId,
        method: 'manual',
        fields: {
          simplified: f.simplified.trim(),
          traditional: lexemeId ? (lexemes.get(lexemeId)?.traditional ?? null) : null,
          pinyin: numberedToMarked(f.pinyin),
          meaningVi: f.meaningVi.trim(),
          example: f.example.trim() || null,
          notes: f.notes.trim() || null,
          tags: [
            ...new Set(
              f.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            ),
          ].slice(0, 20),
        },
      });
      close();
      onAdded(r);
    } catch {
      // Never fail silently: keep the dialog and what was typed, and say what happened.
      setErrors({ simplified: 'Chưa lưu được từ. Hãy thử lại.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Thêm từ"
      dismissible={false}
      data-testid="add-word-dialog"
      actions={
        <>
          <Button variant="secondary" onClick={close}>
            Hủy
          </Button>
          <Button
            loading={busy}
            disabled={!storeReady}
            onClick={() => void submit()}
            data-testid="add-word-save"
          >
            Lưu từ
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          label="Chữ Hán"
          lang="zh-Hans"
          value={f.simplified}
          onChange={set('simplified')}
          error={errors.simplified}
          autoComplete="off"
          data-testid="add-word-hanzi"
          data-autofocus=""
        />
        {suggestions.length > 0 && !lexemeId && (
          <div
            className="rounded-control bg-primary-subtle p-3 text-sm"
            data-testid="add-word-suggestion"
          >
            <p className="mb-2 text-fg-muted">Có trong từ điển:</p>
            {suggestions.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <HanziText className="text-lg">{l.simplified}</HanziText>{' '}
                  <Pinyin>{l.pinyin}</Pinyin> — {l.meaningVi}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setLexemeId(l.id);
                    setF((v) => ({
                      ...v,
                      pinyin: l.pinyin,
                      meaningVi: l.meaningVi,
                      example: v.example || l.example || '',
                    }));
                  }}
                >
                  Dùng mục này
                </Button>
              </div>
            ))}
          </div>
        )}
        <Input
          label="Pinyin"
          hint="Có thể gõ số thanh: ni3 hao3 → nǐ hǎo"
          value={f.pinyin}
          onChange={set('pinyin')}
          onBlur={() => setF((v) => ({ ...v, pinyin: numberedToMarked(v.pinyin) }))}
          error={errors.pinyin}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          data-testid="add-word-pinyin"
        />
        <Input
          label="Nghĩa tiếng Việt"
          value={f.meaningVi}
          onChange={set('meaningVi')}
          error={errors.meaningVi}
          autoComplete="off"
          data-testid="add-word-meaning"
        />
        <Input
          label="Ví dụ"
          optional
          value={f.example}
          onChange={set('example')}
          autoComplete="off"
        />
        <Textarea label="Ghi chú" optional rows={2} value={f.notes} onChange={set('notes')} />
        <Input
          label="Tag"
          optional
          hint="Cách nhau bằng dấu phẩy, ví dụ: HSK1, động từ"
          value={f.tags}
          onChange={set('tags')}
          autoComplete="off"
          data-testid="add-word-tags"
        />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
