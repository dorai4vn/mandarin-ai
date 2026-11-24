# Báo cáo M0 — Repository, feasibility spikes, architecture gate

```text
Milestone / branch / commit / PR: M0 / claude/serene-feynman-joougp / (xem PR) / (xem PR)
Delivered features: monorepo, docs v1.3, API skeleton, Expo SDK 58 app + 4 màn hình spike, Supabase baseline, CI
Database migrations: 20261123000000_m0_profiles_baseline.sql (profiles + RLS + trigger tạo profile)
Tests run + pass/fail: 34 unit test PASS; 9 pgTAP PASS; lint/typecheck/build PASS
iPhone device verification: CHƯA — BLOCKED (không có thiết bị/Apple signing trong môi trường cloud)
Online/offline & permission cases: logic xử lý từ chối micro + lỗi mạng có trong code, CHƯA kiểm trên máy
Security/RLS checks: pgTAP A/B + anon; test âm có tác dụng (policy rò rỉ → FAIL 2/9)
Known gaps and blockers: xem mục "BLOCKED" bên dưới
Docs updated: PRD/ARCHITECTURE/MILESTONES v1.3, DECISIONS, FEATURES, RELEASE_CHECKLIST, SETUP, NATIVE_COMPATIBILITY
GO/NO-GO decision: NO-GO cho tiêu chí thoát M0 cho tới khi có bằng chứng iPhone thật (chủ dự án quyết định)
```

## Bằng chứng đã chạy trong môi trường cloud (Linux x86_64, Node 22, pnpm 10.28)
| Lệnh | Kết quả |
|---|---|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm check:secrets` / `check:deps` / `check:expo` | OK (116 file; 6 workspace không vòng; 21 package khớp SDK 58) |
| `pnpm check:deps` khi cố tình cho `contracts` phụ thuộc `domain` | FAIL đúng kỳ vọng (phát hiện vi phạm tầng + vòng) |
| `pnpm lint`, `pnpm typecheck`, `pnpm format:check` | OK |
| `pnpm test` | contracts 5, domain 7, adapters 6, api 9, mobile 7 = **34 PASS** |
| `pnpm build` (gồm `expo export --platform ios`) | OK — 1435 module, bundle Hermes 3.6 MB, không chứa chuỗi `Ocp-Apim`, `client_secrets`, tên biến key |
| `expo prebuild --platform ios --no-install` | OK — `IPHONEOS_DEPLOYMENT_TARGET = 16.4`, `expo.sqlite.useSQLCipher = true`, `NSMicrophoneUsageDescription` tiếng Việt |
| `expo-modules-autolinking resolve` | Nhận module local `DigitalInk` (`DigitalInkModule`) |
| `expo-doctor` | 18/20 OK; 2 check cần mạng `exp.host` (bị chặn) — CI GitHub sẽ chạy |
| API `node dist/server.js` + `curl /health` | OK, providers báo `mock`; route bảo vệ trả 401 khi thiếu token |
| `supabase db start` → `db reset` → `test db` | 9/9 PASS; `db lint`: không lỗi |
| `docker build apps/api/Dockerfile` | KHÔNG chạy được (Docker Hub 429 / ECR giới hạn) — đã đưa vào CI |
