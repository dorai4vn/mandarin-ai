# M2 — Báo cáo: Từ điển, Giáo trình (D-043)

Ngày: 2026-11-25 · Phạm vi: `docs/MILESTONES_CLAUDE_CODE.md` mục M2, làm theo hướng đơn giản (D-043).

## Người học làm được gì
- **Từ điển cá nhân** (`/dictionary`, đổi tên theo yêu cầu UX của chủ dự án; route giữ nguyên):
  - Mô tả trang: kho từ vựng tiếng Trung của riêng người học (từ đã lưu, ghi chú, tag, nguồn gốc). Ôn tập, luyện viết, theo dõi tiến độ là **tính năng tương lai** (M3+), trang ghi rõ điều này.
  - Ô tìm kiếm tìm trong **từ đã lưu và kho từ chung**; kết quả chia hai nhóm "Đã lưu" và "Gợi ý từ kho chung" (nhãn "Đã lưu"/"Gợi ý" trên từng dòng; gợi ý có viền nét đứt).
  - Tên menu "Từ điển cá nhân" hiện đầy đủ ở mọi khổ màn hình (thanh điều hướng dưới xuống hai dòng trên điện thoại hẹp, không cắt chữ — kiểm bằng E2E).
  - Tìm bằng chữ Hán (giản thể/phồn thể), pinyin (có dấu, số thanh hoặc không dấu) hoặc tiếng Việt (không cần dấu).
  - Một từ đã lưu chỉ hiện một lần (trong nhóm "Đã lưu"), không lặp lại ở nhóm gợi ý.
  - Xem chi tiết: chữ Hán, phồn thể, pinyin, nghĩa, ví dụ kèm bản dịch, các bài có từ này.
  - **Thêm vào từ của tôi**; ghi chú, tag; nguồn gốc "Đã thêm" (ngày, cách thêm, bài); xóa có xác nhận.
  - Desktop: danh sách và chi tiết cạnh nhau. Điện thoại: danh sách → chi tiết, có nút quay lại.
- **Thêm từ tay:**
  - Pinyin gõ số tự đổi thành dấu (`ni3 hao3` → `nǐ hǎo`).
  - Nếu chữ Hán có trong từ điển, app **gợi ý** "Dùng mục này" và không tự ghi đè.
  - Thêm trùng thì **liên kết** vào mục đã có, không tạo mục thứ hai.
- **Giáo trình** (`/library` → Giáo trình): khóa "Khởi động tiếng Trung" (3 chương, 8 bài, 66 từ, D-012).
  - Trang bài học hiện danh sách từ và tiến độ "x/y từ đã có".
  - **Thêm tất cả** vào từ của tôi: từ đã có từ bài khác được liên kết (ví dụ 天 có ở hai bài vẫn là một mục, ghi nhận cả hai bài).
- **Offline và đa thiết bị:**
  - Từ cá nhân lưu trên máy ngay, đồng bộ lên server và sang thiết bị khác của cùng tài khoản (log đồng bộ M1).
  - Nội dung dùng chung tải một lần, sau đó đọc được khi server không truy cập được.

## Kỹ thuật
- **Database:**
  - `20261126000000_m2_shared_content.sql`:
    - các bảng `lexemes`, `courses`, `chapters`, `lessons`, `lesson_lexemes`;
    - RLS chỉ cho `SELECT` với người đã đăng nhập, `anon` không có quyền;
    - index cho khóa ngoại; view `content_version`.
  - `20261126000100_m2_starter_content.sql` **được sinh** từ `packages/domain` bằng `scripts/gen-starter-seed.mjs`. CI kiểm `--check` nên DB và app không bao giờ lệch nhau.
- **API:**
  - `GET /v1/content/version` và `GET /v1/content` (cần đăng nhập).
  - Bản live: `SupabaseContentStore` đọc PostgREST bằng JWT người dùng.
  - Bản dev/E2E: bộ nội dung khởi động có nhãn MOCK.
