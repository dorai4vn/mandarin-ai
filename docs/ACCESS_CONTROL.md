# Mô hình truy cập riêng tư — chỉ người được cấp quyền (D-037, D-038)

Ngày: 2026-11-24 · Trạng thái: **đã được chủ dự án duyệt**. Nguyên tắc chỉ-mời và mặc định từ chối: D-037. Phương thức xác thực (email + mật khẩu do admin cấp, bắt buộc đổi mật khẩu lần đầu): **D-038**, thay phần OTP của D-037 và D-025. Triển khai `app_members`, đổi mật khẩu bắt buộc, cookie session, audit: **M1**. M0-PWA chỉ có luồng đăng nhập thử nghiệm (mục 9).

## 1. Yêu cầu
- Mandarin AI là ứng dụng **riêng tư**, chỉ dành cho các email được chủ ứng dụng phê duyệt.
- **Không** có đăng ký công khai, **không** đăng nhập ẩn danh, **không** OTP/Magic Link, **không** tài khoản dùng chung.
- Admin tạo tài khoản bằng email + **mật khẩu ban đầu** trên Supabase Dashboard; giai đoạn đầu không có Admin Panel.
- Người dùng đăng nhập bằng **email + mật khẩu**; **bắt buộc đổi mật khẩu ban đầu** trước khi dùng dữ liệu cá nhân; đổi được mật khẩu sau khi đăng nhập.
- Mỗi tài khoản có dữ liệu học riêng, bảo vệ bằng RLS **và** kiểm tra ở API.
- Admin thu hồi quyền truy cập được bất cứ lúc nào.
- Đăng nhập **không** phụ thuộc email/Custom SMTP. Khôi phục mật khẩu qua email: **tạm hoãn** (cần Custom SMTP); trong lúc đó admin cấp mật khẩu tạm mới.
- Không lưu/ghi log mật khẩu dạng plaintext; secret key không bao giờ ở frontend.

## 2. Hai lớp tách biệt: danh tính ≠ quyền truy cập
| Lớp | Câu hỏi | Ai quyết định | Cơ chế | Đủ để dùng app? |
|---|---|---|---|---|
| **Xác thực danh tính** | "Người này có đúng là chủ email X?" | Supabase Auth | Email + mật khẩu → JWT (D-036) | **Không** |
| **Phê duyệt truy cập** | "Người này có được dùng Mandarin AI?" | Admin | Dòng `app_members` với `status = 'active'` | Cần thêm điều kiện dưới |
| **Hoàn tất kích hoạt** | "Đã thay mật khẩu tạm do admin cấp chưa?" | Người dùng | `password_change_required = false` | **Có** (khi cả ba lớp đạt) |

- Có tài khoản Supabase Auth + đăng nhập đúng mật khẩu **chưa đủ**: thiếu membership `active` → API 403 `not_a_member`, RLS trả 0 dòng.
- Admin làm **hai bước riêng**: (1) tạo tài khoản Auth; (2) kích hoạt membership. Tài khoản mới mặc định `pending` (bị từ chối).
- Thu hồi = `status = 'disabled'` (không cần xóa tài khoản): API ≤ 60 giây, RLS ngay lập tức.

## 3. Nguyên tắc
1. **Chặn ở nguồn:** URL dự án và publishable key là công khai, nên mọi chặn đăng ký nằm ở **cấu hình Supabase** (signup TẮT), không chỉ ở giao diện.
2. **Mặc định từ chối** ở cả hai nơi: RLS (`is_active_member()`) và API (tra membership trước mọi xử lý).
3. **Một người — một tài khoản**, đúng email của họ.
4. **Lỗi đóng (fail closed):** mọi bước lỗi giữa chừng để người dùng ở trạng thái **ít quyền hơn**, không bao giờ nhiều hơn.
5. **Mật khẩu chỉ đi qua HTTPS tới Supabase Auth** (hoặc qua API ở bước đổi mật khẩu); không lưu, không log, không đưa vào URL, IndexedDB, localStorage, analytics hay thông báo lỗi.

