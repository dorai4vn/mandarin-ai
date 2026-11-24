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


## Cập nhật 2026-11-23 (sau quyết định của chủ dự án)

### CI chính thức trên PR #2
| Commit / run | Lint·Test·Build (+Docker) | Supabase RLS | Mobile (đóng băng) | E2E Chromium | E2E Firefox | E2E WebKit |
|---|---|---|---|---|---|---|
| `cd855ed` / 45241745204 | PASS | PASS | PASS | PASS | **FAIL** 68✓ 7⊘ 3✗ (ghi âm treo) | **FAIL** 64✓ 11⊘ 3✗ (reload offline: lỗi nội bộ WebKit) |
| `15620cc` / 45243746422 | PASS | PASS | PASS | PASS | **FAIL** 68✓ 7⊘ 3✗ (ghi âm vẫn không bắt đầu) | **PASS** 67✓ 11⊘ |
| `fc5b4db` / 45244779226 | bị hủy (có push mới) | — | — | — | — | — |
| `c1d4551` / 45245008142 | PASS | PASS | PASS | PASS | **PASS** 71✓ 7⊘ (ghi âm chạy thật ×3) | Lần 1: kẹt ở bước cài trình duyệt (hạ tầng) → hủy, chạy lại: 66✓ 11⊘ **1 flaky** (form offline nhận click trước khi IndexedDB mở xong → sửa app) |
| **`24d7f44` / 45247827210** | **PASS** | **PASS** | **PASS** | **PASS** 71✓ 7⊘ | **PASS** 71✓ 7⊘ | **PASS** 67✓ 11⊘ |

Từ `24d7f44`, CI bật `failOnFlakyTests`: test chỉ qua khi retry sẽ làm job FAIL. Nguyên nhân Firefox: hai thay đổi cùng lúc (tạo AudioContext trong thao tác người dùng + thiết bị âm thanh ảo cho runner) — không tách riêng được thay đổi nào là nguyên nhân chính.

Skip có chủ đích (không phải để làm CI xanh): chuột trên điện thoại; kiểm tra chỉ dành cho desktop ở viewport mobile/tablet; kéo-thả trên mobile/tablet; WebKit: ghi âm (Playwright WebKit không có micro giả) và Tab-tới-link (Safari mặc định không Tab tới link).

### Thay đổi
- Sửa app: `AudioContext` tạo + resume đồng bộ trong thao tác người dùng, không chờ vô hạn, báo lỗi rõ ràng.
- WebKit: test SW kiểm controller + precache; điều hướng offline trên Safari chuyển thành mục kiểm tay **B10** trong `docs/SMOKE_TEST.md` (chưa xác định lỗi do công cụ hay app).
- API an toàn cho Preview: `APP_ENV`, mock chỉ khi `ALLOW_MOCKS_IN_PREVIEW=true`, `HANDWRITING_ADAPTER` mặc định tắt và bị từ chối ở production, rate limit theo IP, `WEB_ORIGIN_REGEX`, `TRUST_PROXY`, sync store in-memory có giới hạn.
- Kiểm tay cấu hình Preview tối thiểu: `/health` → `environment: preview`, mọi nhà cung cấp `disabled`; endpoint cần đăng nhập → 401; origin lạ không có CORS; `hanzilookup` + production → API từ chối khởi động.
- Mô phỏng lệnh Vercel trên bản clone sạch: `pnpm install --frozen-lockfile --filter @mandarin/web...` (2,6 s) + `turbo run build --filter=@mandarin/web...` → 3/3 task thành công.
- Unit test: **77** (contracts 8, domain 16, adapters 11, api 19, web 16, mobile 7).

