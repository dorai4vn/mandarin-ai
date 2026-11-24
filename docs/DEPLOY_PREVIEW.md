# Triển khai Preview: Supabase + Railway (API) + Vercel (web) — D-031 (đã duyệt)

Tài liệu dành cho người không chuyên. Mọi thao tác làm trên giao diện web. **Không gửi khóa bí mật qua chat** — chỉ dán khóa vào ô biến môi trường của Railway/Vercel. Những thứ **công khai** (URL Preview, URL API, Project URL Supabase) có thể gửi qua chat để Claude kiểm tra.

Trạng thái: **Preview (thử nghiệm)**, build từ branch `claude/m0-pwa` (chưa merge `main`). Không phải production.

---

## 0. Ai làm gì
| Bước | Anh/chị thao tác trực tiếp | Claude làm được |
|---|---|---|
| Tạo tài khoản, đăng nhập bằng GitHub, cấp quyền repo cho Railway/Vercel | ✅ (bắt buộc — cần tài khoản của anh/chị) | ❌ |
| Tạo dự án Supabase, chọn region, lấy khóa | ✅ | ❌ (không có quyền vào tài khoản) |
| Dán biến môi trường / khóa bí mật vào Railway, Vercel | ✅ | ❌ (không được nhận secret qua chat) |
| Bật Deployment Protection, chia sẻ link Preview | ✅ | ❌ |
| Chạy SQL migration trên Supabase (dán file SQL vào SQL Editor) | ✅ | Chuẩn bị file SQL, giải thích kết quả |
| Viết/sửa cấu hình (`vercel.json`, `railway.json`, Dockerfile, CORS, rate limit) | — | ✅ |
| Kiểm tra CI trên GitHub, cập nhật PR | — | ✅ |
| Kiểm tra `/health` và trang Preview **khi anh/chị gửi URL công khai** | — | ✅ nếu mạng của môi trường Claude cho phép truy cập (có thể bị chặn — khi đó anh/chị chụp màn hình) |
| Đọc log lỗi build/deploy | Gửi ảnh hoặc dán log (log không chứa secret) | ✅ phân tích và sửa code |
| Smoke test trên iPhone, Android, máy tính (`docs/SMOKE_TEST.md`) | ✅ | Tổng hợp kết quả, sửa lỗi |
| Đo region (D-034) trên thiết bị thật | ✅ chạy trang đo | ✅ chuẩn bị trang/script đo |

---

## 1. Tách biệt môi trường (preview ≠ production)
| Thành phần | Preview (bây giờ) | Production (sau này) |
|---|---|---|
| Supabase | Dự án **`mandarin-ai-dev`** riêng (tên chủ dự án đã tạo) | Dự án production **riêng**, tạo sau khi đo region (D-034) |
| Railway | Project **`mandarin-ai-preview`**, `APP_ENV=preview` | Project/environment production riêng, `APP_ENV=production` |
| Vercel | Biến môi trường phạm vi **Preview**; Deployment Protection bật | Biến phạm vi **Production**; tên miền riêng |
| Dữ liệu | Chỉ tài khoản thử nghiệm; có thể xóa bất cứ lúc nào | Dữ liệu người học thật |
| Khóa bí mật | Khóa riêng cho Preview (không dùng chung với production) | Khóa riêng |

Không dùng chung database, khóa hay bucket giữa preview và production.

## 2. Biến môi trường

### 2.1 Supabase (dự án `mandarin-ai-dev`) — ba loại khóa khác nhau

