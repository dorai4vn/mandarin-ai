# Mandarin AI — Nhật ký quyết định kiến trúc (DECISIONS)

Đây là **nguồn quyết định kiến trúc chính thức** của dự án (D-005). Khi `MASTER_PRD.md`, `ARCHITECTURE.md` hoặc `MILESTONES_CLAUDE_CODE.md` mô tả khác với file này, file này được ưu tiên và tài liệu kia phải được sửa lại.

Quy ước:
- Mỗi quyết định có: **ID**, **Ngày**, **Trạng thái** (Đề xuất / Đã duyệt / Thay thế bởi D-xxx), **Bối cảnh**, **Lựa chọn**, **Lý do**, **Hậu quả**.
- Không sửa nội dung quyết định đã duyệt; nếu thay đổi thì thêm quyết định mới và đánh dấu quyết định cũ là "Thay thế bởi".
- "Chủ dự án" = người sở hữu repository `dorai4vn/mandarin-ai`.

---

## D-000 — Stack nền tảng (baseline v1.2)
- **Ngày:** 2026-11-23 · **Trạng thái:** Thay thế một phần bởi D-018 (phần Expo React Native, SQLite trên thiết bị, ML Kit Digital Ink). Supabase, OpenAI, Azure, modular monolith + ports/adapters vẫn hiệu lực.
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
- **Ngày:** 2026-11-23 · **Trạng thái:** Thay thế bởi D-022 (nguyên tắc tối thiểu hóa dữ liệu nhạy cảm vẫn giữ; SQLCipher/Keychain không áp dụng cho web)
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
- **Ngày:** 2026-11-23 · **Trạng thái:** Thay thế bởi D-018/D-019 (chưa từng được duyệt; giữ lại làm lịch sử)
- **Bối cảnh:** Kiến trúc yêu cầu chọn SDK hiện hành và chốt iOS deployment target sau khi kiểm tra tương thích.
- **Lựa chọn:** `expo@~58.0.26`, `react-native@0.88.1`, `react@19.3.0`, TypeScript `~6.0.3`; iOS deployment target **16.4** (mức tối thiểu của `expo-modules-core` 58 và `expo-sqlite` 58). Phiên bản native module lấy theo `bundledNativeModules.json` của SDK 58.
- **Lý do:** SDK mới nhất ổn định tại thời điểm M0 (`latest` trên npm); SQLCipher có sẵn trong `expo-sqlite` 58.
- **Hậu quả:** Mức iOS cuối cùng chỉ chốt sau khi pod ML Kit Digital Ink được cài thành công trên EAS build (xem `docs/NATIVE_COMPATIBILITY.md`).

## D-015 — Fastify cho `apps/api`
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** Fastify 5 + zod (schema từ `packages/contracts`), xác thực JWT Supabase bằng `jose` (JWKS của dự án Supabase, hoặc secret HS256 cho môi trường local/test).
- **Lý do:** Ổn định, nhẹ, `inject()` giúp test không cần mở cổng mạng; không phụ thuộc nền tảng hosting.

## D-016 — Digital Ink qua local Expo module (Swift)
- **Ngày:** 2026-11-23 · **Trạng thái:** Thay thế bởi D-020 (ML Kit Digital Ink không có SDK web)
- **Lựa chọn:** Module cục bộ `apps/mobile/modules/digital-ink` (Expo Modules API, Swift) dùng pod `GoogleMLKit/DigitalInkRecognition`, model `zh-Hani-CN`. JS gửi strokes dạng vector (x, y, t). Interface TS trùng với `DigitalInkPort`.
- **Lý do:** Không có thư viện React Native chính thức của Google; tự viết module mỏng giúp kiểm soát phiên bản và license.
- **Hậu quả:** Chỉ biên dịch được trên macOS/EAS; trong môi trường Linux chỉ kiểm tra được TypeScript và cấu hình.

## D-017 — Công cụ kiểm thử
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** Vitest cho packages và API; logic thuần của app mobile đặt trong file TS không import React Native để test bằng Vitest; kiểm tra build mobile bằng `expo export` (bundle JS iOS) và `expo prebuild` (sinh project iOS) trong CI; test RLS bằng SQL chạy trên Supabase local.
- **Cập nhật theo D-018:** phần Expo được thay bằng `next build` + Playwright (WebKit) — xem D-019. Vitest và pgTAP giữ nguyên.

