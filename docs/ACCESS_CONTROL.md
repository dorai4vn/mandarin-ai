# Mô hình truy cập riêng tư — chỉ người được mời (D-037)

Ngày: 2026-11-24 · Trạng thái: **yêu cầu đã được chủ dự án duyệt; tài liệu thiết kế — triển khai ở M1** (trừ các thao tác cấu hình Supabase ở mục 4, làm ngay trên Dashboard).

## 1. Yêu cầu
- Mandarin AI là ứng dụng **riêng tư**: chỉ chủ ứng dụng và nhóm bạn được mời.
- **Không** có đăng ký công khai (self-service signup), **không** đăng nhập ẩn danh, **không** tài khoản dùng chung.
- Chỉ **quản trị viên** cấp/mời, khóa/vô hiệu hóa tài khoản. Giai đoạn đầu thao tác trên **Supabase Dashboard**; admin panel không bắt buộc.
- Mỗi tài khoản có dữ liệu học riêng: RLS ở database **và** kiểm tra quyền ở backend.
- Không lộ secret/service role key ở frontend.
- Có cách đặt/khôi phục mật khẩu an toàn cho người được mời.

## 2. Nguyên tắc thiết kế
1. **Chặn ở nguồn, không chỉ ở giao diện:** Project URL và publishable key là công khai theo thiết kế, nên ai cũng gọi được Supabase Auth trực tiếp. Việc chặn đăng ký phải nằm ở **cấu hình Supabase** (tắt signup, tắt anonymous) — ẩn nút đăng ký là chưa đủ.
2. **Mặc định từ chối (deny by default):** có tài khoản Supabase Auth hợp lệ **chưa đủ** để dùng app; người dùng phải là **thành viên đang hoạt động** trong bảng `app_members` do admin quản lý. Nếu một tài khoản lọt vào Auth (cấu hình sai, lỗi), API và RLS vẫn từ chối.
3. **Hai lớp kiểm tra:** RLS trong Postgres (chỉ chủ dữ liệu + thành viên active) và kiểm tra membership trong Fastify API trước mọi xử lý.
4. **Một người — một tài khoản:** không có tài khoản dùng chung; mọi dữ liệu và nhật ký gắn với `user_id` của từng người.
5. **Khóa có hiệu lực ngay:** vô hiệu hóa thành viên có tác dụng ở API trong vòng ≤ 60 giây (cache membership), không phải đợi access token hết hạn (mặc định 1 giờ).

## 3. Mô hình dữ liệu (M1)
```text
app_members(
  user_id      uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner','admin','member')) default 'member',
  status       text not null check (status in ('invited','active','disabled')) default 'invited',
  display_name text,
  invited_by   uuid references auth.users(id),
  invited_at   timestamptz not null default now(),
  activated_at timestamptz,
  disabled_at  timestamptz,
  disabled_reason text
)
```
- RLS: người dùng chỉ **đọc** dòng của chính mình; **không** ai sửa được `role`/`status` qua API công khai — chỉ `service_role` (script admin) hoặc SQL trên Dashboard.
- Hàm `public.is_active_member()` (`security definer`, `set search_path = ''`, `stable`) trả `true` khi `auth.uid()` có `status = 'active'`. **Mọi** policy dữ liệu học thêm điều kiện `and public.is_active_member()`.
- `invited → active`: khi người được mời đăng nhập lần đầu thành công (trigger hoặc API), hoặc admin đặt trực tiếp.
- Trigger `handle_new_user` hiện có (tạo `profiles`) **giữ**; **không** tự tạo membership `active` — membership do admin tạo (mặc định từ chối).
- Ghi nhật ký admin (`admin_audit_log`: ai, làm gì, với ai, khi nào) — M1.

