# Hướng dẫn cài đặt & chạy (M0-PWA, web cross-platform)

## 1. Yêu cầu
| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 22.x (`.nvmrc`) | `engine-strict` bật |
| pnpm | 10.28.x | `corepack enable` |
| Docker | bản mới | Chỉ cho Supabase local (`pnpm db:*`) và build image |
| Trình duyệt | Chrome/Edge/Firefox/Safari bản hiện đại | Bất kỳ hệ điều hành nào |

Không cần Apple Developer, Xcode, EAS hay app store.

## 2. Cài đặt & kiểm tra
```bash
corepack enable
```
```bash
pnpm install --frozen-lockfile
```
```bash
pnpm fetch:handwriting-data
```
(tải `mmah.json` + giấy phép Arphic vào `packages/adapters/data/`, kiểm tra SHA-256; giấy phép đang chờ duyệt — D-029)
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## 3. Chạy cục bộ
API (terminal 1):
```bash
cp apps/api/.env.example apps/api/.env
```
Điền `SUPABASE_URL` hoặc `SUPABASE_JWT_SECRET`, `WEB_ORIGINS`, `HANDWRITING_DATA_PATH`. Key OpenAI/Azure/Supabase service role là tùy chọn; thiếu thì API trả kết quả gắn nhãn **MOCK** (chỉ ở development).
```bash
pnpm --filter @mandarin/api dev
```
Web (terminal 2):
```bash
cp apps/web/.env.example apps/web/.env.local
```
```bash
pnpm --filter @mandarin/web dev
```
Mở http://localhost:3000 trên trình duyệt máy tính. Kiểm tra API: `curl http://localhost:8787/health` (trường `providers` báo `live`/`mock`/`disabled`).

Khi chưa có dự án Supabase: đặt `NEXT_PUBLIC_ENABLE_DEV_TOKEN=true` (chỉ môi trường dev) và dán access token ký bằng `SUPABASE_JWT_SECRET` của API ở trang **Hồ sơ → Phiên đăng nhập**.

## 4. Kiểm thử E2E (Playwright: Chromium, Firefox, WebKit × mobile/tablet/desktop)
```bash
pnpm --filter "@mandarin/api..." build
```
```bash
cd apps/web && NEXT_PUBLIC_ENABLE_DEV_TOKEN=true NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 pnpm build
```
```bash
cd apps/web && pnpm exec playwright install chromium firefox webkit
```
```bash
cd apps/web && pnpm exec playwright test --trace off
```
Chỉ chạy một engine: `E2E_ENGINES=chromium pnpm exec playwright test --trace off`. Playwright tự khởi động API và web (`playwright.config.ts`). Báo cáo HTML: `apps/web/playwright-report/`.

**Lưu ý:** bản build E2E bật dev token — không dùng bản build này để deploy.

## 5. Kiểm thử trên thiết bị thật (điện thoại + máy tính)

> Cách được khuyến nghị: triển khai **Preview** theo `docs/DEPLOY_PREVIEW.md` (Vercel + Railway) và chạy `docs/SMOKE_TEST.md`.
Micro và service worker yêu cầu **HTTPS** (riêng `localhost` được coi là an toàn). Để điện thoại truy cập được, cần một trong hai cách:
- **Preview deploy** của web + API trên host đã chọn (Railway là ứng viên, D-026) — dùng `apps/web/Dockerfile` và `apps/api/Dockerfile`.
- **Tunnel HTTPS** từ máy phát triển tới cổng 3000 (web) và 8787 (API); đặt `NEXT_PUBLIC_API_URL` và `WEB_ORIGINS` theo URL tunnel.

Kịch bản (ghi lại thiết bị, hệ điều hành, trình duyệt + phiên bản, URL, ảnh/video):
1. **Layout:** mở trang chủ trên điện thoại (tab bar dưới), tablet (rail), máy tính (sidebar). Không có thanh cuộn ngang.
2. **Viết tay:** Phòng thử → Viết chữ Hán: viết 山 bằng ngón tay (điện thoại) và bằng chuột/trackpad (máy tính); trang không cuộn/zoom khi viết; ghi lại ứng viên và độ trễ.
3. **Micro:** Phòng thử → Micro: cho phép → ghi 2–3 giây → Nghe lại (thử 0.5×) → Gửi chấm. Lặp lại khi **từ chối** quyền → có hướng dẫn bật lại.
4. **PDF:** chọn PDF mẫu từ ứng dụng Tệp (điện thoại) và kéo-thả (máy tính).
5. **Offline:** Phòng thử → Offline: bật chế độ máy bay → lưu ghi chú → đóng hẳn trình duyệt → mở lại → tắt chế độ máy bay → "chờ=0", `applied=1`.
6. **PWA (tùy chọn):** Thêm vào Màn hình chính (iPhone) / Cài đặt (Chrome, Edge) → mở từ icon → app chạy standalone; tắt mạng → trang chủ vẫn mở.
7. **Đăng nhập OTP** (khi có Supabase): đăng nhập trong tab và trong app đã cài.

## 6. Supabase local (cần Docker)
```bash
pnpm db:start
```
```bash
pnpm db:reset && pnpm db:test
```

## 7. Bí mật
- Chỉ commit `*.env.example`; `pnpm check:secrets` chạy trong CI.
- `NEXT_PUBLIC_*` bị nhúng vào JavaScript gửi cho trình duyệt → chỉ chứa giá trị công khai (URL API, URL Supabase, publishable key).
- OpenAI/Azure key và Supabase service role chỉ đặt ở môi trường của `apps/api`.

## 8. Ứng dụng Expo cũ (`apps/mobile`)
Đã đóng băng theo D-018; giữ lại cho tới khi chủ dự án duyệt gỡ bỏ (`docs/MIGRATION_M0_PWA.md` bước 7). Không cần chạy để phát triển web.