---

## Chuyển hướng nền tảng sang Web/PWA (2026-11-23)

## D-018 — Chuyển từ React Native/Expo sang Next.js Web App + PWA (ưu tiên Safari iPhone)
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án); **phạm vi nền tảng được điều chỉnh bởi D-028** (cross-platform, không ưu tiên riêng Safari/iPhone; PWA là tùy chọn)
- **Bối cảnh:** Chủ dự án muốn dùng trực tiếp trên iPhone mà không phụ thuộc Apple Developer Program, TestFlight, EAS hay quy trình build native. M0 native chưa được build lần nào trên thiết bị.
- **Lựa chọn:** Ứng dụng web Next.js + TypeScript + Tailwind CSS, cài được bằng "Thêm vào Màn hình chính" (PWA), thiết kế mobile-first, nghiệm thu chính trên Safari iOS. Giữ nguyên 11 module PRD, Supabase, Fastify API, OpenAI, Azure Speech, modular monolith + contracts + ports/adapters + learning events.
- **Lý do:** Phân phối tức thì qua HTTPS, không cần ký ứng dụng; một codebase cho iPhone, Android và desktop.
- **Hậu quả:**
  - ML Kit Digital Ink không dùng được → thay bằng adapter nhận dạng chữ viết tay cho web/backend (D-020); chất lượng phải được đo lại, không được giả định.
  - SQLite/SQLCipher/Keychain → IndexedDB + Web Crypto (D-021, D-022), mức bảo vệ thấp hơn native.
  - Thông báo nhắc học trên iOS chỉ có qua Web Push khi đã thêm vào Màn hình chính, iOS ≥ 16.4; không có thông báo cục bộ khi offline (D-024).
  - Không có Background Sync trên Safari → đồng bộ khi mở app / có mạng lại (D-021).
  - Không có App Store/TestFlight; phân phối bằng URL HTTPS.
  - Code native M0 (`apps/mobile`) chỉ bị gỡ sau khi phần web tương đương đã có và được duyệt (xem `docs/MIGRATION_M0_PWA.md`).

## D-019 — Stack web cụ thể
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** `apps/web` dùng Next.js 16 (App Router, `output: 'standalone'`), React 19, Tailwind CSS 4, service worker bằng Serwist 9 (`@serwist/next`), IndexedDB qua Dexie 4, `@supabase/ssr` + `@supabase/supabase-js` cho Auth (chỉ publishable key). Test: Vitest (+ `fake-indexeddb`) cho logic, Playwright với **WebKit** + mô phỏng iPhone cho E2E; kiểm thử Safari iOS thật là thủ công, có bằng chứng.
- **Lý do:** Phiên bản ổn định mới nhất tại thời điểm lập kế hoạch (npm `latest`: next 16.4.6, @serwist/next 9.5.15, dexie 4.4.7, tailwindcss 4.3.5). Dexie đã xử lý nhiều lỗi IndexedDB của Safari; Serwist là công cụ PWA được duy trì cho Next.js.
- **Hậu quả:** Bản build production của Next.js phải dùng webpack nếu `@serwist/next` chưa hỗ trợ Turbopack cho production — kiểm chứng ở M0-PWA; phương án dự phòng là service worker viết tay biên dịch bằng `@serwist/cli`/esbuild.
- **Cập nhật khi triển khai M0-PWA:** dùng phương án dự phòng — service worker **viết tay** `apps/web/public/sw.js` (~60 dòng: network-first cho trang, cache-first cho asset tĩnh có hash, không cache API), không dùng plugin Serwist, để giữ build Turbopack mặc định của Next 16 và tránh thêm phụ thuộc. Playwright dùng bản 1.63.0 (trùng bản trình duyệt có sẵn trong môi trường cloud).

