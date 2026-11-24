import { Card, PageHeader } from '@/components/ui';
import { HanziText, Pinyin } from '@/components/Hanzi';

export const metadata = { title: 'Từ điển' };

const SAMPLE = [
  { hanzi: '山', pinyin: 'shān', vi: 'núi' },
  { hanzi: '水', pinyin: 'shuǐ', vi: 'nước' },
  { hanzi: '人', pinyin: 'rén', vi: 'người' },
];

/** Layout preview: phone = list only; tablet/desktop = list + detail side by side (D-030). Data arrives in M2. */
export default function Dictionary() {
  return (
    <>
      <PageHeader
        title="Từ điển cá nhân"
        lead="Tìm theo Hán tự, pinyin hoặc tiếng Việt (M2). Dữ liệu dưới đây là bản xem trước bố cục."
      />
      <div className="grid gap-4 md:grid-cols-[minmax(14rem,1fr)_2fr]">
        <Card title="Danh sách">
          <ul className="divide-y divide-line">
            {SAMPLE.map((w) => (
              <li key={w.hanzi} className="flex items-baseline gap-3 py-2">
                <HanziText className="text-2xl">{w.hanzi}</HanziText>
                <Pinyin className="text-ink-2">{w.pinyin}</Pinyin>
                <span className="ml-auto">{w.vi}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Chi tiết" className="hidden md:block">
          <p className="text-ink-2">
            Chọn một từ để xem nghĩa, ví dụ, lịch sử chữ và tiến độ học (M2, M5).
          </p>
        </Card>
      </div>
    </>
  );
}
