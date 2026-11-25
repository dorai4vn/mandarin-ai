# Mô hình truy cập riêng tư (D-037, D-038, **D-042**)

Ngày: 2026-11-25 · Trạng thái: **đã được chủ dự án duyệt** (D-042, "Simplify M1"). Bản này **thay** bản 2026-11-24 (mô hình `app_members`, bắt buộc đổi mật khẩu, audit, cookie session — các phần đó **đã bỏ**, xem mục 8).

## 1. Yêu cầu
- Mandarin AI là ứng dụng **riêng tư** cho chủ dự án và một nhóm nhỏ người quen.
- **Không** đăng ký công khai, **không** đăng nhập ẩn danh, **không** OTP/Magic Link, **không** tài khoản dùng chung.
- Chủ dự án **tự tạo tài khoản** (email + mật khẩu) trên Supabase Dashboard.
- Người dùng đăng nhập bằng email + mật khẩu; phiên được duy trì bằng cơ chế chính thức của Supabase; có **đăng xuất**.
- Mỗi người chỉ đọc/sửa được **dữ liệu của chính mình** (RLS + API).
- Không secret ở frontend, repository hay log.
- Đăng xuất hoặc chuyển tài khoản **không** làm lộ dữ liệu offline của tài khoản trước.

## 2. Mô hình
| Câu hỏi | Trả lời |
|---|---|
| Ai được dùng app? | **Mọi tài khoản Supabase Auth của dự án.** Không có bước phê duyệt riêng. |
| Ai tạo tài khoản? | Chỉ chủ dự án, trên Dashboard. Signup **TẮT** ở Supabase (chặn cả gọi API trực tiếp bằng publishable key). |
| Thu hồi? | Dashboard: **xóa người dùng** (xóa luôn dữ liệu theo `on delete cascade`) hoặc **đặt mật khẩu mới**. Refresh token cũ bị từ chối ngay; access token đã cấp còn hợp lệ tối đa 1 giờ (`jwt_expiry`) — rủi ro chấp nhận (D-042). |
| Dữ liệu ai thấy? | Chỉ chủ sở hữu: mọi bảng dữ liệu học có cột `user_id` và RLS `user_id = (select auth.uid())`. |

## 3. Nguyên tắc
1. **Chặn ở nguồn:** URL dự án và publishable key là công khai → chặn đăng ký bằng **cấu hình Supabase**, không chỉ bằng giao diện.
2. **Mặc định từ chối:** API trả 401 khi thiếu/sai JWT (D-036); RLS bật trên mọi bảng dữ liệu học; `anon` không có quyền gì trên bảng dữ liệu học.
3. **Dữ liệu học đi bằng quyền của người dùng:** API gọi PostgREST bằng **JWT của người dùng** → RLS áp dụng ở database. Secret key chỉ dùng cho thao tác hệ thống (Storage), không cho dữ liệu học.
4. **Tận dụng nền tảng:** quản lý tài khoản, mật khẩu, phiên, xoay vòng refresh token đều là chức năng có sẵn của Supabase.

## 4. Cấu hình Supabase bắt buộc
| Mục (Dashboard) | Giá trị | `supabase/config.toml` (local/CI) |
|---|---|---|
| Authentication → Sign In / Providers → **Allow new users to sign up** | **TẮT** | `enable_signup = false` |
| **Allow anonymous sign-ins** | **TẮT** | `enable_anonymous_sign_ins = false` |
| Provider **Email** | **BẬT**; provider khác **TẮT** | — |
| Độ dài mật khẩu tối thiểu | **12** | `minimum_password_length = 12` |
| Refresh token rotation + reuse detection | **BẬT** | `enable_refresh_token_rotation = true` |
| Custom SMTP / mẫu email | **Không cần** (đăng nhập không cần email) | — |