## D-020 — Nhận dạng chữ viết tay trên web qua `HandwritingRecognitionPort`
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất; bổ sung bởi D-029 (vị trí chạy adapter và giấy phép)
- **Bối cảnh:** PRD-05 yêu cầu nhận dạng từ nét vector (không OCR ảnh), không lộ đáp án trước khi nộp, ứng viên sai không được tính đúng.
- **Lựa chọn:** Đổi `DigitalInkPort` thành `HandwritingRecognitionPort` (cùng dữ liệu nét x, y, t đã có trong `@mandarin/contracts`). Canvas dùng Pointer Events thu nét. Các adapter ứng viên được **đánh giá** trong M0-PWA, chưa chọn mặc định:
  1. `hanzilookup-js` — nhận dạng nét offline ngay trên trình duyệt, trả danh sách ứng viên (code ISC; dữ liệu phái sinh từ Make Me a Hanzi — phải kiểm tra giấy phép dữ liệu trước khi dùng).
  2. Đối chiếu nét theo chữ đích bằng dữ liệu `hanzi-writer-data` (Arphic Public License) — chỉ trả lời "khớp/không khớp với chữ đích", chạy **sau khi nộp**; dùng để chấm và gợi ý thứ tự nét, không thay thế nhận dạng mở.
  3. Adapter backend trong `apps/api` (ví dụ dịch vụ thương mại như MyScript iink, hoặc mô hình tự host) — chỉ cân nhắc nếu (1) không đạt ngưỡng; cần chủ dự án duyệt chi phí/giấy phép.
  4. **Không dùng** endpoint không chính thức (ví dụ Google Input Tools) cho production.
- **Đánh giá bắt buộc:** bộ mẫu viết tay thật thu trên iPhone Safari (tối thiểu 20 chữ × 5 lượt, gồm 山), đo top-1/top-5, độ trễ, kích thước tải. Không ghi nhận chất lượng nào trước khi có số đo.
- **Hậu quả:** Grader `handwriting` trong `@mandarin/domain` giữ nguyên (chỉ ứng viên top-1 mới đúng). `source` của kết quả ghi rõ adapter nào (`live:hanzilookup`, `mock`…).

## D-021 — Offline queue + đồng bộ idempotent trên IndexedDB
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** IndexedDB (Dexie) chứa: nội dung đã tải (bài, từ, thẻ ôn), attempts cục bộ, và **outbox** gồm các mutation bất biến (`operation_id` ULID, `device_id`, `user_id`, `schema_version`, `logical_clock`, `payload`). Ghi state + outbox trong cùng một transaction IndexedDB. Đồng bộ chạy khi: mở app, sự kiện `online`, `visibilitychange` → visible, sau mỗi phiên học, và hẹn giờ khi app đang mở (Safari không có Background Sync). Server khử trùng lặp bằng `sync_operations.operation_id UNIQUE` + `idempotency_key` trên attempts/events, trả version chuẩn. Gọi `navigator.storage.persist()` và hiển thị số thao tác chưa đồng bộ; cảnh báo trước khi đăng xuất nếu outbox chưa rỗng.
- **Lý do:** Không mất tiến độ dù tab bị đóng, mất mạng hoặc iOS xóa bộ nhớ trình duyệt.
- **Hậu quả:** Test bắt buộc: chết tab giữa chừng → mở lại → gửi lại → đúng một bản ghi phía server.

## D-022 — Bảo vệ dữ liệu cục bộ trên web (thay D-011)
- **Ngày:** 2026-11-23 · **Trạng thái:** **Đã duyệt có điều kiện** (chủ dự án, 2026-11-23) — xem "Điều kiện duyệt" bên dưới
- **Lựa chọn:** (a) Tối thiểu hóa: chỉ lưu offline dữ liệu cần để học; ghi âm không lưu IndexedDB trừ khi đang chờ gửi và người học đồng ý; (b) trường nhạy cảm (ghi chú cá nhân, câu trả lời tự do) mã hóa AES-GCM bằng khóa Web Crypto **non-extractable** lưu trong IndexedDB; (c) phiên đăng nhập do Supabase quản lý, refresh token không đưa vào `localStorage` khi có lựa chọn cookie HttpOnly qua `@supabase/ssr`; (d) đăng xuất/xóa tài khoản xóa sạch IndexedDB, Cache Storage và service worker cache của người dùng.
- **Giới hạn phải nói rõ:** khóa nằm cùng thiết bị/trình duyệt nên (b) chỉ chống đọc file thô, **không** tương đương Keychain/SQLCipher; ai mở được trình duyệt đã đăng nhập vẫn xem được dữ liệu.