- **Domain:**
  - `dictionary/search.ts`: khóa tìm kiếm, đổi pinyin số → dấu, chấm điểm.
  - `vocabulary/projection.ts`: last-writer-wins theo field, additions dạng tập hợp, tombstone, tìm trùng.
  - `content/starter.ts`.
- **Web:**
  - Tìm kiếm dùng index tính sẵn (`searchKeys` một lần cho mỗi mục; mỗi lần gõ chỉ chuẩn hóa truy vấn), tối đa 50 kết quả.
  - `LearningProvider` (snapshot có phiên bản và cache IndexedDB; ghi từ vựng qua outbox).
  - IndexedDB schema v2 (`vocab`, `content`).
  - `DictionaryScreen`, `AddWordDialog`, `CourseList`, `LessonScreen`.

## Kiểm thử
- **Unit:**
  - tìm kiếm và pinyin;
  - projection hội tụ dù nhận thao tác theo thứ tự nào; áp lại một thao tác không đổi gì;
  - tombstone, tìm trùng;
  - nội dung khởi động hợp lệ: id duy nhất, mọi từ của bài có trong lexicon, 天 là một lexeme.
- **pgTAP `shared_content_rls`** (13): người học chỉ đọc được, không thêm/sửa/xóa lexicon, khóa học hay bài; `anon` không đọc được.
- **`scripts/test-data-isolation.mjs`:** thêm 4 kiểm tra trên Supabase thật: snapshot live, phiên bản khớp, không sửa được lexicon qua REST, `anon` không đọc được.
- **E2E `m2-dictionary.spec.ts`** (Chromium/Firefox/WebKit × 3 thiết bị):
  - tìm 山 bằng 5 cách nhập, thêm từ, ghi chú/tag còn sau khi tải lại;
  - nhập tay, gợi ý lexeme, liên kết khi trùng, kiểm tra trường bắt buộc;
  - thêm cả bài và liên kết từ chung giữa hai bài;
  - đọc nội dung khi API bị chặn;
  - hai thiết bị cùng tài khoản;
  - luồng điện thoại.

## Tiêu chí thoát M2
| Tiêu chí | Kết quả |
|---|---|
| Lexeme dùng chung không bị nhân bản giữa các bài | Đạt (pgTAP + unit: 天 một lexeme, hai dòng `lesson_lexemes`) |
| Người dùng thường không sửa được lexicon dùng chung hay từ của người khác | Đạt (pgTAP, REST thật, RLS `sync_operations` M1) |
| Lịch sử học theo từng người dùng | Đạt (nguồn gốc thêm từ nằm trong log của chính tài khoản) |
| Đọc offline mục đã tải (nơi có IndexedDB) | Đạt (E2E: API bị chặn vẫn tìm được) |
| Desktop: danh sách + chi tiết cạnh nhau | Đạt (E2E `layout.spec`) |
| Hiệu năng: tạo bộ dữ liệu D-L, P2 p95 < 200 ms | **Đạt.** `e2e/perf-dictionary.spec.ts` sinh D-L (12 000 lexeme, tất định), Chromium `mobile-mid` (CPU chậm 4×): p50 khoảng 45 ms, **p95 khoảng 90–118 ms** (chạy 4 lần). Lần đo đầu được 445 ms; đạt sau khi tính sẵn khóa tìm kiếm mỗi snapshot và giới hạn 50 kết quả. Test chặn trong CI |

## Việc chủ dự án cần làm
Áp hai migration M2 theo thứ tự lên dự án Supabase (SQL Editor):
1. `supabase/migrations/20261126000000_m2_shared_content.sql`
2. `supabase/migrations/20261126000100_m2_starter_content.sql`

Hai migration này cần các bước M1 (migration `sync_operations` và biến `SUPABASE_PUBLISHABLE_KEY` trên Railway). Cả hai chỉ thêm bảng và dữ liệu nội dung, không động vào dữ liệu người dùng.
