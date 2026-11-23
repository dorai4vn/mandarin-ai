# Triển khai Preview: Vercel (web) + Railway (API) — D-031

Tài liệu dành cho người không chuyên. Mọi thao tác làm trên giao diện web. **Không gửi bất kỳ khóa bí mật nào qua chat**; chỉ dán khóa trực tiếp vào ô "Environment Variables" của Vercel/Railway.

Trạng thái: **Preview (thử nghiệm)**, không phải production. Chưa merge vào `main`, nên Preview build từ branch `claude/m0-pwa`.

---

## 0. Sơ đồ
```text
Trình duyệt (máy tính / điện thoại)
   │  HTTPS
   ▼
Vercel ── apps/web (Next.js) ── chỉ có giá trị công khai NEXT_PUBLIC_*
   │  fetch(NEXT_PUBLIC_API_URL)   (CORS chỉ cho domain Vercel)
   ▼
Railway ── apps/api (Fastify, Docker) ── giữ các khóa bí mật
   │
   ▼
Supabase dev (Auth, Postgres, Storage) — tạo riêng sau
```

## 1. Biến môi trường

### 1.1 Vercel — `apps/web` (đặt ở phạm vi **Preview**)
Tất cả biến `NEXT_PUBLIC_*` được **nhúng vào JavaScript gửi cho trình duyệt** → chỉ được chứa giá trị công khai.

| Biến | Loại | Bắt buộc | Giá trị |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | client-public | **Có** | URL Railway của API, ví dụ `https://mandarin-api-preview.up.railway.app` (không có `/` ở cuối) |
| `NEXT_PUBLIC_SUPABASE_URL` | client-public | Khi có Supabase | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client-public | Khi có Supabase | Publishable key (`sb_publishable_…`) hoặc anon key — công khai theo thiết kế, dữ liệu được bảo vệ bằng RLS |
| `NEXT_PUBLIC_ENABLE_DEV_TOKEN` | client-public | Không | **Phải là `false`** (hoặc bỏ trống) trên Preview |
| `ENABLE_EXPERIMENTAL_COREPACK` | build-config (không bí mật, không nhúng vào app) | **Có** | `1` — để Vercel dùng đúng `pnpm@10.28.0` khai báo trong `packageManager` (repo bật `engine-strict`) |

Vercel **không cần** khóa bí mật nào trong M0-PWA. Node.js 22 được lấy từ `apps/web/package.json` (`engines.node = 22.x`).

### 1.2 Railway — `apps/api`
| Biến | Loại | Bắt buộc | Giá trị |
|---|---|---|---|
| `APP_ENV` | server-config | **Có** | `preview` |
| `TRUST_PROXY` | server-config | **Có** | `true` (Railway đứng sau proxy; cần để giới hạn theo IP đúng) |
| `WEB_ORIGINS` | server-config | **Có** | Domain Vercel chính xác, ví dụ `https://mandarin-ai-git-claude-m0-pwa-<team>.vercel.app` (nhiều domain cách nhau bởi dấu phẩy) |
| `WEB_ORIGIN_REGEX` | server-config | Không | Cho các URL Preview đổi theo từng lần deploy, ví dụ `^https://mandarin-ai-[a-z0-9-]+-<team>\.vercel\.app$` (bắt buộc bắt đầu bằng `^https://` và kết thúc bằng `$`) |
| `SUPABASE_URL` | server-config | **Có, một trong hai** | `https://<project-ref>.supabase.co` — API dùng để lấy JWKS và xác thực token đăng nhập |
| `SUPABASE_JWT_SECRET` | **server-secret** | **…hoặc cái này** | Chỉ dùng **trước khi có Supabase**: đặt một chuỗi ngẫu nhiên dài (≥ 32 ký tự, tạo bằng trình quản lý mật khẩu) để API khởi động; khi đó không có token hợp lệ nào nên mọi API cần đăng nhập trả 401. Xóa biến này khi đã có `SUPABASE_URL` (trừ khi dự án Supabase dùng JWT HS256 kiểu cũ). |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-secret** | Khi muốn upload PDF thật | Service role / secret key (`sb_secret_…`) của Supabase. **Không bao giờ** đặt ở Vercel. |
| `STORAGE_BUCKET` | server-config | Không | `documents` (mặc định) — bucket **private** |
| `ALLOW_MOCKS_IN_PREVIEW` | server-config | Không | `false` (mặc định). `true` = cho phép kết quả **MOCK** có nhãn (vẫn phải đăng nhập) |
| `MISSING_PROVIDER_MODE` | server-config | Không | `mock` (chỉ có tác dụng khi `ALLOW_MOCKS_IN_PREVIEW=true`) |
| `HANDWRITING_ADAPTER` | server-config | Không | `disabled` (mặc định). `mock` chỉ khi cho phép mock. `hanzilookup` **không dùng** cho tới khi D-029 được duyệt |
| `RATE_LIMIT_PER_MINUTE` | server-config | Không | `20` (giới hạn cho mỗi user với API tốn phí) |
| `IP_RATE_LIMIT_PER_MINUTE` | server-config | Không | `300` (mọi request, theo IP) |
| `OPENAI_API_KEY` | **server-secret** | Không | Chỉ khi thử Realtime thật |
| `OPENAI_REALTIME_MODEL` | server-config | Không | `gpt-realtime` (xác nhận theo tài khoản OpenAI) |
| `OPENAI_REALTIME_TTL_SECONDS` | server-config | Không | `600` |
| `AZURE_SPEECH_KEY` | **server-secret** | Không | Chỉ khi thử chấm phát âm thật |
| `AZURE_SPEECH_REGION` | server-config | Không | Ví dụ `southeastasia` |
| `PORT`, `HOST`, `NODE_ENV` | tự động | — | Railway tự đặt `PORT`; Dockerfile đặt `NODE_ENV=production`; `HOST` mặc định `0.0.0.0`. Không cần nhập. |