- **Điều kiện duyệt (chủ dự án, 2026-11-23):**
  - Chỉ lưu offline **tối thiểu** dữ liệu cần để học.
  - **Không** lưu trong IndexedDB: API secret (bất kỳ loại nào), refresh token, bản ghi âm nhạy cảm.
  - Web Crypto **không được quảng bá** là tương đương Keychain/SQLCipher của native (trong tài liệu, giao diện, tài liệu marketing).
- **Hiện trạng M0-PWA đối chiếu điều kiện:** IndexedDB chỉ chứa ghi chú thử nghiệm + outbox + `deviceId`/đồng hồ logic; âm thanh chỉ nằm trong bộ nhớ (không ghi xuống storage); không có secret phía client. **Lưu ý cho M1:** `@supabase/supabase-js` mặc định lưu phiên (gồm refresh token) trong `localStorage` — không vi phạm chữ "IndexedDB" nhưng trái tinh thần quyết định; M1 phải chuyển sang phiên dựa trên cookie HttpOnly (`@supabase/ssr` + route server) hoặc trình chủ dự án phương án khác trước khi bật đăng nhập thật. Mã hóa trường bằng Web Crypto (mục b) chưa triển khai.

## D-023 — Thu âm trên Safari: PCM → WAV 16 kHz phía client
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Bối cảnh:** `MediaRecorder` trên Safari xuất `audio/mp4` (AAC), trong khi Azure REST short-audio cần WAV PCM (hoặc OGG/Opus).
- **Lựa chọn:** `getUserMedia` + Web Audio `AudioWorklet` lấy PCM, giảm mẫu xuống 16 kHz mono 16-bit và đóng gói WAV ngay trên trình duyệt (logic thuần, có unit test). Phương án dự phòng (nếu AudioWorklet lỗi trên thiết bị): ghi `audio/mp4` bằng MediaRecorder và chuyển mã trên `apps/api` (cần thêm ffmpeg vào image — phải duyệt).
- **Hậu quả:** Contract `PronunciationAssessmentRequest` giữ WAV; thêm trường `audioMimeType` nếu dùng dự phòng.

## D-024 — Nhắc học trên web
- **Ngày:** 2026-11-23 · **Trạng thái:** **Đã duyệt** (chủ dự án, 2026-11-23): nhắc trong ứng dụng là **bắt buộc**, Web Push là **tùy chọn**
- **Bối cảnh:** Web không có "local notification" hẹn giờ khi offline; iOS chỉ cho Web Push với web app đã thêm vào Màn hình chính (iOS ≥ 16.4) và sau khi người dùng cho phép.
- **Lựa chọn:** PRD-10 giữ nguyên chức năng (lịch ôn, tùy chọn, giờ yên lặng, múi giờ) nhưng kênh gửi là: Web Push (VAPID) do server lên lịch + nhắc trong app (badge, banner khi mở). Lịch ôn vẫn tính đúng khi offline; chỉ việc *gửi thông báo* cần server và mạng.
- **Hậu quả:** Thêm bảng `push_subscriptions` và job lên lịch ở M7; tiêu chí nghiệm thu PRD-10 được viết lại cho web.
- **Bổ sung khi duyệt:** tiêu chí nghiệm thu PRD-10 yêu cầu nhắc trong ứng dụng hoạt động trên mọi trình duyệt; Web Push chỉ được kiểm nơi trình duyệt hỗ trợ và người dùng cho phép, thiếu Web Push không làm milestone thất bại.

## D-025 — Đăng nhập trong PWA
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Bối cảnh:** Web app đã thêm vào Màn hình chính trên iOS có bộ nhớ (cookie, IndexedDB) **tách riêng** khỏi Safari; link "magic link" trong email sẽ mở Safari chứ không mở app đã cài → đăng nhập không vào được app.
- **Lựa chọn:** Supabase Auth bằng **mã OTP 6 số qua email** (nhập ngay trong app) và/hoặc mật khẩu; không dựa vào magic link hay OAuth redirect cho luồng chính.

## D-026 — Hosting web
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** `apps/web` build `output: 'standalone'` (tiến trình Node chuẩn, có Dockerfile chung), cùng ứng viên hosting Railway như API (D-009); không dùng API riêng của nhà cung cấp hosting. HTTPS bắt buộc (getUserMedia, service worker). Môi trường dev trên iPhone thật dùng URL HTTPS (preview deploy hoặc tunnel). Không deploy production trong M0-PWA.

