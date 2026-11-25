# Phiên đăng nhập (D-042 — cơ chế chính thức của Supabase)

Ngày: 2026-11-25 · Trạng thái: **đã duyệt** (D-042). Bản này **thay** thiết kế cookie HttpOnly ngày 2026-11-23 (route handler `/auth/*`, cookie `__Host-mai_rt`, access token trong RAM). Thiết kế cũ bị bỏ vì là hạ tầng tự xây, không cần cho nhóm người dùng nhỏ (xem mục 6).

## 1. Cơ chế
```text
Trình duyệt (supabase-js, publishable key)
   │  signInWithPassword(email, password) ──▶ Supabase Auth (GoTrue)
   │◀── session { access_token (JWT, 1 giờ), refresh_token } → localStorage (supabase-js mặc định)
   │
   ├── autoRefreshToken: làm mới trước khi hết hạn; refresh token xoay vòng, dùng lại → bị thu hồi
   │
   └──(Authorization: Bearer <access_token>)──▶ Fastify API (Railway)
                                                   ├─ xác thực JWT (D-036: JWKS / HS256)
                                                   └─ dữ liệu học: PostgREST với CHÍNH JWT đó → RLS
```
- Client: `@supabase/supabase-js` với publishable key, `persistSession: true`, `autoRefreshToken: true` (mặc định). Đây là thư viện đã có từ M0, không thêm dependency.
- Phiên nằm trong `localStorage` của origin web. Không nằm trong IndexedDB, không có trong URL.
- `onAuthStateChange` là nguồn sự thật duy nhất về "ai đang đăng nhập" trong app (`AuthProvider`).
- Nhiều tab: supabase-js tự đồng bộ phiên qua `storage` event; đăng xuất ở một tab thì các tab khác cũng mất phiên.
- Offline: `getSession()` đọc từ `localStorage`, không cần mạng → mở app khi offline vẫn biết người dùng, vẫn học và ghi outbox; access token được làm mới khi có mạng lại.

## 2. Đăng nhập
- Trang `/login` (và form thử nghiệm ở `/lab/session`): email + mật khẩu, lỗi chung "Email hoặc mật khẩu không đúng.", không có đăng ký/OTP. Giữ các lớp bảo vệ X1: không có `name` trên ô nhập, `method="post"`, vô hiệu tới khi hydrate xong, xóa mật khẩu sau mỗi lần thử.
- Thành công → chuyển tới trang người dùng định mở (`?next=`, chỉ nhận đường dẫn nội bộ bắt đầu bằng `/`) hoặc trang chủ.

## 3. Đăng xuất
1. Nếu còn thao tác chưa đồng bộ: thử đồng bộ (khi có mạng); vẫn còn → hỏi xác nhận "Còn N thao tác chưa gửi; đăng xuất sẽ xóa chúng khỏi thiết bị này".
2. `supabase.auth.signOut({ scope: 'local' })` — xóa phiên trên thiết bị này và thu hồi refresh token đó ở server.
3. Đóng và **xóa** IndexedDB `mandarin-ai:<userId>`.
4. Về `/login`.

## 4. Chuyển tài khoản
Dữ liệu cục bộ được khóa theo `userId` (`docs/ACCESS_CONTROL.md` mục 6). Khi phiên đổi sang người khác (đăng nhập tài khoản khác, hoặc tab khác đăng xuất), app đóng cơ sở của người trước, xóa trạng thái trong bộ nhớ (số chờ gửi, lần đồng bộ cuối) rồi mới mở cơ sở của người mới. Outbox của mỗi cơ sở chỉ được đẩy bằng token của đúng chủ sở hữu.

## 5. Rủi ro chấp nhận
- XSS đọc được phiên trong `localStorage` → giảm thiểu bằng không script bên thứ ba, React escape, không chèn HTML từ người dùng; thu hồi bằng đặt lại mật khẩu/xóa người dùng trên Dashboard.
- Access token còn hợp lệ ≤ 1 giờ sau khi thu hồi.

## 6. Lịch sử
Bản 2026-11-23 đề xuất cookie `__Host-mai_rt` HttpOnly do route handler Next.js đặt, access token chỉ trong RAM, kiểm tra Origin/CSRF và khóa refresh bằng Web Locks. Bản này bị thay bởi D-042: cần thêm route handler, xử lý CSRF và đồng bộ đa tab tự viết — nhiều mã bảo mật tự xây hơn lợi ích với nhóm người dùng nhỏ. Có thể xem lại nếu app mở cho nhiều người hơn.
