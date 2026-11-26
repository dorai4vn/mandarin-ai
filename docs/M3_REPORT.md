# M3 — Báo cáo final QA (quiz engine + spaced repetition)

Branch `claude/issue-19-20261126-0441` (PR #25), HEAD khi bắt đầu chặng này: `e610302`, CI run 45805304987 success.
Quy ước nhãn: **Verified-local** = đã chạy trong môi trường dev của chặng này · **CI** = đã xanh trong CI của PR · **Production** = chưa có · **Pending** = chưa làm/chưa có bằng chứng.

> **Chưa có independent review.** Báo cáo này do chính tác giả mã viết; không tự nhận review độc lập đã hoàn tất. Chưa deploy Production, chưa áp migration lên Supabase Cloud.

## Tiêu chí thoát M3 (`docs/MILESTONES_CLAUDE_CODE.md`)

| Tiêu chí | Bằng chứng | Trạng thái |
| --- | --- | --- |
| Lịch ôn đúng với đúng/sai theo từng skill | `packages/domain/src/review/review.test.ts`; `quiz-store.test.ts` (meaning/writing tách riêng) | CI (unit) |
| Không trùng attempt/event sau replay | Client: `quiz-store.test.ts` (replay, hội tụ 2 thiết bị, redelivery). Server: pgTAP `quiz_attempt_ops_rls.test.sql` (mới, 11 kiểm tra) | Client: CI. Server pgTAP: **Verified-local** (chưa chạy trên CI trong chặng này — job `database` sẽ chạy khi push) |
| Quiz offline, đồng bộ sau | `e2e/m3-quiz.spec.ts` | CI (3 engine × 3 khổ) |
| Dùng được bằng bàn phím trên desktop | `e2e/m3-quiz.spec.ts` | CI; thiết bị thật: **Pending** |
| P4 < 100 ms, D-L 12 000 thẻ, offline | `e2e/perf-quiz.spec.ts`: p95 khoảng 19 ms (n = 69), chỉ chặn trên Chromium (CPU 4×) | CI (Chromium). Firefox/WebKit **không** đo throttle (xem dưới) |
| Truy vấn due có index | Xem dưới | Client: có index; server: không có bảng |
| Không N+1 khi tải phiên | Xem dưới | Verified bằng đọc mã; chưa có test tự động |

## pgTAP: quiz_attempts, RLS, replay

- **Phát hiện:** M3 **không có bảng `quiz_attempts` hay `review_cards` phía server** (không có migration nào). `docs/ARCHITECTURE.md` mô tả chúng cho giai đoạn sau. Attempt và learning event đi qua `sync_operations` (`entity_type = 'quiz_attempt' | 'learning_event'`), lịch ôn là phép chiếu cục bộ từ attempts.
- Vì vậy **không thể** viết pgTAP "quiz_attempts RLS" theo đúng tên bảng nếu không thêm migration. **Không thêm migration** (chưa được duyệt). Nếu muốn bảng thật + `UNIQUE(idempotency_key)` + `UNIQUE(user_id, vocabulary_item_id, skill)` cho `review_cards`, cần owner duyệt migration riêng.
- Đã thêm `supabase/tests/quiz_attempt_ops_rls.test.sql` (11 kiểm tra, không đổi schema): attempt + event applied; replay cả batch → `duplicate`; replay lẻ ở lần push sau → `duplicate`; đúng 1 hàng mỗi loại sau 3 lần push; không UPDATE/DELETE (42501); user B không thấy dữ liệu của A, replay operation id của A bị `rejected` và không tạo hàng; `anon` không đọc được.
- **Verified-local:** `pnpm exec supabase start …` + `supabase db reset` + `supabase test db` → 4 file, 50 test, `Result: PASS` (gồm file mới).
- Giới hạn: test này chứng minh exactly-once theo `operation_id` ở tầng log. Tính duy nhất theo `payload.id` (attempt id) khi **hai operation_id khác nhau** mang cùng attempt id chỉ được bảo đảm ở client (ID xác định `att-<session>-<n>` + projection), **không** ở server. **Pending** nếu cần bảo đảm phía server.

## Due index và N+1

- **Client (nơi M3 truy vấn due):** Dexie store `cards: 'key, [skill+due], skill'`; `dueCards`/`countDue` dùng `.where('[skill+due]').between(...)` (`apps/web/src/offline/store.ts`), không quét toàn bộ. P4 (12 000 thẻ) đạt trên Chromium.
- **Server (log đồng bộ):** `EXPLAIN (ANALYZE, BUFFERS)` **Verified-local** trên Postgres thật với 24 000 operation của một user, truy vấn pull `user_id = … and server_seq > 23000 order by server_seq limit 200`: `Index Scan using sync_operations_user_seq`, 10 buffer hit, thực thi 0,073 ms. Không có truy vấn "due" phía server vì không có bảng review_cards.
- **N+1:** `QuizScreen.start()` gọi store một số lần cố định (`cardedItemIds`, `dueCards`, và `listCards` ở chế độ recall), độc lập với kích thước hàng đợi; vòng lặp tạo queue chỉ chạy trên bộ nhớ. **Chưa có test tự động** khẳng định số lần gọi — **Pending**.

## Rủi ro đã ghi ở P4: thẻ due mồ côi (orphan)

- **Xác nhận bằng đọc mã, chưa sửa:** `start()` lấy `dueCards(..., limit = SESSION_LIMITS.due * 2)` rồi mới lọc `items.has(vocabularyItemId)`. Nếu từ đã bị xóa khỏi từ điển cá nhân mà thẻ còn, thẻ mồ côi (a) vẫn được `countDue` đếm (bộ đếm "đến hạn" lớn hơn số câu thực tế) và (b) có thể chiếm chỗ trong giới hạn trước khi lọc, làm thẻ hợp lệ bị đẩy ra ngoài phiên.
- Chưa sửa vì thay đổi hành vi nằm ngoài phạm vi "bổ sung test/bằng chứng" và cần quyết định sản phẩm (xóa thẻ khi xóa từ? hay bỏ qua?). **Pending**, đề xuất: đếm/lọc theo tập từ hiện có ở cùng truy vấn hoặc dọn thẻ khi xóa từ, kèm test.

## 76 WebKit skip (không phải 18)

CI run 45805304987, job WebKit: **402 passed, 76 skipped**. Con số "18" không khớp log; số liệu thực là 76. Phân loại từ log (tất cả là `test.skip` có điều kiện sẵn có, chưa đổi coverage):

- Chỉ chạy ở desktop hoặc một lớp thiết bị (layout, shell, ui1, ui4, typography, upload, upload-limits, m2 phone list): phần lớn các skip.
- `perf-quiz` P4 và `perf-dictionary` P2: 3 skip mỗi file (CPU throttling chỉ có trên Chromium/CDP, ghi trong `docs/PERFORMANCE.md`).
- `audio.spec.ts`: 3 skip (Playwright WebKit không có thiết bị media giả).
- `layout.spec.ts` "keyboard": WebKit không focus link bằng Tab theo mặc định Safari (6 skip).
- **Không có skip nào của `m3-quiz.spec.ts`** hay `realtime.spec.ts` trên WebKit.
- Hệ quả: P4 trên WebKit **chưa đo** và âm thanh/Tab-keyboard trên Safari thật là **Pending** (cần thiết bị thật).

## Chạy trong chặng này

- Chỉ thêm file SQL test và tài liệu; **không đổi mã ứng dụng**, nên không chạy lại E2E 9 project (không có thay đổi hành vi để kiểm). Không chạy được Playwright WebKit trong môi trường này (chưa cài trình duyệt/phụ thuộc).
- Cần CI của PR chạy job `database` để pgTAP mới có bằng chứng CI.

## Rà soát M1/M2 (không tự đánh PASS)

- **M1:** `docs/M1_REPORT.md` tự ghi "Đạt" phần lớn mục nhưng: mục 10 "Xem PR", mục 11 "3 engine: chờ CI"; các smoke trên thiết bị thật và Dashboard thật (M1-1…M1-8) **chưa có bằng chứng** trong repo. Kết luận: **không đánh PASS toàn phần**; tự động hóa/CI = có, thiết bị thật + Cloud = Pending.
- **M2:** `docs/M2_REPORT.md` mô tả tính năng + test tự động; migration shared content chưa áp lên Cloud trong phạm vi chặng này; smoke thiết bị thật Pending. Không đánh PASS toàn phần.
- Cả hai: không có independent review.

## Việc còn lại (Pending)

1. CI xanh với pgTAP mới (job `database`).
2. Quyết định migration thật cho `quiz_attempts`/`review_cards` (cần owner duyệt) nếu muốn ràng buộc phía server theo attempt id.
3. Sửa/chốt hành vi thẻ due mồ côi + test.
4. Test tự động số lần gọi store trong `start()` (N+1).
5. Smoke thiết bị thật (M1/M2/M3), P4 trên Firefox/WebKit/thiết bị thật.
6. Independent review.
