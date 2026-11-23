# Báo cáo M0-PWA — Web app cross-platform

```text
Milestone / branch / commit / PR: M0-PWA / claude/m0-pwa / 127cc33 (code) / https://github.com/dorai4vn/mandarin-ai/pull/2
Delivered features: apps/web responsive (phone/tablet/desktop), capability detection, canvas touch/mouse/pen,
  server handwriting adapter, audio WAV 16 kHz, PDF upload, IndexedDB outbox + idempotent sync + fallback,
  optional PWA (manifest + service worker), API endpoints (handwriting, sync, upload, CORS), CI e2e matrix
Database migrations: không có migration mới (profiles baseline từ M0 giữ nguyên)
Tests run + pass/fail: unit 71/71 PASS; Playwright Chromium 71 PASS + 7 skip có chủ đích (×3 lần lặp: 205 PASS, 0 flaky);
  Firefox/WebKit: chạy ở CI GitHub (không cài được trong môi trường cloud)
Browser/device verification: CHƯA có thiết bị thật — BLOCKED (cần URL HTTPS + iPhone + máy tính của chủ dự án)
Online/offline & permission cases: tự động trên Chromium: offline→đóng tab→mở lại→gửi 1 lần; mất phản hồi→duplicate;
  không IndexedDB→bộ nhớ tạm; micro bị từ chối / không hỗ trợ → thông báo
Security/RLS checks: API: JWT, CORS theo origin, đường dẫn file do server chọn, kiểm tra %PDF-, rate limit;
  secret không có trong bundle; RLS profiles (M0) không đổi
Known gaps and blockers: xem dưới
Docs updated: PRD 2.1, ARCHITECTURE 2.1, MILESTONES 2.1, DECISIONS (D-018…D-030), FEATURES, RELEASE_CHECKLIST,
  MIGRATION_M0_PWA, WEB_COMPATIBILITY, HANDWRITING_EVALUATION, SETUP, README
GO/NO-GO decision: NO-GO cho tiêu chí thoát M0-PWA cho tới khi có (1) CI Firefox/WebKit xanh, (2) bằng chứng thiết bị thật,
  (3) quyết định giấy phép nhận dạng chữ viết tay (D-029) — chủ dự án quyết định
```

## Bằng chứng chạy trong môi trường cloud (Linux x86_64, Node 22.23, pnpm 10.28, Chromium của Playwright 1.63)
| Lệnh | Kết quả |
|---|---|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm check:secrets` / `check:deps` / `check:expo` | OK (129 file; 7 workspace, không vòng; 21 package Expo khớp SDK cho app đóng băng) |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | OK (9/9 task) |
| `pnpm test` | **71 PASS**: contracts 8, domain 16, adapters 11 (gồm HanziLookup trên dữ liệu thật), api 13, web 16, mobile 7 |
| `pnpm build` | OK — Next.js 13 route tĩnh, API, packages, bundle Expo đóng băng |
| Regression test race sync | Code cũ FAIL, code mới PASS (`offline.test.ts › sync engine concurrency`) |
| `E2E_ENGINES=chromium playwright test` | **71 PASS, 7 skip** (skip: chuột trên phone, kiểm tra chỉ dành cho desktop, kéo-thả desktop) |
| `--repeat-each 3` (Chromium) | **205 PASS, 0 fail, 0 flaky** |
| Firefox / WebKit | Không chạy được tại đây (không có trình duyệt; không được phép `playwright install`) → job `e2e` trên CI |
| `docker build` web/API | Không chạy được tại đây (giới hạn tải image Docker Hub/ECR) → bước trong CI |
