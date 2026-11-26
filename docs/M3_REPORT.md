# M3 — Báo cáo final QA (quiz engine + spaced repetition)

## Nghiệm thu cuối — bản ứng dụng `29bb191`

Phần này cập nhật trạng thái các mục Pending trong nhật ký lịch sử bên dưới.

- CI [45843709547](https://github.com/dorai4vn/mandarin-ai/actions/runs/45843709547): 6/6 job PASS, gồm database/pgTAP và ba browser engine.
- Preview READY, SHA đã đối chiếu với Vercel; HTTP login/practice 200. [Preview cố định](https://mandarin-ap73y05v2-dorai4vn.vercel.app).
- Owner xác nhận 7/7 smoke PASS: login, từ vựng/quiz, ba dạng câu hỏi, tổng kết, offline/reload, reconnect sync, thiết bị thứ hai. [Biên bản](https://github.com/dorai4vn/mandarin-ai/pull/25#issuecomment-7198495996).
- Review chéo GPT đọc trực tiếp SQL/RLS/RPC, adapter, store, QuizScreen, persistence queue, queue inputs, SRS và test persistence. Đây là review tĩnh có trọng tâm, không phải audit toàn bộ; Claude review phiên riêng không được tính là independent reviewer. Không có workflow file trong diff với main tại thời điểm review.
- I3: đề xuất backlog, ưu tiên ràng buộc user-scoped và dedupe payload ID ở DB sau khi duyệt migration riêng; không chọn hash client đơn thuần. Exactly-once server chỉ theo operation ID, không theo payload ID.
- Giới hạn còn lại: queue chưa lưu có thể mất khi đóng trang; snapshot nhiều tab có thể đua ghi; chưa tái hiện trong smoke. P4 chỉ đo Chromium CPU 4×; chưa có benchmark browser nhiều orphan hoặc đo trên thiết bị thật. Không suy rộng PASS sang M1/M2 Cloud.
- Khuyến nghị GO có điều kiện, giữ nguyên code ứng dụng. Production chưa được duyệt; không merge, không áp migration. Commit tài liệu có thể tự kích hoạt CI theo workflow hiện hành.

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
| Không N+1 khi tải phiên | Xem dưới | Test tự động số lần gọi store (`queue-inputs.test.ts`): không tăng theo số thẻ |

## pgTAP: quiz_attempts, RLS, replay

- **Phát hiện:** M3 **không có bảng `quiz_attempts` hay `review_cards` phía server** (không có migration nào). `docs/ARCHITECTURE.md` mô tả chúng cho giai đoạn sau. Attempt và learning event đi qua `sync_operations` (`entity_type = 'quiz_attempt' | 'learning_event'`), lịch ôn là phép chiếu cục bộ từ attempts.
- Vì vậy **không thể** viết pgTAP "quiz_attempts RLS" theo đúng tên bảng nếu không thêm migration. **Không thêm migration** (chưa được duyệt). Nếu muốn bảng thật + `UNIQUE(idempotency_key)` + `UNIQUE(user_id, vocabulary_item_id, skill)` cho `review_cards`, cần owner duyệt migration riêng.
- Đã thêm `supabase/tests/quiz_attempt_ops_rls.test.sql` (11 kiểm tra, không đổi schema): attempt + event applied; replay cả batch → `duplicate`; replay lẻ ở lần push sau → `duplicate`; đúng 1 hàng mỗi loại sau 3 lần push; không UPDATE/DELETE (42501); user B không thấy dữ liệu của A, replay operation id của A bị `rejected` và không tạo hàng; `anon` không đọc được.
- **Verified-local:** `pnpm exec supabase start …` + `supabase db reset` + `supabase test db` → 4 file, 50 test, `Result: PASS` (gồm file mới).
- Giới hạn: test này chứng minh exactly-once theo `operation_id` ở tầng log. Tính duy nhất theo `payload.id` (attempt id) khi **hai operation_id khác nhau** mang cùng attempt id chỉ được bảo đảm ở client (ID xác định `att-<session>-<n>` + projection), **không** ở server. **Pending** nếu cần bảo đảm phía server.

## Due index và N+1

- **Client (nơi M3 truy vấn due):** Dexie store `cards: 'key, [skill+due], skill'`; `dueCards`/`countDue` dùng `.where('[skill+due]').between(...)` (`apps/web/src/offline/store.ts`), không quét toàn bộ. P4 (12 000 thẻ) đạt trên Chromium.
- **Server (log đồng bộ):** `EXPLAIN (ANALYZE, BUFFERS)` **Verified-local** trên Postgres thật với 24 000 operation của một user, truy vấn pull `user_id = … and server_seq > 23000 order by server_seq limit 200`: `Index Scan using sync_operations_user_seq`, 10 buffer hit, thực thi 0,073 ms. Không có truy vấn "due" phía server vì không có bảng review_cards.
- **N+1:** `buildSessionIds` (dùng bởi `QuizScreen.start()`) gọi store tối đa 3 lần (`cardedItemIds`, `dueCards`, `listCards` chỉ ở recall), độc lập với số thẻ; có test tự động (xem trên).

## Thẻ due mồ côi (orphan) — đã chốt và sửa

- **Quyết định sản phẩm (owner):** chỉ tính và chọn thẻ có từ hợp lệ (tồn tại, chưa xóa) trong từ điển cá nhân của user hiện tại; lọc **trước** `limit`; **không** tự xóa dữ liệu mồ côi.
- **Cài đặt:** `IndexedDbStore.dueCards/countDue` (và `MemoryStore`) lọc theo tập id từ còn sống của chính DB tài khoản (`vocab`, loại tombstone) ngay trong truy vấn index `[skill+due]` trước `.limit()`. Thẻ mồ côi vẫn nằm trong `cards`. `QuizScreen.start()` dùng helper `quiz/queue-inputs.ts#buildSessionIds`.
- **Test (unit, CI):** `quiz/queue-inputs.test.ts` (IndexedDB + memory): (a) 45 thẻ mồ côi cũ hơn đứng trước 3 thẻ hợp lệ + 2 từ đã xóa → `dueCards` trả đúng 3, `countDue` = 3, thẻ mồ côi vẫn còn trong `listCards`; (b) phiên `due`/`mixed` không vượt giới hạn và chỉ chứa từ hợp lệ; (c) D-L 12 000 thẻ mồ côi + 7 thẻ hợp lệ → vẫn chọn đủ 7, count nhất quán; (d) **số lần gọi store không đổi** giữa 10 và 600 thẻ cho cả 4 chế độ (≤ 3 lần). `quiz-store.test.ts` "due query" nay tạo từ trước khi có thẻ (hệ quả của quy tắc mới, không nới assertion).
- **Đánh đổi/giới hạn (cần biết):** lọc theo index + filter nghĩa là chi phí truy vấn tỉ lệ với **số thẻ mồ côi nằm trong khoảng due**, không còn O(limit) khi có rất nhiều orphan. Đo timing trên fake-indexeddb vô nghĩa (chậm hàng chục lần trình duyệt: ~4 s cho 3 000 orphan) nên unit test **không** khẳng định thời gian; P4 thật vẫn do `e2e/perf-quiz.spec.ts` (Chromium, CPU 4×) – chạy local sau thay đổi này: pass. Nếu orphan tích tụ lớn, cần dọn dẹp có chủ đích (chưa làm theo quyết định "không xóa tự động").

## Chống trùng attempt id với operation_id khác (đánh giá, chưa triển khai)

Hiện trạng: server chỉ đảm bảo exactly-once theo `operation_id` (`sync_operations`). Hai operation_id khác nhau cùng `payload.id` sẽ thành 2 hàng log; client hiện chặn qua projection (`attempts` khóa theo `payload.id`) nên lịch ôn không đổi, nhưng log server và `learning_event` đếm đôi. Attempt id là xác định (`att-<session>-<n>`) và operation_id sinh theo thiết bị/clock, nên trùng chủ yếu khi bug client hoặc client độc hại.

| Phương án | Ưu | Nhược |
| --- | --- | --- |
| A. Giữ nguyên, chỉ client-projection (hiện tại) | Không migration; replay không đổi lịch | Log server có thể chứa trùng; analytics phải dedupe |
| B. Dedupe khi đọc/phân tích (view/query `DISTINCT ON (payload->>'id')`) | Không đổi ghi; rẻ | Chỉ che; chi phí mỗi lần đọc |
| C. Làm `operation_id` xác định từ attempt id (client sinh `op = hash(entity, payload.id)`) | Dùng đúng ràng buộc có sẵn; không migration server | Đổi contract client↔ID; thiết bị cũ đã gửi op ngẫu nhiên không được dedupe hồi tố |
| D. Index unique một phần trên `(user_id, entity_type, (payload->>'id'))` cho `quiz_attempt`/`learning_event` | Bảo đảm cứng tại DB | **Cần migration** + xử lý dữ liệu đã trùng + quyết định status trả về (`duplicate`) |
| E. Bảng `quiz_attempts` thật + `UNIQUE(user_id, attempt_id)` | Đúng mô tả ARCHITECTURE; truy vấn due phía server | Migration lớn, đổi server contract |

Đề xuất: **C** (rẻ, tương thích) ngắn hạn, **D** nếu cần bảo đảm cứng; cả hai cần owner duyệt. **Không làm gì ở chặng này** (không migration, không đổi contract).

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
3. Chọn phương án chống trùng attempt id (C/D ở trên) — cần owner duyệt.
5. Smoke thiết bị thật (M1/M2/M3), P4 trên Firefox/WebKit/thiết bị thật.
6. Independent review.

## Chạy trong chặng orphan (local, Verified-local)

- `prettier --check .`, `pnpm lint` (0 lỗi; 1 warning sẵn có "unused eslint-disable" ở `QuizScreen.tsx`), `pnpm typecheck`, `vitest` (58 test pass) — pass.
- Playwright `retries=0` sau `next build` có dev token: `chromium-*` `m3-quiz` + `perf-quiz`: 19 pass, 2 skip, **3 fail** (`offline answers … synced exactly once`, cả mobile/tablet/desktop): thất bại **giống hệt trên HEAD gốc** (đã `git stash` kiểm chứng ở desktop) — chờ chip "Đã đồng bộ" vì môi trường này không có Supabase/sync backend. Không xem là PASS; CI quyết định.
- `firefox-*` `m3-quiz` + `perf-quiz` + `ui4-feedback` (bỏ test sync): 39 pass, 9 skip, một số test `ui4-feedback` (toast "Đồng bộ ngay", banner offline) fail — chưa kiểm chứng trên HEAD gốc, nhiều khả năng cùng nguyên nhân thiếu backend sync; **chưa kết luận**, chờ CI.
- WebKit: không chạy local (chưa cài).

## Xử lý findings self-review (HEAD d71417b) — đây là **self-review**, KHÔNG phải independent review

| ID | Trạng thái | Thay đổi / bằng chứng |
| --- | --- | --- |
| I1 (double answer, resume/cross-tab cùng attemptId) | **Đã sửa (Verified-local)** | `QuizScreen.tsx`: cờ đồng bộ `answering` (ref) đặt ngay trong tick đầu tiên của `answer()` → key-repeat/double click/click+phím không chấm điểm lần 2 trước khi React render lại. Sau mỗi lần ghi, `AttemptPersistQueue` đọc lại attempt đã lưu; nếu khác `correct` với điều UI đã hiện (tab khác trả lời trước cùng attemptId) → trả `conflict`, **không** ghi đè session, UI hiện thẻ `quiz-conflict` + nút "Tải lại phiên" (nạp session canonical). Không đổi schema/contract. |
| I2 (lỗi ghi bị báo hoàn thành giả) | **Đã sửa (Verified-local)** | Hàng đợi tuần tự `persist-queue.ts`: lỗi ghi **giữ job** (cùng attempt id), job sau xếp hàng chờ; `flush()` chỉ trả `saved` khi mọi thứ đã bền. `finish()` chỉ đặt `completed` + hiện summary sau khi flush + `putSession` + event thành công; lỗi → ở lại câu hỏi với `quiz-save-error` + nút `quiz-retry-save`, nút "Câu tiếp" bị khóa. Thử lại an toàn vì `recordAttempt`/event id idempotent. |
| I3 (operation_id xác định theo attempt id) | **Chỉ đề xuất — cần owner duyệt** | Xem mục "Chống trùng attempt id…". Bổ sung threat model: hash theo user-scope chỉ làm 2 op hợp lệ cùng attempt trùng nhau; **không** ngăn client độc hại "preclaim" operation_id của attempt khác trong cùng user nếu server không kiểm tra khớp `operation_id == f(entity, payload.id)`; chặn cứng cần D/E (migration). Chưa triển khai. |
| Benchmark browser nhiều orphan | **Chưa làm** (hết lượt) — P4 12000 thẻ hiện có không đổi, p95 thật của kịch bản orphan chưa đo. |
| SRS out-of-order studyDate (D-007) | **Đã thêm test** | `review.test.ts`: studyDate đi lùi theo stamp → lịch neo theo attempt cuối theo stamp, mọi hoán vị + redelivery cho cùng thẻ; skill khác không ảnh hưởng. |
| Lint | **Đã dọn** | `eslint --report-unused-disable-directives`: directive `set-state-in-effect` ở `refreshCounts` là thừa (đã xóa); 2 directive còn lại được lint yêu cầu (đã thử xóa → lỗi) nên giữ. |

Test mới: `apps/web/src/quiz/persist-queue.test.ts` (lỗi ghi/retry/finish; trùng id; conflict; đua 2 kết nối IndexedDB cùng DB), `m3-quiz.spec.ts` (burst keydown 1 tick → đúng 1 attempt; 2 tab cùng session → đúng 1 attempt, conflict nếu khác kết quả).

Thay đổi hành vi: summary chỉ hiện sau khi lưu xong (không còn tức thời) → helper `runToSummary` chờ "summary hoặc câu kế tiếp" sau mỗi lần bấm Next (không nới assertion).

### Chạy local (Verified-local, retries=0)
- `prettier --check .` pass; `eslint . --report-unused-disable-directives` pass; `tsc --noEmit` (web) pass; `vitest` web 69 pass, domain 47 pass.
- Playwright chromium-desktop + chromium-tablet (`next build` có dev token): `m3-quiz` + `ui4-feedback` + `realtime`: 33 pass, 3 skip, **6 fail** = 3 test × 2 project (`m3-quiz offline answers…synced exactly once`, `ui4-feedback "Đồng bộ ngay" toast`, `ui4-feedback offline banner`): chip sync ở `local-only` vì môi trường không có Supabase/sync backend (test sync đầu tiên đã được kiểm chứng giống hệt trên HEAD gốc ở chặng trước; 2 test ui4 chưa kiểm chứng riêng trên HEAD gốc). **Không claim PASS** cho 6 test này. Test mới I1 chạy lặp 3 lần × 2 project: 12/12 pass.
- Firefox/WebKit/9 project: chưa chạy local; chờ CI.
