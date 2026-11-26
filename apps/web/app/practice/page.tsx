import { RequireAuth } from '@/components/auth/RequireAuth';
import { Badge, ButtonLink, Card, PageHeader } from '@/components/ui';
import { QuizScreen } from '@/quiz/QuizScreen';

export const metadata = { title: 'Luyện tập' };

/**
 * Practice (M3): a real quiz session over the learner's saved words for the three meaning types
 * (nhận nghĩa, nhận Hán tự, ghép pinyin), and the six-type list with the milestone of each
 * other type. The handwriting frame is a technical lab, labelled so.
 */
const MODES = [
  ['Nhận nghĩa', 'Xem chữ Hán, chọn nghĩa tiếng Việt.', null],
  ['Nhận Hán tự', 'Xem nghĩa, chọn chữ Hán đúng.', null],
  ['Ghép pinyin', 'Xem chữ Hán, chọn pinyin đúng.', null],
  ['Nghe chọn đáp án', 'Nghe câu, chọn đáp án đúng.', 'M6'],
  ['Nghe viết', 'Nghe và gõ lại chữ Hán hoặc pinyin.', 'M6'],
  ['Viết tay', 'Viết chữ Hán theo gợi ý, chấm nét.', 'M5'],
] as const;

export default function Practice() {
  return (
    <>
      <PageHeader
        title="Luyện tập"
        lead="Ôn các từ trong từ điển cá nhân. Mỗi kỹ năng (nghĩa, viết, nghe, nói) có lịch ôn riêng; hiện luyện được kỹ năng nghĩa, các dạng bài còn lại sẽ mở dần theo milestone."
      />
      <RequireAuth>
        <QuizScreen />
      </RequireAuth>
      <h2 className="mb-3 mt-10 text-[22px] font-semibold leading-[30px] text-fg">Sáu dạng bài</h2>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="practice-modes">
        {MODES.map(([name, desc, m]) => (
          <li key={name}>
            <Card
              as="article"
              headingLevel="h2"
              title={name}
              action={
                m ? <Badge>Ra mắt ở {m}</Badge> : <Badge variant="success">Có thể luyện</Badge>
              }
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
