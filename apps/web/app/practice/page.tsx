import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';

export const metadata = { title: 'Luyện tập' };

const MODES = [
  ['Nhận nghĩa', 'M3'],
  ['Nhận Hán tự', 'M3'],
  ['Ghép pinyin', 'M3'],
  ['Nghe chọn đáp án', 'M6'],
  ['Nghe viết', 'M6'],
  ['Viết tay', 'M5'],
] as const;

export default function Practice() {
  return (
    <>
      <PageHeader
        title="Luyện tập"
        lead="Sáu dạng bài trong QuizType registry; lịch ôn riêng cho nghĩa, viết, nghe, nói."
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MODES.map(([name, m]) => (
          <li key={name}>
            <Card>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-ink-2">Ra mắt ở {m}</p>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        Thử khung viết ngay:{' '}
        <Link className="text-link underline" href="/lab/handwriting">
          Phòng thử › Viết chữ Hán
        </Link>
      </p>
    </>
  );
}