## 4. Cấu hình Supabase bắt buộc (làm ngay trên Dashboard, áp dụng cho cả Preview hiện tại)
| Mục trên Dashboard | Giá trị | Vì sao |
|---|---|---|
| Authentication → Sign In / Providers → **Allow new users to sign up** | **TẮT** | Chặn mọi đăng ký mới, kể cả gọi API trực tiếp bằng publishable key. Người đã có tài khoản vẫn đăng nhập được |
| Authentication → Sign In / Providers → **Allow anonymous sign-ins** | **TẮT** | Không có phiên ẩn danh (API cũng từ chối `is_anonymous`) |
| Authentication → Sign In / Providers → **Email** | **BẬT** (để đăng nhập) | Đăng nhập bằng mã OTP/mật khẩu của người đã được cấp |
| Authentication → Sign In / Providers → **Confirm email** | BẬT | |
| Các provider khác (Google, GitHub, phone…) | **TẮT** | Mỗi provider là một đường tạo tài khoản mới |
| Authentication → URL Configuration → Site URL / Redirect URLs | Chỉ URL web chính thức | Link trong email (mời, khôi phục) chỉ quay về app |
| Authentication → Emails → Templates | Thêm `{{ .Token }}` (mã 6 số) vào **Magic Link**, **Invite user**, **Reset Password** | App dùng mã, không phụ thuộc link (D-025: link mở Safari, không mở app đã cài) |
| Authentication → Rate Limits | Giữ mặc định hoặc giảm | Hạn chế dò email/brute force |
| Authentication → Sessions | Bật phát hiện & thu hồi refresh token bị dùng lại | D-022 |
| Authentication → Policies / Password (nếu có) | Độ dài ≥ 10, bật kiểm tra mật khẩu bị lộ (nếu gói hỗ trợ) | Chất lượng mật khẩu |

`supabase/config.toml` (local/CI) phải đồng bộ: `enable_signup = false`, `enable_anonymous_sign_ins = false` — **đã đổi 2026-11-24** (M0-PWA, được duyệt).

## 5. Runbook quản trị viên (Supabase Dashboard, không cần code)
> Mỗi người bạn **một tài khoản riêng**, đúng email của họ. Không chia sẻ mật khẩu, không dùng chung tài khoản.

### 5.1 Mời một người (khuyến nghị)
1. Authentication → **Users** → **Add user** → **Send invitation** → nhập email người được mời → **Send invite**.
2. Người được mời nhận email (mẫu *Invite user*, có mã 6 số và link). Họ mở app → **Đăng nhập** → nhập email → nhận mã → nhập mã.
3. (M1) Admin thêm dòng `app_members` cho người đó (`status = 'active'`) — Claude sẽ chuẩn bị đoạn SQL mẫu/kịch bản; trước M1, API chưa kiểm tra membership (xem mục 8).

### 5.2 Tạo tài khoản trực tiếp (khi không muốn gửi email mời)
1. Authentication → Users → **Add user** → **Create new user** → nhập email, bật **Auto Confirm User**.
2. **Không** đặt mật khẩu dùng chung hoặc mật khẩu đoán được; để trống mật khẩu (nếu giao diện cho phép) hoặc đặt mật khẩu ngẫu nhiên dài rồi **không** gửi cho ai — người dùng đăng nhập bằng mã OTP qua email của chính họ và tự đặt mật khẩu sau (5.4).

### 5.3 Khóa / vô hiệu hóa
- **Tạm khóa (M1):** đặt `app_members.status = 'disabled'` → API từ chối trong ≤ 60 giây, RLS chặn ngay mọi truy vấn trực tiếp.
- **Chặn đăng nhập ở Supabase Auth:** dùng Admin API `ban_duration` (script phía server do Claude chuẩn bị ở M1, dùng secret key ở máy admin/Railway — không qua trình duyệt), hoặc chức năng ban/chặn trên Dashboard nếu phiên bản Dashboard có.
- **Xóa hẳn:** Authentication → Users → chọn người dùng → **Delete user** (xóa cả dữ liệu theo `on delete cascade` — cân nhắc xuất dữ liệu trước).
- Sau khi khóa/xóa: access token cũ hết hạn trong ≤ 1 giờ; nhờ kiểm tra membership (M1) API từ chối sớm hơn.

### 5.4 Đặt / khôi phục mật khẩu (an toàn)
- **Mặc định không cần mật khẩu:** đăng nhập bằng **mã OTP 6 số** gửi tới email của chính người dùng (chỉ cho email đã có tài khoản; signup tắt nên email lạ không tạo được tài khoản).
- **Đặt mật khẩu (tùy chọn, M1):** sau khi đăng nhập bằng OTP, vào *Hồ sơ → Đặt mật khẩu*; Supabase yêu cầu xác thực lại (reauthentication nonce gửi qua email) trước khi đổi mật khẩu — bật **Secure password change**.
- **Quên mật khẩu (M1):** *Quên mật khẩu* → nhập email → mã khôi phục 6 số (mẫu *Reset Password* có `{{ .Token }}`) → nhập mã → đặt mật khẩu mới → mọi phiên cũ bị thu hồi.
- Thông báo lỗi **không** tiết lộ email có tồn tại hay không ("Nếu email đã được cấp quyền, bạn sẽ nhận được mã").
- Admin **không bao giờ** biết hoặc gửi mật khẩu của người khác.