## 4. Mô hình dữ liệu (M1)
```text
app_members(
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  role                     text not null check (role in ('owner','admin','member')) default 'member',
  status                   text not null check (status in ('pending','active','disabled')) default 'pending',
  password_change_required boolean not null default true,
  display_name             text,
  approved_by              uuid references auth.users(id),
  approved_at              timestamptz,
  password_changed_at      timestamptz,
  disabled_at              timestamptz,
  disabled_reason          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
)
```
- Trigger `after insert on auth.users` tạo dòng `pending` + `password_change_required = true` (cùng với `profiles` hiện có). **Không bao giờ** tự tạo `active`.
- RLS: người dùng chỉ **đọc** dòng của chính mình (kể cả khi `pending`/chưa đổi mật khẩu — để app biết phải hiện màn hình nào). Không ai sửa `role`/`status`/`password_change_required` bằng quyền `authenticated`; chỉ `service_role` (API/script admin) hoặc SQL/Table Editor trên Dashboard.
- `public.is_active_member()` (`security definer`, `set search_path = ''`, `stable`): `true` khi dòng của `auth.uid()` có `status = 'active'` **và** `password_change_required = false`. **Mọi** policy dữ liệu học: `user_id = (select auth.uid()) and (select public.is_active_member())`.
- `admin_audit_log` ghi bằng **trigger** trên `app_members` (giá trị cũ/mới của `status`, `role`, `password_change_required`, thời điểm, `current_user`/`auth.uid()`), vì admin sửa trực tiếp trên Dashboard chứ không qua API.
- Index: `app_members(user_id)` là PK; policy dùng `(select …)` để Postgres chỉ tính một lần mỗi truy vấn (D-032).

## 5. Kiểm tra ở API (M1)
Thứ tự cho mọi request `/v1/*`:
1. JWT hợp lệ (D-036) → sai: **401**.
2. Tra `app_members` (cache theo `user_id` ≤ 60 giây): không có dòng / `pending` / `disabled` → **403 `not_a_member`**.
3. JWT phát hành **trước** `password_changed_at` → **401 `session_revoked`** (vô hiệu access token cũ sau khi đổi mật khẩu, thay vì chờ hết hạn 1 giờ).
4. `password_change_required = true` → **403 `password_change_required`**, trừ hai endpoint tối thiểu: `GET /v1/me` (trạng thái của chính mình) và `POST /v1/me/password`.
- Không có endpoint tạo tài khoản, không có endpoint cho người dùng thường đổi `role`/`status`.
- Đọc/ghi dữ liệu học bằng **quyền của người dùng** (JWT → RLS); secret key chỉ cho thao tác hệ thống, luôn kèm `user_id` rõ ràng.
- Trình duyệt dùng `GET /v1/me` để hiện đúng màn hình (đổi mật khẩu / "chưa được cấp quyền" / app). Đây chỉ là UX — lớp bảo vệ thật là API + RLS.

## 6. Đổi mật khẩu (M1) — `POST /v1/me/password { current_password, new_password }`
Chạy trên API Railway vì chỉ nơi đó có secret key và việc xóa cờ phải do server làm.

| Bước | Việc | Nếu lỗi ở bước này |
|---|---|---|
| 0 | Rate limit theo user + IP (đề xuất 5 lần / 15 phút); body **không** được log (Fastify `redact` cho `*password*`); chỉ HTTPS | 429 |
| 1 | Kiểm `new_password`: 12–72 byte (giới hạn bcrypt), khác `current_password`, không chứa email | 422, không đổi gì |
| 2 | Xác minh `current_password` bằng password grant với email trong JWT (publishable key); phiên phụ sinh ra bị thu hồi ở bước 4 | 400 thông báo chung, không đổi gì |
| 3 | Cập nhật mật khẩu: Admin API `updateUserById` (secret key) | 5xx, mật khẩu cũ vẫn dùng, cờ vẫn bật |
| 4 | Thu hồi **mọi** phiên: `POST /auth/v1/logout?scope=global` bằng JWT của người dùng; ghi `password_changed_at = now()` (bước 3 trong mục 5 chặn access token cũ) | Cờ **vẫn bật** → người dùng vẫn bị chặn; đăng nhập lại bằng mật khẩu **mới** và thử lại (bước 2 dùng mật khẩu mới) |
| 5 | Một câu lệnh: `password_change_required = false` | Như trên — vẫn bị chặn, thử lại được |
| 6 | Trả 200; web xóa phiên cục bộ và yêu cầu đăng nhập lại bằng mật khẩu mới | — |

- Không có bước nào làm người dùng **có thêm quyền** khi lỗi (fail closed). Lỗi giữa bước 3 và 5 không khóa vĩnh viễn: mật khẩu mới đã có hiệu lực, người dùng đăng nhập lại và gửi lại yêu cầu.
- Supabase Dashboard: **Secure password change = TẮT** (tính năng đó gửi nonce qua email → cần SMTP). API tự xác minh mật khẩu hiện tại ở bước 2. Người dùng cũng không thể dùng `PUT /auth/v1/user` để lách cờ: mật khẩu đổi theo đường đó vẫn không xóa `password_change_required` (chỉ API xóa).
- Thông báo cho người dùng không phân biệt "sai mật khẩu hiện tại" với lỗi khác ngoài mức cần thiết.

