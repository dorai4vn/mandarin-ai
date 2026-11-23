# Kế hoạch chuyển đổi M0 (native) → M0-PWA

- **Ngày:** 2026-11-23
- **Quyết định gốc:** D-018 (Next.js web app), phạm vi **cross-platform** theo D-028 (desktop, tablet, smartphone; Chrome, Edge, Firefox, Safari; PWA là tùy chọn); chi tiết ở D-019 … D-030.
- **Điểm xuất phát:** commit `7e20b16` (đầu PR #1, branch `claude/serene-feynman-joougp`, **chưa merge**).
- **Branch làm việc:** `claude/m0-pwa` (tạo từ `7e20b16`).
- **Trạng thái:** Bước 1–6 **đã thực hiện** trên `claude/m0-pwa` (xem `docs/M0_PWA_REPORT.md`). Bước 7 (gỡ `apps/mobile`) **chưa làm — chủ dự án chưa cho phép (2026-11-23)**; code native giữ đóng băng.

## 1. Nguyên tắc
1. Không mất tính năng: 11 module PRD giữ nguyên, chỉ đổi cách hiện thực trên nền web.
2. Không xóa trước khi thay thế: `apps/mobile` vẫn nằm nguyên cho tới khi `apps/web` có spike tương đương và chủ dự án duyệt. Việc gỡ bỏ nằm trong **một commit riêng**, dễ revert.
3. Tái sử dụng tối đa: packages (`contracts`, `domain`, `adapters`), `apps/api`, `supabase/`, scripts, CI và toàn bộ test đã có.
4. Mỗi bước có test chạy được và báo cáo trung thực (VERIFIED / MOCKED / BLOCKED).

## 2. Danh sách file

### 2.1 GIỮ NGUYÊN (không đổi hoặc chỉ đổi tài liệu)
| File / thư mục | Lý do |
|---|---|
| `packages/config/*` | Cấu hình TS/ESLint dùng chung |
| `packages/contracts/src/{skills,quiz-types,learning-events,pronunciation,realtime,provenance,api}.ts` + test | Contract độc lập nền tảng |
| `packages/domain/**` (QuizType registry, graders) + test | Logic thuần, không phụ thuộc RN |
| `packages/adapters/src/mock/index.ts` (trừ đổi tên ink), `server/azure-pronunciation.ts`, `server/openai-realtime.ts` + test | Dùng nguyên ở API |
| `apps/api/src/{auth,rate-limit,providers,server}.ts`, `Dockerfile`, test | Fastify API giữ nguyên vai trò |
| `supabase/**` (config, migration `profiles`, test pgTAP, README) | Backend không đổi |
| `scripts/check-deps.mjs`, `scripts/check-secrets.mjs` | Guard dùng chung |
| `fixtures/starter/**` | Starter content (D-012) |
| `turbo.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.prettierrc.json`, `eslint.config.mjs` (gốc) | Hạ tầng monorepo |

### 2.2 GIỮ + SỬA
| File | Thay đổi |
|---|---|
| `packages/contracts/src/ink.ts` | Đổi tên khái niệm sang handwriting (`HandwritingRecognitionRequest/Result`); giữ schema nét (x, y, t). Giữ alias tên cũ một thời gian để test cũ vẫn chạy. |
| `packages/adapters/src/ports.ts` | `DigitalInkPort` → `HandwritingRecognitionPort` (thêm `id` adapter, `supportsOffline`). |
| `packages/adapters/src/mock/index.ts` | `MockDigitalInk` → `MockHandwritingRecognizer` (vẫn `source: 'mock'`). |
| `apps/api/src/app.ts`, `config.ts`, `.env.example` | Thêm CORS (`@fastify/cors`) chỉ cho origin web (`WEB_ORIGIN`); chuẩn bị endpoint ký URL upload PDF (spike 5). |
| `supabase/config.toml` | `site_url`/redirect cho web, bật email OTP; bucket private cho PDF spike. |
| `package.json` (gốc) | Bỏ script `check:expo`; thêm script E2E (Playwright). |
| `.npmrc` | `node-linker=hoisted` chỉ cần cho Metro; xem xét bỏ sau khi gỡ `apps/mobile` (đo lại install/build). |
| `.github/workflows/ci.yml` | Bỏ bước `expo prebuild`/`expo-doctor` khi gỡ mobile; thêm `next build`, Playwright Chromium/Firefox/WebKit × mobile/tablet/desktop. |
| `.gitignore`, `.prettierignore`, `.dockerignore` | Thêm `.next/`, `apps/web/public/sw.js` (file sinh ra); bỏ mục Expo khi gỡ mobile. |
| `README.md`, `docs/SETUP.md`, `docs/FEATURES.md` | Hướng dẫn chạy web, kiểm thử trên desktop và điện thoại qua HTTPS. |

### 2.3 CHUYỂN (logic thuần từ `apps/mobile` sang nơi dùng chung)
| Từ | Đến | Ghi chú |
|---|---|---|
| `apps/mobile/src/lib/strokes.ts` (+ test) | `packages/domain/src/handwriting/strokes.ts` | Thuần TS, dùng lại cho canvas web (touch/mouse/pen); timestamp từ `PointerEvent.timeStamp` |
| `apps/mobile/src/lib/status.ts` (+ test) | `apps/web/src/lib/status.ts` | Nhãn MOCK/LIVE/BLOCKED |
| `apps/mobile/src/api/client.ts` | `apps/web/src/lib/api-client.ts` | Bỏ `expo-constants`, dùng `NEXT_PUBLIC_API_URL` |
| `apps/mobile/app/spikes/*.tsx` | `apps/web/app/(spikes)/*` | Viết lại bằng DOM + Tailwind, giữ cùng kịch bản kiểm thử |

### 2.4 THAY THẾ (chức năng giữ, công nghệ đổi)
| Cũ (native) | Mới (web) | Quyết định |
|---|---|---|
| Expo Router app `apps/mobile` | Next.js App Router `apps/web` | D-018, D-019 |
| `modules/digital-ink` (Swift, ML Kit) | Canvas Pointer Events (touch/mouse/pen) + `HandwritingRecognitionPort` chạy trên `apps/api` (HanziLookup + dữ liệu Arphic, chờ duyệt giấy phép) | D-020, D-029 |
| `expo-audio` ghi WAV | `getUserMedia` + `AudioWorklet` → WAV 16 kHz (dự phòng: MediaRecorder + chuyển mã ở API) | D-023 |
| `expo-sqlite` + SQLCipher + `expo-secure-store` | IndexedDB (Dexie) + outbox; Web Crypto AES-GCM cho trường nhạy cảm | D-021, D-022 |
| EAS build / TestFlight | HTTPS URL + "Thêm vào Màn hình chính" | D-018, D-026 |
| Thông báo cục bộ (dự kiến) | Web Push (VAPID) + nhắc trong app | D-024 |
| Token dev dán tay | Đăng nhập OTP email của Supabase trong app | D-025 |
| `apps/mobile/src/lib/sqlcipher.ts` | `apps/web/src/offline/crypto.ts` | D-022 |

### 2.5 LOẠI BỎ (chỉ sau khi M0-PWA spike tương đương có và được duyệt; commit riêng)
`apps/mobile/**` (toàn bộ, gồm `app.config.ts`, `eas.json`, `metro.config.js`, `expo-env.d.ts`, `modules/digital-ink/**`, `assets/**` — icon Expo template MIT sẽ được thay bằng icon riêng), `.github/workflows/eas-build.yml`, `scripts/check-expo-versions.mjs`, dependency `semver` ở gốc (nếu không còn dùng), các mục Expo trong lockfile. `docs/NATIVE_COMPATIBILITY.md` **giữ** nhưng đánh dấu "lịch sử", và bổ sung `docs/WEB_COMPATIBILITY.md` cho Safari.

### 2.6 MỚI
| File / thư mục | Nội dung |
|---|---|
| `apps/web/` | Next.js 16 + Tailwind 4, `output: 'standalone'`, `Dockerfile` |
| `apps/web/public/manifest.webmanifest`, icon 180/192/512 | PWA |
| `apps/web/src/sw.ts` | Service worker Serwist (app shell, cache nội dung đã tải) |
| `apps/web/src/offline/{db,outbox,sync}.ts` + test (`fake-indexeddb`) | Kho offline, outbox, đồng bộ idempotent |
| `apps/web/src/platform/{handwriting-canvas,audio-capture,wav}.ts` + test | Canvas, thu âm, mã hóa WAV |
| `apps/web/e2e/*.spec.ts` | Playwright Chromium/Firefox/WebKit × mobile/tablet/desktop |
| `docs/WEB_COMPATIBILITY.md` | Ma trận tương thích theo trình duyệt/thiết bị |
| `docs/HANDWRITING_EVALUATION.md` | Phương pháp + kết quả đo nhận dạng chữ viết tay |

## 3. Trình tự commit đề xuất (sau khi được duyệt)
1. `docs:` — kế hoạch này + cập nhật PRD/ARCHITECTURE/DECISIONS/MILESTONES/RELEASE_CHECKLIST (**commit hiện tại**).
2. `refactor(contracts,adapters):` — đổi tên sang `HandwritingRecognitionPort` (giữ alias), chuyển `strokes.ts` vào `domain`; toàn bộ test cũ vẫn xanh.
3. `feat(web):` — khung `apps/web` (Next.js, Tailwind, layout responsive phone/tablet/desktop, manifest + service worker tùy chọn) + CI `next build`.
4. `feat(web):` — spike: canvas viết tay, thu âm WAV, IndexedDB/outbox, upload PDF, đăng nhập OTP, gọi API (Azure/Realtime).
5. `feat(api):` — CORS, endpoint ký URL upload; test.
6. `test(web):` — Playwright WebKit; `docs/WEB_COMPATIBILITY.md`, `HANDWRITING_EVALUATION.md` (khung + số đo khi có).
7. `chore:` — gỡ `apps/mobile` và tài nguyên Expo (**chỉ sau khi chủ dự án duyệt**).

## 4. Tiêu chí nghiệm thu M0-PWA
Xem `docs/MILESTONES_CLAUDE_CODE.md` mục M0-PWA. Tóm tắt: E2E xanh trên 3 engine × 3 viewport; bằng chứng thật trên Safari iPhone và ít nhất một trình duyệt desktop cho canvas (touch/mouse/pen), micro, upload PDF, IndexedDB/outbox + fallback, PWA tùy chọn, đăng nhập OTP, layout responsive; nhận dạng chữ viết tay có báo cáo số đo để chủ dự án chọn adapter; Azure/Realtime live hoặc MOCKED có duyệt; CI xanh; không có secret trong bundle.

## 5. Điều kiện để test trên thiết bị thật
- Cần một URL **HTTPS** mà điện thoại và máy tính truy cập được (getUserMedia và service worker yêu cầu HTTPS): bản preview trên host đã chọn (D-026) hoặc tunnel HTTPS từ máy phát triển. Môi trường cloud hiện tại không mở được cổng ra Internet — cần chủ dự án chọn cách.
- Một dự án Supabase dev (URL + publishable key) và user test.
- Key OpenAI/Azure đặt ở môi trường API (không qua chat, không commit) nếu muốn spike live.