### 5.5 Kiểm tra định kỳ
- Danh sách Users trên Dashboard chỉ gồm người được mời; mỗi email = một người.
- Không có user lạ (nếu có: signup đang bật nhầm → tắt, xóa user lạ, xem log Auth).

## 6. Kiểm tra quyền ở backend (M1)
- Sau khi xác thực JWT (D-036), API tra `app_members` (cache trong bộ nhớ ≤ 60 giây theo `user_id`): không có dòng hoặc `status ≠ 'active'` → **403 `not_a_member`**.
- Endpoint quản trị (nếu có sau này) yêu cầu `role in ('owner','admin')` và ghi `admin_audit_log`.
- Truy vấn dữ liệu học dùng **quyền của người dùng** (JWT → RLS) cho đọc/ghi thông thường; chỉ dùng secret key cho thao tác hệ thống (Storage, job nền), luôn kèm điều kiện `user_id` rõ ràng.
- Không có endpoint tạo tài khoản; không có endpoint đổi `role`/`status` cho người dùng thường.

## 7. Mối đe dọa và biện pháp
| Mối đe dọa | Biện pháp |
|---|---|
| Người lạ tự đăng ký bằng publishable key | Signup tắt ở Supabase; membership mặc định từ chối |
| Dò email (biết ai là thành viên) | Thông báo lỗi trung tính; rate limit Auth + API |
| Brute force mã OTP/mật khẩu | Rate limit của Supabase Auth; OTP hết hạn ngắn (đề xuất ≤ 10 phút) |
| Tài khoản bị chiếm | Phát hiện refresh token dùng lại; admin khóa membership có hiệu lực ≤ 60 s; người dùng đổi mật khẩu thu hồi phiên |
| Lộ secret key | Chỉ ở Railway/máy admin; guard `check:secrets`; API từ chối publishable key đặt nhầm; xoay khóa trên Dashboard khi nghi ngờ |
| Dùng chung tài khoản | Chính sách + mỗi email một người; không hỗ trợ "tài khoản nhóm" |
| Người bị khóa vẫn còn dữ liệu offline trên máy | Đăng xuất/khóa: app xóa dữ liệu cục bộ khi API trả 401/403 `not_a_member` (M1) |

## 8. Hiện trạng M0-PWA đối chiếu
| Điểm | Hiện trạng | Mức độ | Xử lý |
|---|---|---|---|
| Supabase "Allow new users to sign up" | Chủ dự án báo đã **tắt** trên `mandarin-ai-dev` (cùng anonymous sign-ins; chỉ bật Email) — 2026-11-24 | Cao → đã xử lý | Xác nhận lại bằng smoke test A12a/A12b |
| `/lab/session` gọi OTP với `shouldCreateUser: true` | **Đã sửa (2026-11-24):** `apps/web/src/lib/auth-otp.ts` luôn gửi `shouldCreateUser: false`; thông báo trung tính, không lộ email có tồn tại; chữ "chỉ dành cho người được mời", không có chữ/đường dẫn "Đăng ký" | — | Unit test `auth-otp.test.ts`, E2E `auth-invite-only.spec.ts` (chặn request, kiểm `create_user:false`), test Auth thật `scripts/test-auth-invite-only.mjs` (CI job database) |
| API chấp nhận mọi user đã đăng nhập của dự án | Chưa có membership | Trung bình (chỉ có user do admin tạo khi signup tắt) | M1: kiểm tra `app_members` |
| `supabase/config.toml` `enable_signup` | **Đã đổi `false` (2026-11-24)**; `enable_anonymous_sign_ins = false` | — | Chỉ ảnh hưởng local/CI; Supabase Cloud cấu hình trên Dashboard |
| Phiên lưu trong `localStorage` (supabase-js) | Còn nguyên | Trung bình (XSS) | M1: cookie HttpOnly (`docs/AUTH_SESSION_DESIGN.md`) |
| JWT còn hiệu lực tối đa ~1 giờ sau khi khóa user | Còn nguyên | Thấp–trung bình | M1: kiểm membership ở API (cache ≤ 60 s) |
| Vercel Deployment Protection | Giới hạn người xem Preview | Hỗ trợ | Giữ bật |
| Secret key ở frontend | Không có (đã kiểm bằng build có giá trị mồi) | — | Giữ guard |
