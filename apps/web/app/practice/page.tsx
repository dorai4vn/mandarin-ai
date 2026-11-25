import { Badge, ButtonLink, Card, PageHeader } from '@/components/ui/index';

export const metadata = { title: 'Luyện tập' };

/**
 * Practice — honest M0 version (SCREEN_BLUEPRINTS_V2 §4): the six QuizType modes with their
 * milestone; no simulated quiz session. The handwriting frame is a technical lab, labelled so.
 */
const MODES = [
  ['Nhận nghĩa', 'Xem chữ Hán, chọn nghĩa tiếng Việt.', 'M3'],
  ['Nhận Hán tự', 'Xem nghĩa hoặc pinyin, chọn chữ Hán.', 'M3'],
  ['Ghép pinyin', 'Ghép âm tiết và thanh điệu.', 'M3'],
  ['Nghe chọn đáp án', 'Nghe câu, chọn đáp án đúng.', 'M6'],
  ['Nghe viết', 'Nghe và gõ lại chữ Hán hoặc pinyin.', 'M6'],
  ['Viết tay', 'Viết chữ Hán theo gợi ý, chấm nét.', 'M5'],
] as const;

export default function Practice() {
  return (
    <>
      <PageHeader
        title="Luyện tập"
        lead="Sáu dạng bài, mỗi kỹ năng (nghĩa, viết, nghe, nói) có lịch ôn riêng. Các dạng bài sẽ mở dần theo milestone."
      />
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="practice-modes">
        {MODES.map(([name, desc, m]) => (
          <li key={name}>
            <Card
              as="article"
              headingLevel="h2"
              title={name}
              action={<Badge>Ra mắt ở {m}</Badge>}
              className="h-full"
            >
              <p className="text-sm text-fg-muted">{desc}</p>
            </Card>
          </li>
        ))}
      </ul>
      <Card variant="subtle" className="mt-6">
        <p className="text-sm text-fg-muted">
          Muốn thử khung viết ngay? Đây là phòng thử kỹ thuật (nhận dạng có thể đang tắt trên bản
          này), chưa phải bài luyện có chấm điểm.
        </p>
        <ButtonLink href="/lab/handwriting" variant="secondary" className="mt-3">
          Mở Phòng thử › Viết chữ Hán
        </ButtonLink>
      </Card>
    </>
  );
}
