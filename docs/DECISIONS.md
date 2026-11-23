# Mandarin AI — Nhật ký quyết định kiến trúc (DECISIONS)

Đây là **nguồn quyết định kiến trúc chính thức** của dự án (D-005). Khi `MASTER_PRD.md`, `ARCHITECTURE.md` hoặc `MILESTONES_CLAUDE_CODE.md` mô tả khác với file này, file này được ưu tiên và tài liệu kia phải được sửa lại.

Quy ước:
- Mỗi quyết định có: **ID**, **Ngày**, **Trạng thái** (Đề xuất / Đã duyệt / Thay thế bởi D-xxx), **Bối cảnh**, **Lựa chọn**, **Lý do**, **Hậu quả**.
- Không sửa nội dung quyết định đã duyệt; nếu thay đổi thì thêm quyết định mới và đánh dấu quyết định cũ là "Thay thế bởi".
- "Chủ dự án" = người sở hữu repository `dorai4vn/mandarin-ai`.

---

## D-000 — Stack nền tảng (baseline v1.2)
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt
- **Bối cảnh:** PRD v1.2 và ARCHITECTURE v1.2 đã chốt stack trước M0.
- **Lựa chọn:** Expo React Native + TypeScript (iOS-first, Android-ready), Supabase (Postgres/Auth/Storage/RLS), SQLite trên thiết bị, OpenAI, Azure AI Speech (pronunciation assessment), Google ML Kit Digital Ink. Kiến trúc modular monolith + module contracts + ports/adapters.
- **Lý do:** Một codebase cho iOS/Android; Supabase cung cấp Auth + RLS; các nhà cung cấp AI được bọc sau port để thay thế được.
- **Hậu quả:** Không dùng Expo Go để nghiệm thu; không chạy JavaScript tải từ xa như plugin; không microservice sớm.

## D-001 — Tách shared lexicon và custom vocabulary của người học
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Bối cảnh:** PRD-01 cho phép người học tự nhập từ, nhưng ARCHITECTURE v1.2 quy định lexicon dùng chung chỉ đọc → mâu thuẫn về đường ghi dữ liệu.
- **Lựa chọn:**
  - `lexemes`/`lexeme_senses`/dữ liệu Hanzi = **shared lexicon** (dữ liệu chuẩn). Người dùng thường chỉ SELECT; ghi chỉ qua `service_role` (import pipeline/API) hoặc `content_admins`.
  - `custom_lexemes` = từ vựng do người học tạo; RLS chỉ chủ sở hữu đọc/ghi.
  - `vocabulary_items` = mục từ điển cá nhân, tham chiếu **đúng một** trong hai nguồn (CHECK constraint).
- **Lý do:** Bảo vệ chất lượng dữ liệu chuẩn, vẫn cho người học tự do ghi chú/nhập từ; không ai sửa được nội dung chuẩn hoặc từ của người khác.
- **Hậu quả:** Cần luồng "đề xuất liên kết" (`custom_lexemes.suggested_lexeme_id`); bắt buộc test RLS âm (user A không sửa được lexicon chuẩn, không đọc/sửa được custom của user B) từ M2.

## D-002 — QuizType registry có đủ 6 loại
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Bối cảnh:** PRD-04 liệt kê 6 loại quiz; ARCHITECTURE v1.2 chỉ liệt kê 5 (thiếu Hanzi recognition).
- **Lựa chọn:** Registry có version gồm đúng 6 loại khởi đầu: `meaning_recognition`, `hanzi_recognition`, `pinyin_matching`, `audio_recognition`, `dictation`, `handwriting`. Mỗi loại khai báo `id`, `version`, `skill`, schema câu trả lời và grader.
- **Lý do:** Nhất quán với PRD; thêm loại mới bằng đăng ký, không sửa grader cũ.
- **Hậu quả:** `packages/contracts` và `packages/domain` có test khẳng định đủ 6 loại, id duy nhất, mỗi loại map tới một skill hợp lệ.

## D-003 — XP engine thuộc M7; M3 chỉ phát learning events
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Bối cảnh:** Tiêu chí M3 yêu cầu "không cộng XP trùng" trong khi gamification thuộc M7.
- **Lựa chọn:** Từ M3, luồng học chỉ ghi `learning_events` (idempotent). Không tính/cộng XP trước M7. XP engine M7 tiêu thụ event (kể cả event cũ) và ghi `xp_ledger` với `source_event_id UNIQUE`.
- **Lý do:** Tránh logic XP tạm thời; event log là nguồn sự thật để tính lại.
- **Hậu quả:** Yêu cầu XP bị loại khỏi tiêu chí nghiệm thu M3; M7 phải có test back-fill và chống cộng trùng.

