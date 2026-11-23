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
| Supabase | Dự án **`mandarin-ai-preview`** riêng | Dự án production **riêng**, tạo sau khi đo region (D-034) |
| Railway | Project **`mandarin-ai-preview`**, `APP_ENV=preview` | Project/environment production riêng, `APP_ENV=production` |
| Vercel | Biến môi trường phạm vi **Preview**; Deployment Protection bật | Biến phạm vi **Production**; tên miền riêng |
| Dữ liệu | Chỉ tài khoản thử nghiệm; có thể xóa bất cứ lúc nào | Dữ liệu người học thật |
| Khóa bí mật | Khóa riêng cho Preview (không dùng chung với production) | Khóa riêng |

Không dùng chung database, khóa hay bucket giữa preview và production.

## 2. Biến môi trường

### 2.1 Supabase (dự án `mandarin-ai-preview`) — lấy ở Project Settings → API Keys / Data API
| Giá trị | Dùng ở | Loại |
|---|---|---|
| Project URL `https://<ref>.supabase.co` | Railway `SUPABASE_URL`, Vercel `NEXT_PUBLIC_SUPABASE_URL` | công khai |
| Publishable key (`sb_publishable_…`) hoặc anon key | Vercel `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | công khai (được RLS bảo vệ) |
| Secret key (`sb_secret_…`) / service role | Railway `SUPABASE_SERVICE_ROLE_KEY` | **BÍ MẬT** — không bao giờ đặt ở Vercel |
| Mật khẩu database | Không dùng trong Preview | **BÍ MẬT** — lưu trong trình quản lý mật khẩu của anh/chị |

### 2.2 Railway — service `api`
| Biến | Loại | Giá trị Preview |
|---|---|---|
| `APP_ENV` | cấu hình | `preview` |
| `TRUST_PROXY` | cấu hình | `true` |
| `SUPABASE_URL` | cấu hình | Project URL (2.1) — API lấy khóa xác thực JWT (JWKS) từ đây |
| `WEB_ORIGINS` | cấu hình | URL Vercel cố định của branch, ví dụ `https://mandarin-ai-git-claude-m0-pwa-<team>.vercel.app` |
| `WEB_ORIGIN_REGEX` | cấu hình (tùy chọn) | `^https://mandarin-ai-[a-z0-9-]+-<team>\.vercel\.app$` — thay `<team>` bằng slug team Vercel của anh/chị |
| `SUPABASE_SERVICE_ROLE_KEY` | **BÍ MẬT** | Secret key (2.1) — để upload PDF vào bucket private |
| `STORAGE_BUCKET` | cấu hình | `documents` |
| `HANDWRITING_ADAPTER` | cấu hình | **`disabled`** (D-029: `hanzilookup` bị API từ chối ngoài development) |
| `ALLOW_MOCKS_IN_PREVIEW` | cấu hình | `false` (mặc định). Đặt `true` chỉ để thử giao diện chấm phát âm/Realtime **giả lập có nhãn MOCK** |
| `MISSING_PROVIDER_MODE` | cấu hình | để trống (chỉ có tác dụng khi bật dòng trên) |
| `RATE_LIMIT_PER_MINUTE` | cấu hình | `20` |
| `IP_RATE_LIMIT_PER_MINUTE` | cấu hình | `300` |
| `OPENAI_API_KEY` | **BÍ MẬT** | Để trống cho tới khi thử OpenAI thật |
| `AZURE_SPEECH_KEY` | **BÍ MẬT** | Để trống cho tới khi thử Azure thật |
| `AZURE_SPEECH_REGION`, `OPENAI_REALTIME_MODEL` | cấu hình | Chỉ khi có khóa tương ứng |
| `SUPABASE_JWT_SECRET` | **BÍ MẬT** | **Không đặt** (chỉ cần với dự án Supabase dùng JWT HS256 kiểu cũ) |
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
2. **Organization:** tạo mới hoặc chọn sẵn. **Project name:** `mandarin-ai-preview`. **Database password:** bấm *Generate*, lưu vào trình quản lý mật khẩu (không gửi qua chat).
3. **Region:** chọn region gần người dùng thử nghiệm (ví dụ *Southeast Asia (Singapore)*) — với Preview chấp nhận được; production sẽ chọn lại bằng đo đạc (D-034).
4. Bấm **Create new project**, chờ trạng thái xanh.
5. **SQL Editor** → **New query** → mở file `supabase/migrations/20261123000000_m0_profiles_baseline.sql` trên GitHub (nút *Raw*), sao chép toàn bộ, dán vào → **Run**. Kết quả mong đợi: "Success. No rows returned".
6. **Storage** → **New bucket** → tên `documents` → **Public bucket: TẮT** → **Save**.
7. **Authentication → Sign In / Providers → Email:** bật *Enable Email provider*; bật *Confirm email*.
8. **Authentication → Emails → Templates → Magic Link:** thêm vào nội dung email dòng `Mã đăng nhập Mandarin AI: {{ .Token }}` → **Save** (app dùng mã 6 số, D-025).
9. **Authentication → Sessions** (nếu có): kiểm tra *Detect and revoke potentially compromised refresh tokens* đang bật.
10. **Project Settings → API Keys:** ghi lại (cho bước 2–3) Project URL, publishable key (công khai); secret key chỉ dán thẳng vào Railway ở bước 2.

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
   Sau đó **New Variable** → tên `SUPABASE_SERVICE_ROLE_KEY` → dán secret key Supabase → **Add** (đây là bí mật, chỉ dán ở đây).
6. **Settings → Networking → Generate Domain** → ghi lại URL `https://….up.railway.app`.
7. **Deployments:** chờ **Success**. Mở `https://<domain>/health` trên trình duyệt. Mong đợi:
   ```json
   {"status":"ok","environment":"preview","providers":{"openaiRealtime":"disabled","azureSpeech":"disabled","handwriting":"disabled","storage":"live","sync":"disabled"}}
   ```
   `storage: live` = đã có khóa Supabase; `sync: disabled` là **đúng** (chưa có database đồng bộ — M1).
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
4. **Hồ sơ → Phiên đăng nhập:** nhập email → nhận mã 6 số → đăng nhập (giới hạn email mặc định của Supabase rất thấp — chỉ thử vài lần). Lưu ý: ở M0 phiên đăng nhập do thư viện Supabase giữ trong `localStorage` của trình duyệt; phiên cookie HttpOnly làm ở M1 (`docs/AUTH_SESSION_DESIGN.md`) → **chỉ dùng tài khoản thử nghiệm** trên Preview.
5. Chạy `docs/SMOKE_TEST.md` và gửi kết quả.

## 7. Kiểm tra an toàn Preview
| Lớp | Biện pháp | Trạng thái |
|---|---|---|
| Truy cập web | Vercel Deployment Protection (Standard) | Anh/chị bật ở 5.8 |
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
- **Không nhận được email mã:** kiểm tra thư rác; giới hạn email mặc định của Supabase; mẫu email có `{{ .Token }}`.