### 1.3 Supabase dev (tạo riêng)
| Giá trị trên Supabase | Dùng ở đâu | Loại |
|---|---|---|
| Project URL | Vercel `NEXT_PUBLIC_SUPABASE_URL` + Railway `SUPABASE_URL` | public |
| Publishable key / anon key | Vercel `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public |
| Secret key / service role key | Railway `SUPABASE_SERVICE_ROLE_KEY` | **secret** |
| JWT secret (chỉ dự án dùng HS256 kiểu cũ) | Railway `SUPABASE_JWT_SECRET` | **secret** |
| Mật khẩu database | **Không dùng** trong M0-PWA — không đặt ở đâu cả | **secret** |

---

## 2. Thứ tự thực hiện
1. Railway (API) → lấy URL API.
2. Vercel (web) với `NEXT_PUBLIC_API_URL` → lấy URL web.
3. Quay lại Railway đặt `WEB_ORIGINS` = URL web → Redeploy.
4. (Sau) Supabase dev → cập nhật biến ở cả hai nơi.

## 3. Railway — từng bước
1. Vào **railway.com** → **Login** → chọn **GitHub** và cho phép.
2. **New Project** → **Deploy from GitHub repo**. Nếu không thấy repo `dorai4vn/mandarin-ai`: bấm **Configure GitHub App** → chọn repo → **Save**.
3. Chọn `dorai4vn/mandarin-ai`. Railway tạo một service; nếu nó bắt đầu build ngay từ `main` và lỗi — bình thường (API chưa có trên `main`).
4. Mở service → tab **Settings**:
   - **Source → Branch**: chọn `claude/m0-pwa`.
   - **Root Directory**: để trống (thư mục gốc repo — Dockerfile cần toàn bộ monorepo).
   - **Config-as-code → Railway Config File**: nhập `/apps/api/railway.json` (file này chỉ định build bằng `apps/api/Dockerfile` và health check `/health`).
   - **Deploy → Healthcheck Path**: `/health` (nếu chưa tự nhận từ file cấu hình).
5. Tab **Variables** → **New Variable** (hoặc **Raw Editor**): nhập các biến ở mục 1.2. Tối thiểu cho lần đầu:
   ```text
   APP_ENV=preview
   TRUST_PROXY=true
   WEB_ORIGINS=https://example.invalid
   SUPABASE_JWT_SECRET=<chuỗi ngẫu nhiên dài, tự tạo, KHÔNG gửi qua chat>
   ```
   (`WEB_ORIGINS` sẽ sửa ở bước 3 của mục 2.)
6. Tab **Settings → Networking → Generate Domain** → Railway tạo URL dạng `https://….up.railway.app`.
7. Tab **Deployments**: chờ trạng thái **Success**. Mở `https://<domain>/health` — kết quả mong đợi:
   ```json
   {"status":"ok","environment":"preview","providers":{"openaiRealtime":"disabled","azureSpeech":"disabled","handwriting":"disabled","storage":"disabled","sync":"disabled"}}
   ```
   `disabled` là **đúng**: chưa có khóa và mock đang tắt.

## 4. Vercel — từng bước
1. Vào **vercel.com** → **Sign Up / Log In** → **Continue with GitHub**.
2. **Add New… → Project** → mục **Import Git Repository**: nếu không thấy repo, bấm **Adjust GitHub App Permissions** → chọn `dorai4vn/mandarin-ai` → **Save**.
3. Bấm **Import** cạnh `mandarin-ai`.
4. Màn hình **Configure Project**:
   - **Root Directory** → **Edit** → chọn `apps/web` → **Continue**.
   - **Framework Preset**: Next.js (tự nhận).
   - **Build and Output Settings**: **không bật** override — lệnh đã nằm trong `apps/web/vercel.json`.
   - **Environment Variables**: thêm `ENABLE_EXPERIMENTAL_COREPACK` = `1` và `NEXT_PUBLIC_API_URL` = URL Railway ở bước 3.6 (chọn phạm vi **Preview** và **Development**; có thể thêm **Production** nhưng production chưa dùng).