| Loại | Trông như | Là JWT? | Dùng để | Đặt ở |
|---|---|---|---|---|
| **Publishable key** | `sb_publishable_…` (hoặc anon key kiểu cũ `eyJ…`) | Không (khóa mới) | Trình duyệt gọi Supabase Auth (đăng nhập email + mật khẩu). Công khai theo thiết kế; dữ liệu được RLS bảo vệ | Vercel `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| **Secret key** | `sb_secret_…` (hoặc service_role kiểu cũ `eyJ…`) | Không (khóa mới) | Server ghi Storage với quyền đặc biệt (bỏ qua RLS). API gửi trong header `apikey` | Railway `SUPABASE_SECRET_KEY` — **BÍ MẬT** |
| **JWT signing keys** | Cặp khóa bất đối xứng (ES256) ở Project Settings → JWT Keys; phần **công khai** được Supabase đăng tại `<Project URL>/auth/v1/.well-known/jwks.json` | — | Supabase dùng khóa riêng để **ký** access token của người dùng; API tự tải khóa công khai để **kiểm tra** | **Không cần đặt gì** — API chỉ cần `SUPABASE_URL` |
| Legacy JWT secret | Chuỗi bí mật HS256 (chỉ dự án/khóa kiểu cũ) | — | Chỉ khi dự án vẫn ký token bằng HS256 | Railway `SUPABASE_JWT_SECRET` — **chỉ đặt nếu bước kiểm tra ở mục 3.11 cho thấy cần** |

Lấy giá trị ở **Project Settings → API Keys** (Project URL, publishable, secret) và **Project Settings → JWT Keys** (xem loại khóa đang dùng).

| Giá trị | Dùng ở | Loại |
|---|---|---|
| Project URL `https://<ref>.supabase.co` | Railway `SUPABASE_URL`, Vercel `NEXT_PUBLIC_SUPABASE_URL` | công khai |
| Mật khẩu database | **Không dùng** trong Preview | **BÍ MẬT** — chỉ lưu trong trình quản lý mật khẩu |

### 2.2 Railway — service `api`
| Biến | Loại | Giá trị Preview |
|---|---|---|
| `APP_ENV` | cấu hình | `preview` |
| `TRUST_PROXY` | cấu hình | `true` |
| `SUPABASE_URL` | cấu hình — **bắt buộc** | Project URL (2.1), phải là `https://` — API lấy khóa công khai (JWKS) từ đây và kiểm tra `iss = <Project URL>/auth/v1`; thiếu → API không khởi động |
| `WEB_ORIGINS` | cấu hình | URL Vercel cố định của branch, ví dụ `https://mandarin-ai-git-claude-m0-pwa-<team>.vercel.app` |
| `WEB_ORIGIN_REGEX` | cấu hình (tùy chọn) | `^https://mandarin-ai-[a-z0-9-]+-<team>\.vercel\.app$` — thay `<team>` bằng slug team Vercel của anh/chị |
| `SUPABASE_SECRET_KEY` | **BÍ MẬT** | Secret key `sb_secret_…` (2.1) — để upload PDF vào bucket private. (Tên cũ `SUPABASE_SERVICE_ROLE_KEY` vẫn được chấp nhận) |
| `STORAGE_BUCKET` | cấu hình | `documents` |
| `HANDWRITING_ADAPTER` | cấu hình | **`disabled`** (D-029: `hanzilookup` bị API từ chối ngoài development) |
| `ALLOW_MOCKS_IN_PREVIEW` | cấu hình | `false` (mặc định). Đặt `true` chỉ để thử giao diện chấm phát âm/Realtime **giả lập có nhãn MOCK** |
| `MISSING_PROVIDER_MODE` | cấu hình | để trống (chỉ có tác dụng khi bật dòng trên) |
| `RATE_LIMIT_PER_MINUTE` | cấu hình | `20` |
| `IP_RATE_LIMIT_PER_MINUTE` | cấu hình | `300` |
| `OPENAI_API_KEY` | **BÍ MẬT** | Để trống cho tới khi thử OpenAI thật |
| `AZURE_SPEECH_KEY` | **BÍ MẬT** | Để trống cho tới khi thử Azure thật |
| `AZURE_SPEECH_REGION`, `OPENAI_REALTIME_MODEL` | cấu hình | Chỉ khi có khóa tương ứng |
| `SUPABASE_JWT_SECRET` | **BÍ MẬT** | **Không đặt** — trừ khi mục 3.11 cho thấy dự án còn ký token bằng HS256 (Legacy JWT secret) |
| `PORT`, `NODE_ENV` | tự động | Railway và Dockerfile tự đặt — không nhập |

