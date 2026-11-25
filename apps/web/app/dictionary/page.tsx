import { RequireAuth } from '@/components/auth/RequireAuth';
import { PageHeader } from '@/components/ui';
import { DictionaryScreen } from '@/learning/DictionaryScreen';

export const metadata = { title: 'Từ điển' };

/** Dictionary (M2, PRD-01/02): your words + the shared lexicon, searchable offline. */
export default function Dictionary() {
  return (
    <>
      <PageHeader
        title="Từ điển"
        lead="Tìm bằng chữ Hán, pinyin (có hoặc không dấu) hoặc tiếng Việt. Từ của bạn dùng được cả khi offline."
      />
      <RequireAuth>
        <DictionaryScreen />
      </RequireAuth>
    </>
  );
}