5. Bấm **Deploy**. Lần deploy đầu tiên lấy từ `main` → **sẽ lỗi** vì `apps/web` chưa có trên `main` (chưa merge). Đây là điều **mong đợi**.
6. Tạo Preview từ branch: vào **Deployments** → nếu chưa có deploy của `claude/m0-pwa`, đẩy một commit bất kỳ lên branch đó (tôi làm) hoặc trên GitHub mở PR #2 — Vercel tự tạo **Preview Deployment** và gắn link vào PR.
7. Lấy **URL branch cố định**: Deployments → chọn bản `claude/m0-pwa` → mục **Domains** có URL dạng `mandarin-ai-git-claude-m0-pwa-<team>.vercel.app`.
8. **Settings → Deployment Protection**: giữ **Vercel Authentication = Standard Protection** (chỉ người có quyền trong team Vercel mới mở được Preview). Muốn cho người khác thử: dùng **Shareable Link** trong trang deployment thay vì tắt bảo vệ.
9. **Settings → General → Node.js Version**: 22.x (tự nhận từ `engines`; nếu khác, chọn 22.x).
10. **Settings → Git**: giữ "Include files outside the root directory in the Build Step" ở trạng thái **bật** (cần để build các package trong monorepo).

## 5. Kết nối hai bên
1. Railway → Variables: sửa `WEB_ORIGINS` = URL ở bước 4.7 (có `https://`, không có `/` cuối). Tùy chọn thêm `WEB_ORIGIN_REGEX` để chấp nhận các URL Preview theo từng commit.
2. Railway tự **Redeploy** sau khi đổi biến (nếu không: Deployments → ⋯ → Redeploy).
3. Mở URL web → **Phòng thử M0 → Khả năng trình duyệt** → không có cảnh báo đỏ. Trang chủ hiển thị bình thường.

## 6. Khi có Supabase dev (làm sau)
1. Supabase → **New project** (region gần Việt Nam, ví dụ Singapore).
2. **Project Settings → API Keys**: lấy Project URL, publishable key, secret key — dán vào đúng chỗ theo bảng 1.3 (không gửi qua chat).
3. **Authentication → Sign In / Providers → Email**: bật Email; bật "Confirm email".
4. **Authentication → Emails → Templates → Magic Link**: thêm dòng `Mã đăng nhập của bạn: {{ .Token }}` để email chứa **mã 6 số** (app dùng mã OTP, D-025).
5. **Authentication → URL Configuration**: Site URL = URL Vercel ở 4.7; Redirect URLs thêm cùng URL.
6. **SQL Editor → New query**: dán nội dung `supabase/migrations/20261123000000_m0_profiles_baseline.sql` → **Run**.
7. **Storage → New bucket**: tên `documents`, **Public = TẮT** (private).
8. Railway: thêm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; **xóa** `SUPABASE_JWT_SECRET` (trừ dự án HS256 cũ). Vercel: thêm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → Redeploy cả hai.
9. Lưu ý: email gửi bằng SMTP mặc định của Supabase bị giới hạn số lượng rất thấp — đủ cho thử nghiệm, cần SMTP riêng trước khi mời nhiều người.

## 7. Bảo vệ Preview (G)
| Lớp | Biện pháp | Trạng thái |
|---|---|---|
| Web | Vercel Deployment Protection (Standard) | Cần bật/giữ ở bước 4.8 |
| API | Mọi endpoint (trừ `/health`) bắt buộc JWT Supabase hợp lệ (`aud=authenticated`, `sub` là UUID) | Đã có, có test |
| API | Mock **tắt** trên Preview trừ khi `ALLOW_MOCKS_IN_PREVIEW=true`; production luôn tắt | Đã có, có test |
| API | Giới hạn theo IP cho mọi request + theo user cho API tốn phí | Đã có, có test |
| API | CORS chỉ domain Vercel (danh sách chính xác / regex neo) | Đã có, có test |
| API | Giới hạn kích thước body (PDF 20 MB, JSON ~1.6 MB); sync store in-memory tối đa 10 000 thao tác | Đã có |
| API | HanziLookup bị từ chối ở production; image không chứa dữ liệu | Đã có, có test |
| API | Không lộ secret trong log (redact `authorization`), `/health` chỉ báo chế độ | Đã có |
| Chưa có | Bảo vệ API bằng mật khẩu/IP allowlist riêng; giám sát chi phí | Đề xuất cho M1/M8 |

Railway không có cơ chế đăng nhập trước API như Vercel; lớp bảo vệ là JWT + rate limit + CORS. Nếu cần chặn hoàn toàn khi không dùng: Railway → service → **Settings → Delete/Pause** hoặc xóa domain công khai.