**Không thể** dùng mock lưu dữ liệu trên Preview: đồng bộ và lưu file chỉ chạy với backend thật; dữ liệu học đã nhập luôn ở trạng thái "chờ đồng bộ" trên máy cho tới khi M1 có bảng Postgres (D-035).

### 2.3 Vercel — project `mandarin-ai`, phạm vi **Preview**
| Biến | Loại | Giá trị |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | công khai (nhúng vào JS) | URL Railway của API, không có `/` cuối |
| `NEXT_PUBLIC_SUPABASE_URL` | công khai | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | công khai | Publishable key |
| `ENABLE_EXPERIMENTAL_COREPACK` | cấu hình build | `1` (để dùng đúng pnpm 10.28) |
| `NEXT_PUBLIC_ENABLE_DEV_TOKEN` | công khai | **Không đặt** (hoặc `false`) |
| `NEXT_PUBLIC_ALLOW_MOCK_SYNC` | công khai | **Không đặt** (hoặc `false`) — chỉ dành cho E2E |

Vercel **không** chứa khóa bí mật nào.

---

## 3. Bước 1 — Supabase (≈ 15 phút) · anh/chị làm
1. Vào **supabase.com** → **Sign in** (có thể dùng GitHub) → **New project**.
2. **Organization:** tạo mới hoặc chọn sẵn. **Project name:** `mandarin-ai-dev` (anh/chị đã tạo). **Database password:** bấm *Generate*, lưu vào trình quản lý mật khẩu (không gửi qua chat).
3. **Region:** chọn region gần người dùng thử nghiệm (ví dụ *Southeast Asia (Singapore)*) — với Preview chấp nhận được; production sẽ chọn lại bằng đo đạc (D-034).
4. Bấm **Create new project**, chờ trạng thái xanh.
5. **SQL Editor** → **New query** → mở file `supabase/migrations/20261123000000_m0_profiles_baseline.sql` trên GitHub (nút *Raw*), sao chép toàn bộ, dán vào → **Run**. Kết quả mong đợi: "Success. No rows returned".
6. **Storage** → **New bucket** → tên `documents` → **Public bucket: TẮT** → **Save**.
7. **Authentication → Sign In / Providers** (ứng dụng riêng tư — D-037, D-038, `docs/ACCESS_CONTROL.md`):
   - **Allow new users to sign up: TẮT** ← quan trọng nhất; nếu dự án đang bật thì tắt **ngay**, kể cả khi Preview đã online.
   - **Allow anonymous sign-ins: TẮT**.
   - **Email:** bật *Enable Email provider* (cần cho đăng nhập email + mật khẩu). *Secure password change*: **TẮT** (tính năng đó cần gửi email).
   - Mọi provider khác (Google, GitHub, Phone…): **TẮT**.
