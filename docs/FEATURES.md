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