## 5. Runbook chủ dự án (Dashboard, không cần code)
- **Tạo tài khoản:** Authentication → Users → **Add user → Create new user**: email của người đó, mật khẩu ngẫu nhiên ≥ 12 ký tự, bật **Auto Confirm User**. Gửi mật khẩu qua **kênh riêng** (không chung tin nhắn với email). Không dùng "Send invitation" (cần email).
- **Quên mật khẩu:** đặt mật khẩu mới cho người đó trên Dashboard (hoặc xóa rồi tạo lại), gửi qua kênh riêng. Khôi phục tự động qua email: tạm hoãn (cần Custom SMTP).
- **Thu hồi:** xóa người dùng (Users → ⋯ → Delete user). Xuất dữ liệu trước nếu cần.
- **Kiểm tra định kỳ:** danh sách Users chỉ gồm người quen được cấp; có user lạ → signup đang bật nhầm: tắt, xóa user lạ, xem log Auth.

## 6. Dữ liệu cục bộ (IndexedDB) và chuyển tài khoản
- Chưa đăng nhập: app **không mở** dữ liệu cá nhân (không IndexedDB, không outbox, không sync); trang có dữ liệu riêng hiện lời mời đăng nhập.
- Mỗi tài khoản một cơ sở IndexedDB riêng: `mandarin-ai:<userId>`. Tài khoản B không bao giờ mở cơ sở của A.
- **Đăng xuất:** nếu còn thao tác chưa đồng bộ, app cảnh báo trước; sau đó `signOut()` và **xóa** IndexedDB của tài khoản đó. Cache của service worker chỉ chứa khung trang tĩnh (không dữ liệu cá nhân) nên được giữ để app vẫn mở được offline.
- Phiên hết hạn mà chưa đăng xuất: dữ liệu của A vẫn nằm trong cơ sở riêng của A cho tới khi A đăng nhập lại (để không mất thao tác chưa gửi); B đăng nhập trên cùng trình duyệt không đọc được cơ sở đó qua app.
- Không lưu trong IndexedDB: secret, refresh token, mật khẩu.

## 7. Mối đe dọa và biện pháp
| Mối đe dọa | Biện pháp |
|---|---|
| Người lạ tự đăng ký bằng publishable key | Signup TẮT (test GoTrue thật trong CI: `scripts/test-auth-invite-only.mjs`) |
| Dò email | Lỗi đăng nhập chung cho sai mật khẩu / email lạ |
| Brute force | Rate limit của Supabase Auth; mật khẩu ≥ 12 ký tự |
| Người A đọc/sửa dữ liệu B | RLS chủ sở hữu (pgTAP + test REST thật với 2 tài khoản trong CI); API ghi bằng JWT người dùng |
| Người chưa đăng nhập đọc dữ liệu | API 401; `anon` không có quyền trên bảng dữ liệu học; app không mở IndexedDB |
| Lộ dữ liệu offline khi chuyển tài khoản | IndexedDB theo `userId`; đăng xuất xóa cơ sở (E2E) |
| XSS đọc phiên trong `localStorage` | Không script bên thứ ba; React escape mặc định; rủi ro chấp nhận (D-042) |
| Lộ secret key | Chỉ ở Railway/máy chủ dự án; `check:secrets`, `check:bundle-secrets` |
| Mật khẩu lọt vào log/URL/lưu trữ | Form không có `name`, chặn submit trước hydrate (X1); không log body; E2E quét storage |

## 8. Đã bỏ theo D-042 (không làm)
Bảng `app_members` và vòng đời pending/active/disabled · `is_active_member()` · bắt buộc đổi mật khẩu lần đầu · `GET /v1/me`, `POST /v1/me/password` · thu hồi token tự xây (`password_changed_at`, `iat`) · cache membership · `admin_audit_log` · script admin · admin dashboard · cookie session `__Host-` + route handler `/auth/*`. PR #20 và #21 (đã đóng) chứa bản dở dang của các phần này.

## 9. Kiểm thử bắt buộc (M1)
- Signup và anonymous sign-in bằng publishable key bị từ chối (GoTrue local thật).
- Tài khoản do admin tạo đăng nhập được; sai mật khẩu và email lạ nhận cùng một lỗi.
- RLS: A không đọc/sửa/xóa được dòng của B; `anon` không đọc được gì (pgTAP + REST thật).
- API: không có/sai JWT → 401; sync push/pull chỉ thấy dữ liệu của chính người gọi.
- Web: chưa đăng nhập → không có dữ liệu cá nhân; đăng xuất xóa IndexedDB; đăng nhập tài khoản khác không thấy dữ liệu cũ.
