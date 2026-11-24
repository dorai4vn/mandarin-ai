# Mandarin AI — Danh mục tính năng (FEATURES)

Trạng thái: `Chưa bắt đầu` · `Đang làm` · `MOCKED` (chạy bằng adapter giả, có nhãn) · `VERIFIED` (có bằng chứng thật) · `BLOCKED` (thiếu tài nguyên bên ngoài) · `Hoàn thành` (đạt tiêu chí nghiệm thu PRD).

Cập nhật lần cuối: 2026-11-23 — web app cross-platform (D-018, D-028). Phạm vi 11 module giữ nguyên. Trạng thái M0-PWA xem `docs/M0_PWA_REPORT.md`; bảng hạ tầng cuối file là của M0 native (PR #1).

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
| Nhận dạng chữ viết tay | **TẮT** trên Preview/production (API từ chối `hanzilookup` ngoài development) | HanziLookup chỉ chạy ở dev/test; **chưa duyệt giấy phép** (D-029); chất lượng **chưa đo** (chỉ có nét tổng hợp) |
| Ghi âm → WAV 16 kHz, nghe lại, tốc độ chậm | THẬT (trên trình duyệt) | E2E Chromium/Firefox bằng micro giả; Safari: kiểm tay |
| Chấm phát âm Azure | MOCK / TẮT | Không có khóa; Preview mặc định TẮT (503) |
| OpenAI Realtime (khóa tạm thời) | MOCK / TẮT | Không có khóa; không có hội thoại thật |
| Upload PDF | THẬT ở phía trình duyệt + API; lưu trữ MOCK in-memory **chỉ ở development**; Preview/production cần Supabase (không có thì 503) | Với `SUPABASE_SERVICE_ROLE_KEY` + bucket private → lưu thật vào Supabase Storage (chưa kiểm vì chưa có dự án) |
| Lưu offline cục bộ (IndexedDB) + hàng đợi outbox | THẬT (trên trình duyệt) | Có fallback bộ nhớ tạm khi không có IndexedDB |
| Đồng bộ lên server | **MOCK (chỉ development)** · **TẮT trên Preview/production** | Server dev lưu trong RAM (`MemorySyncOperationStore`): không phải database, mất khi khởi động lại. Trên Preview/production API trả 503 và trình duyệt **không** coi xác nhận mock là đã lưu (D-035) → dữ liệu ở lại máy, hiện "chờ đồng bộ". Postgres `sync_operations` thuộc M1 |
| Đồng bộ tiến độ giữa nhiều thiết bị | CHƯA TRIỂN KHAI | Chỉ có chiều gửi lên (push); chiều tải về thuộc M1 |
| Đăng nhập OTP email (chỉ người được mời — D-037) | THẬT (mã) / chưa kiểm | Cần dự án Supabase với **signup TẮT**; spike M0 còn `shouldCreateUser: true` (sửa khi được phép); membership `app_members` + kiểm tra ở API thuộc M1 |
| PWA: manifest, service worker, cài đặt | THẬT, tùy chọn | Offline navigation đã kiểm tự động trên Chromium/Firefox; Safari: kiểm tay |
| Quản trị tài khoản (mời, khóa, khôi phục mật khẩu) | Dashboard Supabase (thủ công) | Runbook `docs/ACCESS_CONTROL.md`; script admin + membership M1 |
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