## D-004 — OpenAI Realtime: M0 chỉ spike khả thi/xác thực; M6 ưu tiên turn-based
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** M0 chỉ chứng minh backend phát hành được client secret ngắn hạn cho người dùng đã xác thực. M6 triển khai voice turn-based trước; Realtime chỉ bật (feature flag) sau khi chứng minh ổn định trên thiết bị thật.
- **Lý do:** Realtime phức tạp, chi phí và độ ổn định chưa rõ trên mạng di động.
- **Hậu quả:** Kết quả mock luôn gắn nhãn `MOCK` và **không bao giờ** được báo cáo là live test thành công.

## D-005 — `docs/DECISIONS.md` là nguồn ADR chính thức
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** Một file duy nhất, mỗi quyết định có ID, ngày, bối cảnh, lựa chọn, lý do, hậu quả. Không tạo thư mục ADR riêng.
- **Hậu quả:** PR thay đổi kiến trúc phải cập nhật file này.

## D-006 — Provenance của từ vựng; bảng tags/topics thật
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** Bảng `vocabulary_additions` (mỗi lần thêm/gặp từ một dòng): `study_date`, `lesson_id`, `source_document_id`, `import_batch_id`, `source_page`, `entry_method`, `idempotency_key`. Bảng `import_batches`, `topics`, `tags`, `vocabulary_item_topics`, `vocabulary_item_tags`, `vocabulary_addition_topics` với foreign key thật; composite FK `(id, user_id)` để liên kết không bao giờ trộn dữ liệu hai người dùng.
- **Lý do:** Đáp ứng PRD-01 ("mỗi lần thêm gắn ngày học, bài, chủ đề, nguồn") mà v1.2 chưa có bảng.
- **Hậu quả:** Migration ở M2; test ràng buộc FK chéo người dùng.

## D-007 — Lịch ôn tập theo user + vocabulary item + skill
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** `review_cards(user_id, vocabulary_item_id, skill)` với `UNIQUE(user_id, vocabulary_item_id, skill)`; `skill ∈ {meaning, writing, listening, speaking}`. Mapping: `meaning_recognition`, `hanzi_recognition`, `pinyin_matching` → `meaning`; `audio_recognition`, `dictation` → `listening`; `handwriting` → `writing`; luyện nói (không phải QuizType) → `speaking`.
- **Lý do:** Nhớ nghĩa và viết được chữ là hai năng lực khác nhau; một lịch chung làm sai lệch SRS.
- **Hậu quả:** Upsert theo khóa unique để không tạo lịch trùng; test "sai ở writing không reset meaning".

## D-008 — Liên kết của speaking attempts
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** `speaking_attempts(user_id NOT NULL, vocabulary_item_id NULL, lesson_id NULL, quiz_attempt_id NULL, provider, provider_status, assessment_json, recording_key NULL, idempotency_key UNIQUE)`; composite FK giữ liên kết trong cùng một user.
- **Lý do:** Role-play tự do không có từ/bài cụ thể; bài luyện theo từ thì cần liên kết để ôn tập.
- **Hậu quả:** Migration ở M6.

## D-009 — Backend: Node.js TypeScript API deploy riêng; Railway là ứng viên hosting
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** `apps/api` là tiến trình Node.js (TypeScript, framework Fastify — xem D-015). PDF worker (M4) là entrypoint thứ hai trong cùng codebase. Cấu hình hoàn toàn qua biến môi trường. Railway là ứng viên hosting.
- **Lý do:** Giữ bí mật nhà cung cấp AI phía server; tách job nặng khỏi app.
- **Hậu quả:** Không deploy production trong M0; không dùng API riêng của Railway trong domain logic (chỉ qua biến môi trường/adapters).

## D-010 — Monorepo pnpm workspaces + Turborepo
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** pnpm workspaces + Turborepo; package tách theo module contract: `contracts` ← `domain` ← `adapters` ← `apps/*`.
- **Lý do:** Cache build/test, lockfile duy nhất, ranh giới module rõ ràng.
- **Hậu quả:** CI kiểm tra không có phụ thuộc vòng (`scripts/check-deps.mjs`); pnpm dùng `node-linker=hoisted` để tương thích Metro/Expo.