8. **Authentication → Policies / Password** (tên mục có thể khác): độ dài tối thiểu **12** ký tự (D-038); bật *leaked password protection* nếu gói hiện tại hỗ trợ. **Không cần** sửa mẫu email hay cấu hình SMTP: đăng nhập không gửi email. Khôi phục mật khẩu qua email tạm hoãn tới khi có Custom SMTP.
9. **Authentication → Sessions** (nếu có): kiểm tra *Detect and revoke potentially compromised refresh tokens* đang bật. **Authentication → Sign In / Providers:** để **tắt** *Allow anonymous sign-ins* (API cũng từ chối phiên ẩn danh).
10. **Project Settings → API Keys:** ghi lại (cho bước 2–3) Project URL, publishable key (công khai); secret key chỉ dán thẳng vào Railway ở bước 2. Nếu trang chỉ có "Legacy API keys" (anon/service_role): bấm tạo **publishable key** và **secret key** mới (khuyến nghị) — hoặc dùng anon/service_role kiểu cũ (API vẫn hỗ trợ).
11. **Project Settings → JWT Keys** — xác định cách Supabase ký token người dùng:
    - Thấy **Current key** loại **ECC (P-256)** hoặc RSA → token ký **bất đối xứng** → Railway **chỉ cần `SUPABASE_URL`**, không đặt `SUPABASE_JWT_SECRET`. Kiểm tra nhanh: mở `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` trên trình duyệt → thấy `"keys":[{…"alg":"ES256"…}]`.
    - Chỉ thấy **Legacy JWT Secret** đang là khóa hiện hành (JWKS trả `"keys":[]`) → khuyến nghị bấm **Migrate JWT secret** / **Rotate keys** để chuyển sang khóa bất đối xứng; nếu chưa muốn đổi, đặt thêm `SUPABASE_JWT_SECRET` trên Railway (giá trị Legacy JWT Secret — **bí mật**).
    - Trong lúc xoay khóa (cả hai cùng hợp lệ): đặt cả `SUPABASE_URL` và `SUPABASE_JWT_SECRET`; API chọn cách kiểm tra theo từng token. Khi khóa HS256 cũ đã bị thu hồi → xóa `SUPABASE_JWT_SECRET`.

**Migration cần chạy (đúng 1 file, chạy 1 lần):** `supabase/migrations/20261123000000_m0_profiles_baseline.sql` — tạo bảng `profiles` + RLS + trigger tạo profile khi người dùng đăng ký. Chạy lại lần 2 sẽ báo lỗi "already exists" (an toàn, không mất dữ liệu). Bucket `documents` tạo bằng giao diện (bước 6), không bằng migration.

## 4. Bước 2 — Railway (≈ 15 phút) · anh/chị làm
1. Vào **railway.com** → **Login** → **GitHub** → cho phép.
2. **New Project** → **Deploy from GitHub repo** → nếu không thấy repo: **Configure GitHub App** → chọn `dorai4vn/mandarin-ai` → **Save** → chọn repo.
3. Đổi tên project thành `mandarin-ai-preview` (Settings của project).
4. Mở service vừa tạo → **Settings**:
   - **Source → Branch:** `claude/m0-pwa`.
   - **Root Directory:** để trống.
   - **Config-as-code → Railway Config File:** `/apps/api/railway.json`.
5. **Variables** → **Raw Editor** → dán các dòng cấu hình (không bí mật) dưới đây, sửa giá trị trong `< >`, rồi **Update Variables**:
   ```text
   APP_ENV=preview
   TRUST_PROXY=true
   SUPABASE_URL=<Project URL Supabase>
   WEB_ORIGINS=https://example.invalid
   STORAGE_BUCKET=documents
   HANDWRITING_ADAPTER=disabled
   ALLOW_MOCKS_IN_PREVIEW=false
   RATE_LIMIT_PER_MINUTE=20
   IP_RATE_LIMIT_PER_MINUTE=300
   ```
   Sau đó **New Variable** → tên `SUPABASE_SECRET_KEY` → dán **secret key** (`sb_secret_…`) của Supabase → **Add** (đây là bí mật, chỉ dán ở đây). **Không** dán publishable key vào đây — API sẽ từ chối khởi động nếu nhầm.
6. **Settings → Networking → Generate Domain** → ghi lại URL `https://….up.railway.app`.
7. **Deployments:** chờ **Success**. Mở `https://<domain>/health` trên trình duyệt. Mong đợi:
   ```json
   {"status":"ok","version":"0.1.0","environment":"preview","auth":["jwks"],"providers":{"openaiRealtime":"disabled","azureSpeech":"disabled","handwriting":"disabled","storage":"live","sync":"disabled"}}
   ```
   `auth: ["jwks"]` = API kiểm tra token bằng khóa công khai của Supabase; `storage: live` = đã có secret key; `sync: disabled` là **đúng** (chưa có database đồng bộ — M1).
8. Gửi cho Claude **URL API** (công khai) nếu muốn Claude kiểm tra.