## 7. Cấu hình Supabase bắt buộc (Dashboard; Preview hiện tại đã áp dụng phần signup/anonymous)
| Mục trên Dashboard | Giá trị | Vì sao |
|---|---|---|
| Authentication → Sign In / Providers → **Allow new users to sign up** | **TẮT** (đã tắt) | Chặn đăng ký kể cả gọi API trực tiếp bằng publishable key |
| **Allow anonymous sign-ins** | **TẮT** (đã tắt) | Không có phiên ẩn danh; API cũng từ chối `is_anonymous` |
| Provider **Email** | **BẬT** (đã bật) | Cần cho đăng nhập email + mật khẩu |
| Provider khác (Google, GitHub, phone…) | **TẮT** | Mỗi provider là một đường tạo tài khoản mới |
| Authentication → Policies/Password: độ dài tối thiểu | **12** | D-038 (`supabase/config.toml` local/CI: `minimum_password_length = 12`) |
| Leaked password protection | BẬT nếu gói hiện tại hỗ trợ | Chặn mật khẩu đã lộ |
| **Secure password change** | TẮT | Mục 6 |
| Rate limits (sign-in) | Giữ mặc định hoặc giảm | Hạn chế brute force |
| Sessions: refresh token reuse detection | BẬT | D-022 |
| Email templates / Custom SMTP | **Không cần** cho đăng nhập | Khôi phục bằng email tạm hoãn (mục 8.4) |

Ghi chú: khi provider Email bật, các endpoint OTP/Magic Link của Supabase vẫn tồn tại ở phía server dù app không dùng; chúng chỉ cho người **đã có tài khoản** đăng nhập bằng chính email của họ (cần email gửi được) và không vượt qua được membership. Không cần thay đổi cấu hình Production vì điều này.

## 8. Runbook quản trị viên (Dashboard, không cần code)
> Mỗi người một tài khoản đúng email của họ. Không dùng chung tài khoản.

### 8.1 Cấp quyền cho một người
1. Authentication → **Users** → **Add user** → **Create new user**: nhập email, đặt **mật khẩu tạm** ngẫu nhiên ≥ 12 ký tự (trình quản lý mật khẩu tạo), bật **Auto Confirm User**. **Không** dùng "Send invitation" (cần email).
2. (M1) Table Editor → `app_members` → dòng của người đó (tự tạo, `pending`) → đặt `status = 'active'`, `approved_by`/`approved_at`. Trước M1: API chưa kiểm membership (mục 9).
3. Gửi mật khẩu tạm qua **kênh riêng** (gặp trực tiếp hoặc tin nhắn riêng), không gửi cùng tin với email đăng nhập; nhắc người dùng đổi ngay.
4. Người dùng đăng nhập → (M1) app bắt buộc đổi mật khẩu → dùng app. Admin chỉ biết **mật khẩu tạm**, và nó hết giá trị sau lần đổi đầu tiên.

### 8.2 Thu hồi / khóa
- **Thu hồi quyền dùng app (M1):** `app_members.status = 'disabled'` (+ `disabled_reason`) → API từ chối ≤ 60 giây, RLS chặn ngay.
- **Chặn đăng nhập ở Supabase Auth:** ban qua Admin API (`ban_duration`) bằng script phía server của M1 (secret key ở máy admin/Railway), hoặc chức năng tương ứng trên Dashboard nếu có.
- **Xóa hẳn:** Users → Delete user (xóa dữ liệu theo `on delete cascade`; xuất dữ liệu trước nếu cần).

### 8.3 Cấp lại mật khẩu tạm (thay cho "Quên mật khẩu")
1. Đặt mật khẩu tạm mới ≥ 12 ký tự cho người dùng: script admin M1 (`updateUserById` + thu hồi mọi phiên), hoặc mục đặt mật khẩu trên Dashboard nếu có.
2. (M1) Đặt lại `password_change_required = true` (script làm tự động).
3. Gửi mật khẩu tạm qua kênh riêng như 8.1.
- Trước M1 (chưa có script, chưa có dữ liệu): xóa và tạo lại tài khoản theo 8.1.

### 8.4 Khôi phục mật khẩu qua email — **TẠM HOÃN**
Cần cấu hình **Custom SMTP** riêng (hạng mục độc lập, chưa có lịch). Dịch vụ email mặc định của Supabase có giới hạn gửi rất thấp, không dùng cho người dùng thật. Khi bật: mẫu *Reset Password*, thông báo trung tính ("Nếu email đã được cấp quyền…"), thu hồi mọi phiên sau khi đặt lại.

