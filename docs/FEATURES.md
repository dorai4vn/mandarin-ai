# Mandarin AI — Danh mục tính năng (FEATURES)

Trạng thái: `Chưa bắt đầu` · `Đang làm` · `MOCKED` (chạy bằng adapter giả, có nhãn) · `VERIFIED` (có bằng chứng thật) · `BLOCKED` (thiếu tài nguyên bên ngoài) · `Hoàn thành` (đạt tiêu chí nghiệm thu PRD).

Cập nhật lần cuối: 2026-11-24 — web app cross-platform (D-018, D-028). Phạm vi 11 module giữ nguyên. Trạng thái M0-PWA xem `docs/M0_PWA_REPORT.md`; bảng hạ tầng cuối file là của M0 native (PR #1).

| PRD | Tính năng | Milestone | Trạng thái | Ghi chú |
|---|---|---|---|---|
| PRD-01 | Nhập từ vựng hằng ngày (shared lexicon + custom vocabulary, provenance) | M2 | Chưa bắt đầu | Thiết kế dữ liệu đã chốt (D-001, D-006) |
| PRD-02 | Từ điển cá nhân, tìm kiếm Hanzi/Pinyin/tiếng Việt, tags/topics | M2 | Chưa bắt đầu | |
| PRD-03 | Hanzi visual etymology có nguồn | M5 | Chưa bắt đầu | |
| PRD-04 | Quiz & spaced repetition theo skill | M3 | Đang làm (contract) | M0: registry 6 QuizType + mapping skill (D-002, D-007) |
| PRD-05 | Mini game gợi ý → viết tay (canvas Pointer Events + HandwritingRecognitionPort) | M5 | Đang làm (spike) | M0-PWA: canvas touch/mouse/pen + adapter server (D-029, chờ duyệt giấy phép) |
| PRD-06 | Nghe & nói (Azure, OpenAI voice) | M6 | Đang làm (spike) | M0: ghi âm + đường Azure + spike auth Realtime (D-004) |
| PRD-07 | AI tutor | M7 | Chưa bắt đầu | |
| PRD-08 | Import ảnh/văn bản/PDF | M4 / M7 | Chưa bắt đầu | Test bằng PDF mẫu tự tạo |
| PRD-09 | Gamification (XP engine) | M7 | Chưa bắt đầu | M3 chỉ phát learning events (D-003) |
| PRD-10 | Nhắc nhở & lịch ôn | M7 | Chưa bắt đầu | Web Push nơi hỗ trợ + nhắc trong app mọi nơi (D-024, chờ duyệt) |
| PRD-11 | Learning Library & import giáo trình | M2 / M4 | Chưa bắt đầu | Starter fixture (D-012) |

## Trạng thái thực tế M0-PWA (cập nhật 2026-11-23)

Phân loại: **THẬT** = chạy bằng mã/hạ tầng thật · **MOCK** = adapter giả có nhãn, không phải tích hợp thật · **CHƯA TRIỂN KHAI** = chưa có mã · **TẮT** = có mã nhưng bị tắt có chủ đích.

| Chức năng | Trạng thái | Chi tiết trung thực |
|---|---|---|
| Layout responsive phone/tablet/desktop (D-030) | THẬT | E2E Chromium/Firefox/WebKit × 3 viewport |
| Phát hiện khả năng trình duyệt + thông báo tương thích | THẬT | Chạy hoàn toàn trên trình duyệt |
| Canvas viết tay (chạm/chuột/bút) | THẬT | Chỉ thu nét; nhận dạng là mục riêng |
| Nhận dạng chữ viết tay | **BLOCKED** (đóng ở M0, 2026-11-24) · TẮT trên Preview/production | HanziLookup chỉ chạy ở dev/test; giấy phép chưa duyệt (D-029) → đánh giá và chọn adapter ở **M5**; chất lượng chưa đo trên mẫu thật |
| Ghi âm → WAV 16 kHz, nghe lại, tốc độ chậm | THẬT (trên trình duyệt) | E2E Chromium/Firefox bằng micro giả; Safari: kiểm tay |
| Chấm phát âm Azure | **Chưa kích hoạt trong M0** (chủ dự án chấp nhận) | Không có khóa; Preview: `disabled` (503) hoặc `mock` có nhãn khi bật `ALLOW_MOCKS_IN_PREVIEW`; `live` chỉ khi có khóa — M6 |
| OpenAI Realtime (khóa tạm thời) | **Chưa kích hoạt trong M0** (chủ dự án chấp nhận) | Không có khóa; `disabled`/`mock` như trên; không có hội thoại thật — M6/M7 |
| Upload PDF (tối đa **50 MB**/tệp — D-040) | THẬT ở trình duyệt + API; lưu trữ MOCK in-memory **chỉ ở development**; Preview/production cần Supabase (không có thì 503) | Giới hạn 52 428 800 byte dùng chung web/API; CI kiểm 20/49/50 MiB và 50 MiB + 1 trên **Supabase Storage local thật**; Cloud: kiểm tay B7. Upload một request qua API (chưa resumable — M4). `docs/PDF_UPLOAD.md` |
| Lưu offline cục bộ (IndexedDB) + hàng đợi outbox | THẬT (trên trình duyệt) | Có fallback bộ nhớ tạm khi không có IndexedDB |
| Đồng bộ lên server | **MOCK (chỉ development)** · **TẮT trên Preview/production** | Server dev lưu trong RAM (`MemorySyncOperationStore`), mất khi khởi động lại. Trên Preview/production `/health` báo `sync: disabled`: trình duyệt đọc trạng thái này (GET /health, 200), **không gửi** `POST /v1/sync/push`, giữ dữ liệu trong IndexedDB/outbox và hiện "Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt." (không phải lỗi). Mock không bao giờ được coi là đã lưu (D-035). Postgres `sync_operations` thuộc M1 |
| Đồng bộ tiến độ giữa nhiều thiết bị | CHƯA TRIỂN KHAI | Chỉ có chiều gửi lên (push); chiều tải về thuộc M1 |
| Đăng nhập email + mật khẩu (tài khoản do admin tạo — D-037, D-038) | THẬT (mã + GoTrue local trong CI) / chưa kiểm trên dự án dev | `signInWithPassword`, lỗi chung, không đăng ký/OTP. CI chứng minh trên GoTrue **local** thật, không Mailpit: đăng ký/anonymous bị từ chối, user do admin tạo đăng nhập được, sai mật khẩu và email lạ trả cùng lỗi, mật khẩu < 12 ký tự bị từ chối. Trên `mandarin-ai-dev`: smoke test A12–A12d. Membership `app_members`, bắt buộc đổi mật khẩu, cookie session: M1 |
| PWA: manifest, service worker, cài đặt | THẬT, tùy chọn | Offline navigation đã kiểm tự động trên Chromium/Firefox; Safari: kiểm tay |
| Quản trị tài khoản (tạo + mật khẩu tạm, khóa, cấp lại mật khẩu tạm) | Dashboard Supabase (thủ công) | Runbook `docs/ACCESS_CONTROL.md` mục 8; script admin + membership M1 |
| Quên mật khẩu tự phục vụ qua email | **TẠM HOÃN** | Cần Custom SMTP (D-038); admin cấp mật khẩu tạm thay thế |
| Nhắc học (in-app bắt buộc, Web Push tùy chọn) | CHƯA TRIỂN KHAI | M7 (D-024 đã duyệt) |
| Từ điển, thư viện, quiz, SRS, PDF pipeline, AI tutor, XP | CHƯA TRIỂN KHAI | Chỉ có khung giao diện/placeholder; M2–M7 |
| Supabase: bảng `profiles` + RLS | THẬT (local/CI) | Chưa áp dụng lên dự án Supabase dev |

## Hạ tầng M0 (native — lịch sử, PR #1)

| Hạng mục | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| Monorepo pnpm + Turborepo, lockfile | VERIFIED | `pnpm install --frozen-lockfile`, `check:deps` |
| Lint / typecheck / unit test / build | VERIFIED | 34 unit test pass (xem `docs/M0_REPORT.md`) |
| QuizType registry 6 loại + skill mapping | VERIFIED | test `contracts`, `domain` |
| API Node.js (health, auth JWT, rate limit) | VERIFIED (local) | 9 test API + smoke `/health` |
| Supabase local: migration `profiles` + RLS | VERIFIED (local) | pgTAP 9/9 PASS; policy rò rỉ → FAIL 2/9 |
| Bundle JS iOS + `expo prebuild` | VERIFIED (cấu hình) | `expo export`, `expo prebuild` |
| ML Kit Digital Ink 山 | BLOCKED | Cần EAS build + iPhone; app rơi về MOCK có nhãn |
| Ghi âm micro iPhone | BLOCKED | Cần iPhone |
| Azure pronunciation | MOCKED / BLOCKED | Cần `AZURE_SPEECH_KEY` + iPhone |
| OpenAI Realtime client secret | MOCKED / BLOCKED | Cần `OPENAI_API_KEY` |
| SQLCipher + Keychain | BLOCKED | Cần dev build trên iPhone |
| EAS development build | BLOCKED | Cần tài khoản Expo, Apple Developer, `EXPO_TOKEN` |
| CI GitHub Actions | Đã cấu hình | Kết quả lần chạy đầu xem trên PR |