## 5. Bước 3 — Vercel (≈ 15 phút) · anh/chị làm
1. Vào **vercel.com** → **Continue with GitHub**.
2. **Add New… → Project** → nếu không thấy repo: **Adjust GitHub App Permissions** → chọn `dorai4vn/mandarin-ai` → **Save** → **Import**.
3. **Configure Project:**
   - **Project Name:** `mandarin-ai`.
   - **Root Directory → Edit →** `apps/web` → **Continue**.
   - **Framework Preset:** Next.js (tự nhận). **Không** bật override Build/Install (đã có `apps/web/vercel.json`).
   - **Environment Variables:** thêm 4 biến ở mục 2.3 (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ENABLE_EXPERIMENTAL_COREPACK=1`).
4. **Deploy.** Lần đầu Vercel build từ `main` → **sẽ lỗi** vì `apps/web` chưa có trên `main`. Điều này **đúng như dự kiến**.
5. **Settings → Environment Variables:** kiểm tra 4 biến có tick **Preview** (bỏ tick Production cho tới khi có production thật).
6. Tạo Preview từ branch: Claude đẩy một commit lên `claude/m0-pwa` (hoặc anh/chị bấm **Redeploy** trên PR #2) → Vercel tạo **Preview Deployment** và gắn link vào PR #2.
7. **Deployments** → chọn bản của `claude/m0-pwa` → **Domains**: ghi lại URL cố định `mandarin-ai-git-claude-m0-pwa-<team>.vercel.app`.
8. **Settings → Deployment Protection → Vercel Authentication:** giữ **Standard Protection** (chỉ thành viên team Vercel mở được Preview). Muốn cho người khác thử: dùng **Share** trên trang deployment để tạo link chia sẻ có thời hạn — không tắt bảo vệ.
9. **Settings → General → Node.js Version:** 22.x.

## 6. Bước 4 — Kết nối (≈ 5 phút) · anh/chị làm
1. **Railway → Variables:** sửa `WEB_ORIGINS` = URL ở 5.7 (có `https://`, không `/` cuối). Tùy chọn thêm `WEB_ORIGIN_REGEX` (2.2). Railway tự redeploy.
2. **Supabase → Authentication → URL Configuration:** *Site URL* = URL ở 5.7; *Redirect URLs* thêm cùng URL.
3. Mở URL web → **Phòng thử M0 → Khả năng trình duyệt**: không có cảnh báo đỏ.
4. **Cấp tài khoản thử nghiệm (admin):** Supabase → Authentication → Users → **Add user** → **Create new user** → email thật của từng người + **mật khẩu tạm ngẫu nhiên ≥ 12 ký tự** + bật **Auto Confirm User**. Không dùng *Send invitation* (cần email), không tạo tài khoản dùng chung. Gửi mật khẩu tạm qua kênh riêng. Tài khoản tạo trước đây cho OTP (không có mật khẩu): xóa và tạo lại theo cách này (chưa có dữ liệu). Chi tiết: `docs/ACCESS_CONTROL.md` mục 8.
5. **Kiểm tra chặn đăng ký và thông báo chung:** ở *Hồ sơ → Phiên đăng nhập*, nhập một email **chưa được cấp** + mật khẩu bất kỳ → "Email hoặc mật khẩu không đúng."; nhập email **đã được cấp** + mật khẩu **sai** → **cùng** thông báo; Supabase → Users không có user mới. Cấu hình "Allow new users to sign up = TẮT" là lớp chặn chính; app không có đường đăng ký.
6. **Đăng nhập thật:** email đã được cấp + mật khẩu tạm đúng → "Đã đăng nhập". Lưu ý M0: phiên do thư viện Supabase giữ trong `localStorage`; **chưa có** bắt buộc đổi mật khẩu và kiểm tra membership (M1) → **chỉ dùng tài khoản thử nghiệm**, không nhập dữ liệu thật trên Preview.
7. Chạy `docs/SMOKE_TEST.md` và gửi kết quả.

## 7. Kiểm tra an toàn Preview
| Lớp | Biện pháp | Trạng thái |
|---|---|---|
| Truy cập web | Vercel Deployment Protection (Standard) | Anh/chị bật ở 5.8 |
| Tài khoản | Ứng dụng riêng tư: Supabase **signup TẮT**, anonymous TẮT, chỉ admin mời/cấp tài khoản (D-037) | Anh/chị cấu hình ở 3.7; membership ở API là M1 |
| API | Mọi endpoint trừ `/health` yêu cầu JWT Supabase hợp lệ (`aud=authenticated`, `sub` là UUID) | Có test |
| Dữ liệu học | Mock lưu dữ liệu (sync/storage) **không bao giờ** chạy ngoài development; trình duyệt không coi xác nhận mock là đã lưu (D-035) | Có test |
| Nhận dạng chữ viết tay | `hanzilookup` bị từ chối ngoài development (D-029) | Có test |
| CORS | Chỉ origin Vercel (danh sách chính xác hoặc regex neo `^https://…$`) | Có test |
| Rate limit | Theo IP (mọi request) + theo user (API tốn phí) | Có test |
| Secret | Chỉ ở Railway; Vercel chỉ có giá trị công khai; `check:secrets` trong CI | Có |
| Log | Header `authorization` bị che trong log | Có |
| Tách môi trường | Dự án Supabase/Railway riêng cho Preview (mục 1) | Anh/chị tạo đúng tên |
| Chưa có | Bảo vệ API bằng allowlist IP/mật khẩu; cảnh báo chi phí | Đề xuất M1/M8 |

Tạm dừng Preview khi không dùng: Railway → service → **Settings → Pause/Delete**; Vercel → Deployment → **Delete**; Supabase → **Pause project**.

## 8. Khi gặp lỗi
- **Railway build lỗi:** mở Deployments → bản lỗi → **View logs** → sao chép đoạn lỗi (log build không chứa secret) gửi Claude.
- **API báo "Invalid API configuration: …":** tên biến được nêu trong thông báo — kiểm tra lại giá trị biến đó (thông báo không in giá trị).
- **Web gọi API báo "Không kết nối được máy chủ API":** kiểm tra `NEXT_PUBLIC_API_URL` (Vercel) và `WEB_ORIGINS` (Railway) đúng từng ký tự.
- **Đăng nhập luôn báo "Email hoặc mật khẩu không đúng.":** kiểm tra user có trong Authentication → Users, đã *Confirmed* (Auto Confirm), mật khẩu tạm gõ đúng (không thừa khoảng trắng); `NEXT_PUBLIC_SUPABASE_URL`/publishable key trên Vercel đúng dự án. Thông báo cố ý không nói lý do cụ thể (chống dò tài khoản).

## 9. Bảo mật xác thực (tóm tắt cho người vận hành)
- API chỉ chấp nhận **access token người dùng** của dự án Supabase đã cấu hình: chữ ký hợp lệ (khóa công khai JWKS hoặc Legacy JWT secret nếu được đặt), `iss = <Project URL>/auth/v1`, `aud = authenticated`, `role = authenticated`, chưa hết hạn, không phải phiên ẩn danh.
- Publishable key, secret key, token `service_role`, token tự ký với thuật toán khác hoặc `alg: none` → **401**.
- Khóa JWKS được cache 10 phút; khi Supabase xoay khóa (token có `kid` mới) API tự tải lại (tối đa 1 lần / 30 giây).
- Access token vẫn hợp lệ tới khi hết hạn (mặc định 1 giờ) kể cả sau khi đăng xuất — giới hạn của JWT; M1 chặn sớm hơn bằng membership (≤ 60 s) và `password_changed_at` (`docs/ACCESS_CONTROL.md` mục 5).
- M0: API chấp nhận **mọi** user đã đăng nhập của dự án (chưa có `app_members`) → chỉ tạo tài khoản cho người được phép.
- Secret key chỉ được API gửi tới Supabase Storage trong header `apikey`; không ghi vào log, không có trong JavaScript của trình duyệt (đã kiểm bằng build có giá trị mồi).