### 8.5 Kiểm tra định kỳ
- Users chỉ gồm người được cấp; mỗi email một người; (M1) mọi user có dòng `app_members`, chỉ người đang dùng là `active`.
- Có user lạ → signup đang bật nhầm: tắt, xóa user lạ, xem log Auth.

## 9. Hiện trạng M0-PWA đối chiếu
| Điểm | Hiện trạng | Xử lý |
|---|---|---|
| Signup / anonymous trên `mandarin-ai-dev` | **TẮT** (chủ dự án xác nhận); Email BẬT | Giữ nguyên; smoke test A12a–A12b |
| `/lab/session` | **Email + mật khẩu** (`signInWithPassword`) qua `apps/web/src/lib/auth-password.ts`; lỗi chung "Email hoặc mật khẩu không đúng."; không đăng ký, không OTP; ô mật khẩu bị xóa sau mỗi lần thử | Đã làm (2026-11-24, D-038) |
| `supabase/config.toml` | `enable_signup = false`, anonymous `false`, `minimum_password_length = 12`, không mẫu email tùy chỉnh | Đã làm |
| Test | Unit `auth-password.test.ts`; E2E `auth-invite-only.spec.ts` (chặn request); `scripts/test-auth-invite-only.mjs` trên **GoTrue local thật, không Mailpit** (CI job `database`) | Đã làm |
| API chấp nhận mọi user đã đăng nhập của dự án | Chưa có membership | **M1** (`app_members`) |
| Bắt buộc đổi mật khẩu ban đầu | Chưa có | **M1** (mục 6) |
| Phiên lưu trong `localStorage` (supabase-js) | Còn nguyên | **M1**: cookie HttpOnly (`docs/AUTH_SESSION_DESIGN.md`) |
| JWT còn hiệu lực ≤ 1 giờ sau khi khóa/đổi mật khẩu | Còn nguyên | **M1**: membership cache ≤ 60 s + `password_changed_at` |
| Audit thao tác admin | Chưa có | **M1** (trigger) |
| Secret key ở frontend | Không có (guard + build có giá trị mồi) | Giữ guard |

## 10. Mối đe dọa và biện pháp
| Mối đe dọa | Biện pháp |
|---|---|
| Người lạ tự đăng ký bằng publishable key | Signup TẮT ở Supabase (test GoTrue thật trong CI); membership mặc định `pending` |
| Có tài khoản Auth nhưng không được phê duyệt | API 403 `not_a_member`, RLS 0 dòng (M1) |
| Dò email | Lỗi đăng nhập chung cho sai mật khẩu / email lạ (kiểm cả trên GoTrue thật) |
| Brute force mật khẩu | Rate limit Supabase Auth; độ dài ≥ 12; (M1) rate limit endpoint đổi mật khẩu |
| Lộ mật khẩu tạm | Gửi kênh riêng; bắt buộc đổi lần đầu; dữ liệu bị chặn tới khi đổi (M1) |
| Phiên bị chiếm | Đổi mật khẩu thu hồi mọi phiên + vô hiệu access token cũ (M1); reuse detection refresh token |
| Mật khẩu lọt vào log/lưu trữ | Không log body; không lưu ở client (E2E kiểm localStorage/sessionStorage); chỉ HTTPS |
| Lộ secret key | Chỉ ở Railway/máy admin; `check:secrets`; xoay khóa khi nghi ngờ |
| Người bị khóa còn dữ liệu offline | (M1) app xóa dữ liệu cục bộ khi API trả 401/403 |

## 11. Kiểm thử bắt buộc ở M1
- Tài khoản Auth không có dòng membership / `pending` / `disabled` → API 403, RLS 0 dòng.
- `password_change_required = true` → mọi endpoint dữ liệu 403 và RLS 0 dòng; `GET /v1/me` + `POST /v1/me/password` vẫn chạy.
- Đổi mật khẩu: sai mật khẩu hiện tại → từ chối; mật khẩu mới < 12 hoặc trùng cũ → 422; thành công → phiên cũ (refresh + access token) bị từ chối, đăng nhập bằng mật khẩu mới được, cờ tắt.
- Lỗi giả lập ở bước 3/4/5 của mục 6 → người dùng vẫn bị chặn và thử lại được.
- `PUT /auth/v1/user` (đổi mật khẩu trực tiếp) không xóa cờ.
- Khóa membership → API từ chối ≤ 60 giây.
- Log API không chứa mật khẩu (test bắt log).
- Người dùng A không đọc/ghi được dữ liệu của B.