## Cập nhật 2026-11-24 — D-037 trong M0-PWA (được chủ dự án duyệt)
- `/lab/session`: OTP qua `apps/web/src/lib/auth-otp.ts`, luôn `shouldCreateUser: false`; email được mời và email lạ nhận **cùng một** thông báo trung tính (không lộ lỗi "Signups not allowed"); chữ "chỉ dành cho người được mời", không có "Đăng ký".
- `supabase/config.toml`: `enable_signup = false` (anonymous đã `false`).
- Test: unit `auth-otp.test.ts` (4); E2E `auth-invite-only.spec.ts` (3 × 9 project) chặn request tới host giả `supabase-e2e.invalid` — **chỉ kiểm hành vi client**, không chứng minh Supabase thật từ chối; `scripts/test-auth-invite-only.mjs` chạy trên **GoTrue local thật** trong job CI `database` (không dev token): đăng ký + anonymous bị từ chối, email lạ không tạo user/không có thư, tài khoản do admin tạo nhận mã (Mailpit) và xác minh được.
- Chưa kiểm: dự án Supabase Cloud `mandarin-ai-dev` (smoke test A12–A12c do chủ dự án chạy). Membership `app_members`, admin panel, cookie session: M1.

### CI `70fc2af` — job `database` FAIL và cách sửa
- Bước lỗi: `node scripts/test-auth-invite-only.mjs`. 9/10 kiểm tra trên GoTrue local PASS: signup → 422 `signup_disabled`; anonymous → 422 `anonymous_provider_disabled`; OTP email lạ → 422 `signup_disabled`/`otp_disabled`; 0 user được tạo; admin tạo user → 200; user được mời xin mã → 200. **FAIL:** không tìm thấy mã 6 số trong email.
- Nguyên nhân: cấu hình trong repo, không phải logic Auth hay môi trường CI. `supabase/config.toml` dùng mẫu email mặc định của Supabase (chỉ có link, không có `{{ .Token }}`), trong khi app đăng nhập bằng mã (D-025). Cloud đã được hướng dẫn thêm `{{ .Token }}` (DEPLOY_PREVIEW bước 8), local/CI thì chưa.
- Sửa: thêm `supabase/templates/{magic_link,invite,recovery}.html` có `{{ .Token }}` + khai báo trong `config.toml`; script tách "có email" và "email chứa mã" để báo lỗi chính xác. Không bỏ hay nới điều kiện nào.

## Cập nhật 2026-11-24 — D-038: email + mật khẩu thay OTP (được chủ dự án duyệt)
- `/lab/session`: form email + mật khẩu → `signInWithPassword` qua `apps/web/src/lib/auth-password.ts`. Lỗi danh tính (sai mật khẩu, email chưa cấp, chưa xác nhận, bị ban) đều là "Email hoặc mật khẩu không đúng."; 429 và lỗi máy chủ có thông báo riêng nhưng không lộ tài khoản. Ô mật khẩu bị xóa sau mỗi lần thử; mật khẩu không lưu ở đâu trong app. Không có đăng ký, OTP, Magic Link.
- Đã bỏ: `auth-otp.ts` + test, `supabase/templates/*` (mẫu `{{ .Token }}`), Mailpit trong job CI `database`.
- `supabase/config.toml`: `minimum_password_length = 12` (signup/anonymous vẫn tắt).
- Test: unit `auth-password.test.ts` (4); E2E `auth-invite-only.spec.ts` (3 × 9 project; chỉ có request password grant, không `/signup`/`/otp`; lỗi chung; mật khẩu không có trong local/sessionStorage; không có trang đăng ký) — **chỉ kiểm client**; `scripts/test-auth-invite-only.mjs` trên **GoTrue local thật, không Mailpit, không dev token**: signup + anonymous bị từ chối, user do admin tạo đăng nhập được (JWT `authenticated`), sai mật khẩu và email lạ trả **cùng** lỗi, mật khẩu 11 ký tự bị từ chối, không có tài khoản nào khác được tạo.
- M1 (chưa bắt đầu): `app_members`, bắt buộc đổi mật khẩu, cookie session, audit, bảo vệ dữ liệu theo membership.

## Cập nhật 2026-11-24 — Design System V2 được duyệt; checklist nghiệm thu
- D-039 (Design System V2) **đã duyệt**; tài liệu `docs/design/`. Code UI V2 chỉ bắt đầu **sau khi PR #2 được nghiệm thu và merge**, trước M1.
- Checklist nghiệm thu trước merge: `docs/M0_PWA_ACCEPTANCE.md` — tách phần đã có bằng chứng CI và phần phải kiểm tay trên website thật (Vercel Preview + Railway + `mandarin-ai-dev`, iPhone Safari + desktop thật).
- Kiểm tra bundle với giá trị mồi trên HEAD (2026-11-24): 0 secret server trong `.next`.
- `docs/SMOKE_TEST.md` A13 sửa cho đúng D-035: trên Preview sync server TẮT, thao tác giữ trạng thái "chờ".