## D-011 — Bảo mật dữ liệu cục bộ
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án); kết quả kỹ thuật chờ kiểm chứng trên iPhone
- **Lựa chọn:** SQLCipher qua config plugin của `expo-sqlite` (`useSQLCipher: true`), khóa ngẫu nhiên 256-bit sinh trên thiết bị, lưu ở iOS Keychain qua `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Token đăng nhập lưu ở secure storage. Không ghi âm thanh/dữ liệu nhạy cảm xuống local nếu không cần.
- **Lý do:** PRD yêu cầu mã hóa dữ liệu nhạy cảm offline.
- **Hậu quả:** Nếu chưa chứng minh được trên dev build iOS → báo **BLOCKED** và đề xuất phương án an toàn (chỉ cache dữ liệu không nhạy cảm, ghi chú cá nhân chỉ trên server, hoặc mã hóa cấp trường bằng khóa Keychain) để chủ dự án duyệt.

## D-012 — Starter content là fixture nhỏ có nguồn gốc rõ ràng
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** Fixture tự soạn trong repo (`fixtures/starter/`), ghi rõ tác giả và giấy phép; nạp như bản ghi course/lexicon bình thường. Không hard-code nội dung HSK 3.0. PDF giáo trình thật do chủ dự án import sau khi app hoàn thành.
- **Hậu quả:** Test PDF dùng PDF mẫu tự tạo.

## D-013 — Bộ tài liệu vận hành
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Lựa chọn:** Tạo và duy trì `docs/DECISIONS.md`, `docs/FEATURES.md`, `docs/RELEASE_CHECKLIST.md`; đồng bộ PRD/ARCHITECTURE/MILESTONES lên v1.3 để không còn mâu thuẫn.

---

## Quyết định kỹ thuật phát sinh trong M0 (đề xuất, chờ chủ dự án duyệt khi nghiệm thu M0)

## D-014 — Baseline Expo SDK 58 / React Native 0.88 / iOS 16.4
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Bối cảnh:** Kiến trúc yêu cầu chọn SDK hiện hành và chốt iOS deployment target sau khi kiểm tra tương thích.
- **Lựa chọn:** `expo@~58.0.26`, `react-native@0.88.1`, `react@19.3.0`, TypeScript `~6.0.3`; iOS deployment target **16.4** (mức tối thiểu của `expo-modules-core` 58 và `expo-sqlite` 58). Phiên bản native module lấy theo `bundledNativeModules.json` của SDK 58.
- **Lý do:** SDK mới nhất ổn định tại thời điểm M0 (`latest` trên npm); SQLCipher có sẵn trong `expo-sqlite` 58.
- **Hậu quả:** Mức iOS cuối cùng chỉ chốt sau khi pod ML Kit Digital Ink được cài thành công trên EAS build (xem `docs/NATIVE_COMPATIBILITY.md`).

## D-015 — Fastify cho `apps/api`
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** Fastify 5 + zod (schema từ `packages/contracts`), xác thực JWT Supabase bằng `jose` (JWKS của dự án Supabase, hoặc secret HS256 cho môi trường local/test).
- **Lý do:** Ổn định, nhẹ, `inject()` giúp test không cần mở cổng mạng; không phụ thuộc nền tảng hosting.

## D-016 — Digital Ink qua local Expo module (Swift)
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** Module cục bộ `apps/mobile/modules/digital-ink` (Expo Modules API, Swift) dùng pod `GoogleMLKit/DigitalInkRecognition`, model `zh-Hani-CN`. JS gửi strokes dạng vector (x, y, t). Interface TS trùng với `DigitalInkPort`.
- **Lý do:** Không có thư viện React Native chính thức của Google; tự viết module mỏng giúp kiểm soát phiên bản và license.
- **Hậu quả:** Chỉ biên dịch được trên macOS/EAS; trong môi trường Linux chỉ kiểm tra được TypeScript và cấu hình.

## D-017 — Công cụ kiểm thử
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** Vitest cho packages và API; logic thuần của app mobile đặt trong file TS không import React Native để test bằng Vitest; kiểm tra build mobile bằng `expo export` (bundle JS iOS) và `expo prebuild` (sinh project iOS) trong CI; test RLS bằng SQL chạy trên Supabase local.