- **Cập nhật (2026-11-23):** Preview của web chạy trên **Vercel** theo yêu cầu chủ dự án (D-031); `output: 'standalone'` + Dockerfile vẫn giữ để có thể chạy ở host khác. API vẫn dùng Railway.

## D-027 — Quy trình Git cho việc chuyển đổi
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã áp dụng; chủ dự án xác nhận (2026-11-23): PR #1 và PR #2 **chưa merge**, `apps/mobile` **giữ đóng băng, chưa được xóa**
- **Lựa chọn:** Branch `claude/m0-pwa` tạo từ commit `7e20b16` (đầu PR #1) để giữ code tái sử dụng. PR #1 giữ nguyên, không merge, không đóng; chủ dự án tự đóng sau khi PR M0-PWA được duyệt. Code native chỉ gỡ trong commit riêng, sau khi phần web tương đương đã có và được duyệt.

---

## Điều chỉnh phạm vi: ứng dụng web cross-platform (2026-11-23)

## D-028 — Mandarin AI là cross-platform web application; PWA là progressive enhancement
- **Ngày:** 2026-11-23 · **Trạng thái:** Đã duyệt (chủ dự án)
- **Bối cảnh:** D-018 và các tài liệu v2.0 viết "ưu tiên Safari trên iPhone", dễ hiểu nhầm là sản phẩm chỉ dành cho iPhone/PWA.
- **Lựa chọn:**
  - Web app chạy trực tiếp trên trình duyệt desktop, laptop, tablet, smartphone; Windows, macOS, iOS, Android; Chrome, Edge, Firefox, Safari bản hiện đại (2 major gần nhất; Safari/iOS bản hiện hành và bản trước).
  - Một tài khoản, một hệ dữ liệu, tiến độ đồng bộ giữa mọi thiết bị.
  - Mọi tính năng cốt lõi hoạt động **không cần cài PWA**. Cài đặt, Web Push và offline là progressive enhancements, không bao giờ chặn truy cập.
  - Capability detection (không dựa vào user-agent) cho micro, audio, upload, IndexedDB, service worker, push; có giao diện xin quyền và thông báo tương thích riêng cho từng trình duyệt.
  - IndexedDB/cache/service worker có fallback: nếu không khả dụng, ứng dụng online vẫn hoạt động đầy đủ.
  - Canvas viết Hán tự dùng Pointer Events cho touch, mouse và stylus; không hard-code touch-only.
  - Kiểm thử tự động Playwright trên Chromium, Firefox, WebKit với viewport mobile, tablet, desktop; kiểm thử thật trên Safari iPhone **và** ít nhất một trình duyệt desktop trước khi nghiệm thu.
- **Lý do:** Người học dùng nhiều thiết bị (học trên máy tính, ôn trên điện thoại); không phụ thuộc một nền tảng.
- **Hậu quả:** Các câu "ưu tiên Safari/iPhone" trong tài liệu được thay thế; định hướng UX: *mobile-first trong kỹ thuật responsive, cross-platform-first trong phạm vi sản phẩm, desktop là trải nghiệm hoàn chỉnh*. Các ràng buộc riêng của Safari (D-021, D-024, D-025) vẫn giữ vì Safari vẫn là trình duyệt được hỗ trợ.

## D-029 — Adapter nhận dạng chữ viết tay mặc định chạy phía server
- **Ngày:** 2026-11-23 · **Trạng thái:** **CHƯA DUYỆT cho production** (chủ dự án, 2026-11-23). Việc chạy trên server **không** được coi là miễn trừ nghĩa vụ GPL. Không thay thư viện khi chưa duyệt. Rà soát giấy phép: `docs/HANDWRITING_LICENSE_REVIEW.md`.
- **Bối cảnh:** Kiểm tra trong M0-PWA: thư viện nhận dạng nét offline khả dụng là HanziLookupJS (code gốc **GPL-3**; gói npm `hanzilookup-js` 1.0.3 phái sinh từ đó nhưng ghi ISC — tình trạng giấy phép không rõ ràng) với dữ liệu `mmah.json` (phái sinh từ Make Me a Hanzi, **Arphic Public License**). Gửi code GPL xuống trình duyệt là phân phối và kéo theo nghĩa vụ GPL cho mã client.
- **Lựa chọn:** Chạy matcher **trên `apps/api`** sau `HandwritingRecognitionPort` (endpoint `POST /v1/handwriting/recognize`, cần đăng nhập). Dữ liệu `mmah.json` không commit vào repo; tải bằng script có kiểm tra SHA-256 cùng file giấy phép Arphic. Client chỉ gửi nét vector. Khi adapter không sẵn sàng → client hiển thị MOCK có nhãn hoặc thông báo, không giả kết quả.
- **Lý do:** Giữ client không bị ràng buộc GPL; nhận dạng như nhau trên mọi trình duyệt/thiết bị.
- **Hậu quả:** Nhận dạng chữ viết tay cần mạng (không offline). Việc dùng mã GPL phía server và phân phối dữ liệu Arphic cần chủ dự án/tư vấn pháp lý xác nhận; phương án thay thế: tự viết matcher (clean-room) trên dữ liệu Arphic, hoặc dịch vụ thương mại. Chất lượng chưa được kết luận — chỉ có kết quả trên nét tổng hợp cho tới khi có mẫu viết tay thật.

- **Hiện trạng kỹ thuật sau quyết định "chưa duyệt":** adapter mặc định `HANDWRITING_ADAPTER=disabled`; API **từ chối khởi động** nếu `HANDWRITING_ADAPTER=hanzilookup` khi `APP_ENV=production`; image Docker **không** đóng gói dữ liệu `mmah.json`; chỉ môi trường development/test (và Preview nếu chủ dự án chủ động bật) mới chạy được HanziLookup. Gói npm `hanzilookup-js` vẫn còn trong `package.json` (chưa thay thư viện theo chỉ đạo).

## D-030 — Responsive layout theo lớp thiết bị
- **Ngày:** 2026-11-23 · **Trạng thái:** **Đã duyệt** (chủ dự án, 2026-11-23)
- **Lựa chọn:** Breakpoint dùng chung (Tailwind): phone < 768 px (một cột, tab bar dưới), tablet 768–1279 px (navigation rail, hai cột khi hữu ích), desktop ≥ 1280 px (sidebar cố định, nội dung nhiều cột, phím tắt, trạng thái hover). Mỗi module mô tả bố cục desktop riêng (ví dụ: danh sách + chi tiết từ điển cạnh nhau; canvas + gợi ý + lịch sử). Kiểm thử tự động ở 390×844, 820×1180, 1440×900.
- **Hậu quả:** Test E2E kiểm tra đúng thành phần điều hướng hiển thị theo từng viewport và không có cuộn ngang.

## D-031 — Triển khai Preview: Vercel (web) + Railway (API)
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Bối cảnh:** Chủ dự án yêu cầu Preview trên Vercel (`apps/web`) và Railway (`apps/api`); Supabase dev tạo riêng.
- **Lựa chọn:**
  - Vercel: Root Directory `apps/web`, cấu hình trong `apps/web/vercel.json` (install `pnpm install --frozen-lockfile --filter @mandarin/web...`, build `turbo run build --filter=@mandarin/web...`), Node 22.x. Bật **Deployment Protection** (Vercel Authentication) cho Preview.
  - Railway: build bằng `apps/api/Dockerfile` (cấu hình `apps/api/railway.json`, health check `/health`), `APP_ENV=preview`, `TRUST_PROXY=true`.
  - Mock **tắt mặc định** trên Preview; chỉ bật khi `ALLOW_MOCKS_IN_PREVIEW=true` và vẫn bắt buộc đăng nhập; mọi kết quả mock gắn nhãn `MOCK`.
  - Giới hạn tần suất theo IP (mọi request) + theo user (endpoint tốn phí); CORS chỉ cho origin web (danh sách chính xác hoặc regex neo `^https://…$`).
  - Không deploy production trong M0-PWA.
- **Hậu quả:** Không có Supabase thì Preview chỉ thử được phần chạy hoàn toàn trên trình duyệt; các API cần đăng nhập trả 401. Hướng dẫn: `docs/DEPLOY_PREVIEW.md`; smoke test: `docs/SMOKE_TEST.md`.

---

## Hiệu năng (2026-11-23)

## D-032 — Performance-first architecture và performance budget
- **Ngày:** 2026-11-23 · **Trạng thái:** **Đã duyệt** (chủ dự án) — các con số là **mục tiêu ban đầu**, phải đo thực tế và điều chỉnh theo môi trường
- **Bối cảnh:** Mandarin AI phải nhanh trên mobile, tablet, PC và laptop, không chỉ Safari iPhone.
- **Lựa chọn:**
  - Performance budget chính thức ở `docs/PERFORMANCE.md` (metrics, phương pháp đo, baseline, target, dataset thử nghiệm, ngưỡng thất bại, kế hoạch giám sát).
  - Mục tiêu ban đầu: phản hồi tương tác UI p95 < 100 ms; tra từ điển cục bộ p95 < 200 ms; điều hướng đã cache p95 < 300 ms; phản hồi đáp án quiz cục bộ p95 < 100 ms; AI text token đầu tiên 1–2 s (mạng thử nghiệm xác định); kết quả chấm phát âm p95 < 3 s (mẫu ngắn, không tính thời gian nói); Core Web Vitals p75: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
  - Kiến trúc: đọc local-first (IndexedDB/Dexie) cho dữ liệu đã tải; optimistic UI + outbox idempotent với trạng thái pending/error rõ ràng, **không** báo "đã đồng bộ" khi chưa có xác nhận của server; cache/prefetch có giới hạn dung lượng, vô hiệu theo version, không cache nhầm dữ liệu riêng của người dùng; lazy-load PDF viewer, audio engine, animation Hanzi, nhận dạng chữ viết tay; PDF/AI nặng chạy background job (progress, retry, idempotency); AI text streaming; Realtime/WebRTC chỉ khi tương thích và đã test thật.
  - Đo: Web Vitals phía trình duyệt, độ trễ API, độ trễ database, AI first-token, thời lượng sync, độ dài hàng đợi, tỷ lệ lỗi.
  - Benchmark lab trên profile desktop và mobile (CPU/network throttling) với Chromium/Firefox/WebKit trong CI khi khả thi.
- **Ràng buộc:** mọi tối ưu **không được** làm suy yếu bảo mật, RLS, dữ liệu offline hay tính đúng đắn của đồng bộ. **Không** được tuyên bố đạt hiệu năng khi chưa có benchmark trên bản HTTPS thực tế.
- **Hậu quả:** Tiêu chí nghiệm thu M1–M8 có thêm điều kiện hiệu năng; Release Checklist có mục hiệu năng; CI thêm job benchmark lab (báo cáo trước, chặn sau khi baseline ổn định).

## D-033 — Không thêm Redis/dịch vụ cache trả phí khi chưa có số liệu
- **Ngày:** 2026-11-23 · **Trạng thái:** **Đã duyệt** (chủ dự án)
- **Lựa chọn:** Trước khi có số liệu đo chứng minh nhu cầu, chỉ dùng: cache HTTP/CDN cho tài nguyên tĩnh, cache trình duyệt (IndexedDB/Cache Storage) có giới hạn, index và tối ưu truy vấn Postgres, cache trong bộ nhớ tiến trình API cho dữ liệu dùng chung chỉ-đọc (có TTL, không chứa dữ liệu riêng người dùng).
- **Điều kiện xem xét lại:** số liệu production/preview cho thấy (a) p95 độ trễ API vượt budget do truy vấn lặp lại mà index/batching không giải quyết được, hoặc (b) cần chia sẻ trạng thái giữa nhiều instance API (rate limit, hàng đợi job). Khi đó lập đề xuất có số liệu, chi phí, phương án thay thế (ví dụ bảng Postgres, `pg_cron`/hàng đợi trên Postgres).

## D-034 — Chọn hosting region bằng đo đạc
- **Ngày:** 2026-11-23 · **Trạng thái:** Đề xuất
- **Lựa chọn:** Không giả định region nhanh nhất. Trước khi chốt region production: đo RTT/độ trễ `/health` và một truy vấn DB mẫu từ thiết bị người dùng thật (Việt Nam và nơi khác nếu có) tới các region ứng viên của Supabase và Railway; ưu tiên đặt API và database **cùng region** (độ trễ API→DB thường chiếm nhiều lần gọi mỗi request). Kết quả và lựa chọn ghi vào `docs/PERFORMANCE.md` mục 8.
- **Hậu quả:** Region Preview có thể đổi sau khi đo; region của Supabase không đổi được sau khi tạo dự án → **đo trước khi tạo dự án Supabase production**.
