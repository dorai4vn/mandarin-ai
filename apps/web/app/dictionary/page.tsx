import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/index';

export const metadata = { title: 'Từ điển' };

/**
 * Dictionary — honest M0 version (SCREEN_BLUEPRINTS_V2 §3): the M0 sample words were removed
 * (sample data lives only in the component gallery, labelled "Ví dụ"). Search, lexicon and personal
 * vocabulary arrive in M2; stroke etymology in M5; pronunciation audio in M6.
 */
const COMING = [
  ['Tìm theo Hán tự, pinyin (có hoặc không dấu) và tiếng Việt', 'M2'],
  ['Từ vựng cá nhân: ghi chú, tag, thêm vào ôn tập', 'M2'],
  ['Chiết tự có nguồn', 'M5'],
  ['Nghe phát âm', 'M6'],
] as const;

export default function Dictionary() {
  return (
    <>
      <PageHeader title="Từ điển" lead="Từ điển tiếng Trung và từ vựng cá nhân của bạn." />
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card data-testid="dictionary-empty">
          <EmptyState
            variant="coming-soon"
            hanzi="字"
            headingLevel="h2"
            title="Từ điển sẽ có ở đây"
            description="Tìm từ, xem nghĩa, ví dụ và lưu vào từ vựng của bạn."
            milestone="M2"
          />
        </Card>
        <Card title="Sắp có" headingLevel="h2">
          <ul className="flex flex-col gap-3">
            {COMING.map(([text, m]) => (
              <li key={text} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0 text-fg">{text}</span>
                <Badge className="shrink-0">{m}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
