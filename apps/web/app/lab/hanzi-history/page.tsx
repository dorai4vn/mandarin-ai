import { HanziHistory } from '@/hanzi/HanziHistory';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Lab: lịch sử chữ Hán (M3.5)' };

/** Auth-free pilot page for the M3.5 historical animation (山). Same component as the dictionary. */
export default function HanziHistoryLab() {
  return (
    <>
      <PageHeader
        title="Lịch sử chữ Hán — thử nghiệm"
        lead="Pilot M3.5: 山 với các giai đoạn có nguồn."
      />
      <HanziHistory glyph="山" />
    </>
  );
}
