import { RequireAuth } from '@/components/auth/RequireAuth';
import { PageHeader } from '@/components/ui';
import { DictionaryScreen } from '@/learning/DictionaryScreen';

export const metadata = { title: 'Từ điển cá nhân' };

/** Dictionary (M2, PRD-01/02): your words + the shared lexicon, searchable offline. */
export default function Dictionary() {
  return (
    <>
      <PageHeader
        title="Từ điển cá nhân"
        lead="Kho từ vựng tiếng Trung của riêng bạn. Lưu những từ đã học để ôn tập, luyện viết và theo dõi tiến độ học tập. (Ôn tập, luyện viết và theo dõi tiến độ sẽ có trong các bản sau.)"
      />
      <RequireAuth>
        <DictionaryScreen />
      </RequireAuth>
    </>
  );
}