## Cập nhật 2026-11-24 — Sửa lỗi bảo mật X1 (được chủ dự án duyệt)
- **Lỗi:** form đăng nhập `/lab/session` (từ `80ff911`) không có `method`, ô nhập có `name`, và dùng được trước khi React hydrate → bấm sớm thì trình duyệt gửi GET, đưa email + mật khẩu lên URL. Service worker còn cache điều hướng theo nguyên URL.
- **Sửa:** ô nhập/nút vô hiệu cho tới khi hydrate; bỏ `name` (giữ `id` + `autocomplete`); `method="post"`; `<noscript>`; SW không cache URL có query, đổi phiên bản cache sang `m0-pwa-2` (xóa cache cũ). Luồng `signInWithPassword`, testid, Supabase/Railway/Vercel không đổi.
- **Test:** `e2e/auth-credential-leak.spec.ts` (JS tắt, hydrate chậm, submit gốc cưỡng bức, chạm/click/Enter sau khi sẵn sàng); `e2e/pwa.spec.ts` (không cache URL có query); CI lặp test Auth ×5 không retry trên 3 engine. Trên code cũ 4/5 test mới FAIL. Chromium tại máy: toàn bộ E2E 98 pass / 7 skip; Auth ×5 = 120/120; PWA ×3 = 27/27.
- **Phơi nhiễm:** không kiểm được log Vercel/thiết bị từ phía Claude; hướng dẫn giảm thiểu trong `docs/M0_PWA_ACCEPTANCE.md` mục 0 (lọc log `password=`, đổi mật khẩu tạm của tài khoản thử nghiệm, xóa lịch sử).
- **Quyết định:** spike 2 đóng BLOCKED → M5 (D-029); Azure/Realtime chưa kích hoạt trong M0.

## Cập nhật 2026-11-24 — Console 503 khi sync chưa kích hoạt (B10)
- **Nguyên nhân:** `OfflineProvider` chạy sync khi mở trang, khi có mạng lại, khi tab hiện lại và **mỗi 30 giây**, không kiểm tra server có bật sync hay không. Có thao tác chờ trong outbox → mỗi lần gọi `POST /v1/sync/push` → Railway trả `503 provider_unavailable` (sync store chưa cấu hình — đúng thiết kế D-035) → lỗi đỏ trong Console, lặp lại liên tục.
- **Sửa (không đổi backend contract):** `SyncAvailabilityProbe` đọc `providers.sync` từ `GET /health` (công khai, luôn 200) — `live` → có; `disabled` → không; `mock` → chỉ có trong build dev/E2E. Kết quả được nhớ 10 phút (lỗi mạng: thử lại sau 60 s); bấm "Đồng bộ ngay" hoặc có mạng trở lại → kiểm lại ngay. `SyncEngine` không gửi khi sync không có; outbox giữ nguyên (`pending`, không tăng số lần thử, không đánh dấu đã đồng bộ); outbox rỗng → không gọi gì. Nếu push vẫn nhận 503 `provider_unavailable` (trạng thái đổi giữa chừng) → ghi nhớ "chưa kích hoạt", không gửi lặp.
- **Giao diện:** chip trạng thái "Lưu trên thiết bị" (màu trung tính), Trang chủ + trang Offline hiện "Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt."; không hiện như lỗi, không bao giờ "Đã đồng bộ" khi sync tắt. Không bật mock sync trên Preview.
- **Test:** unit `sync-availability.test.ts` (8: ánh xạ trạng thái, cache/force, lỗi mạng, 503 ghi nhớ, bật lại → gửi đúng 1 lần); E2E `sync-disabled.spec.ts` (5 × 9 project: tắt → không push, không 503 trong Console, dữ liệu còn sau tải lại; 503 từ push chỉ 1 request; offline; bật lại → gửi 1 lần rồi mới "đã đồng bộ"). Trên code cũ 5/5 E2E mới FAIL.
