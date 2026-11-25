import { RequireAuth } from '@/components/auth/RequireAuth';
import { PageHeader } from '@/components/ui';
import { DictionaryScreen } from '@/learning/DictionaryScreen';

export const metadata = { title: 'Từ điển cá nhân' };

/** Personal dictionary (M2, PRD-01/02): the learner's saved words + suggestions from the shared lexicon. */
export default function Dictionary() {
  return (
    <>
      <PageHeader
        title="Từ điển cá nhân"
        lead="Kho từ vựng tiếng Trung của riêng bạn: những từ bạn đã lưu, kèm ghi chú, tag và nguồn gốc. Ôn tập, luyện viết và theo dõi tiến độ từ danh sách này sẽ có trong các bản sau."
      />
      <RequireAuth>
        <DictionaryScreen />
      </RequireAuth>
    </>
  );
}
