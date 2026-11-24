# Thiết kế phiên đăng nhập bằng cookie HttpOnly/Secure (D-022, áp dụng ở M1)

Ngày: 2026-11-23 · Trạng thái: **hướng đã được chủ dự án duyệt; đây là thiết kế, chưa triển khai** (M1).

> **Bổ sung 2026-11-24 (D-037):** chỉ người được mời mới đăng nhập. Route handler `POST /auth/otp/request` gọi Supabase với `shouldCreateUser: false` (không bao giờ tạo tài khoản), trả thông báo trung tính dù email có tồn tại hay không; thêm `POST /auth/password/recover` và `POST /auth/password/update` (yêu cầu xác thực lại). Không có route đăng ký. Mô hình membership: `docs/ACCESS_CONTROL.md`.

## 1. Hiện trạng M0-PWA (cần thay ở M1)
- Đăng nhập OTP dùng `@supabase/supabase-js` trên trình duyệt → phiên (access + **refresh token**) nằm trong `localStorage`, JavaScript đọc được → rủi ro nếu có XSS. Trái tinh thần D-022.
- API (`apps/api`, Railway) xác thực bằng header `Authorization: Bearer <access token>` — **không dùng cookie**.

## 2. Bài toán: web và API khác domain
| Môi trường | Web | API | Cùng "site"? |
|---|---|---|---|
| Preview | `*.vercel.app` | `*.up.railway.app` | **Không** (khác site) |
| Production (đề xuất) | `app.<tên-miền>` | `api.<tên-miền>` | **Có** (cùng registrable domain) |

Cookie do API (railway.app) đặt khi trang đang ở vercel.app là **cookie bên thứ ba**: Safari (ITP), Firefox (Total Cookie Protection) chặn; Chrome đang hạn chế. → **Không thể** dựa vào cookie gửi thẳng tới API trên Preview.

## 3. Phương án đề xuất: phiên cookie trên origin web + access token ngắn hạn trong bộ nhớ
```text
Trình duyệt ──(cookie __Host-mai_rt, HttpOnly, first-party)──▶ Next.js route handlers (Vercel, cùng origin web)
     │                                                              │  gọi Supabase Auth (server-side)
     │◀────── access token ngắn hạn (JSON, chỉ giữ trong RAM) ───────┘
     │
     └──(Authorization: Bearer <access token>)──▶ Fastify API (Railway) ── xác thực JWT qua JWKS
```
1. **Đăng nhập OTP qua route handler** (`POST /auth/otp/request`, `POST /auth/otp/verify` trên Next.js): server gọi Supabase Auth, nhận session; **refresh token** chỉ lưu trong cookie `__Host-mai_rt` (`HttpOnly; Secure; SameSite=Lax; Path=/`, không `Domain`), trình duyệt không đọc được.
2. **Access token** (JWT, sống ngắn, mặc định Supabase 1 giờ — đề xuất 15–60 phút) trả về dạng JSON và chỉ giữ **trong bộ nhớ** (biến JS), không ghi `localStorage`/`sessionStorage`/IndexedDB.
3. Khi tải trang hoặc access token sắp hết hạn: `POST /auth/refresh` (route handler) đọc cookie, gọi Supabase refresh, **xoay vòng** refresh token (đặt cookie mới), trả access token mới.
4. Gọi API Railway bằng `Authorization: Bearer` như hiện tại → API giữ nguyên thiết kế stateless, không cần cookie, không phụ thuộc domain.
5. **Không dùng** browser client của `@supabase/ssr` cho auth (client đó cần đọc cookie bằng JS, nên cookie không thể HttpOnly). Supabase chỉ được gọi từ server cho các thao tác auth.

## 4. CSRF
| Endpoint | Cơ chế xác thực | Rủi ro CSRF | Biện pháp |
|---|---|---|---|
| API Railway (`/v1/*`) | Header `Authorization` | **Không**: trình duyệt không tự gửi header này | Giữ CORS chặt; không bao giờ chấp nhận token qua cookie/query |
| Route handlers auth (`/auth/*`) | Cookie `__Host-mai_rt` | **Có** (cookie tự gửi) | `SameSite=Lax` (chặn POST cross-site); chỉ nhận `POST`; kiểm tra header `Origin` (và `Sec-Fetch-Site: same-origin`) bằng danh sách origin cho phép; body JSON (`Content-Type: application/json` → cross-site form không gửi được); thêm double-submit token cho `/auth/logout` và các thao tác thay đổi trạng thái khác |
| Trang HTML | — | — | `X-Frame-Options: DENY` (đã có) chống clickjacking |

`SameSite=Strict` an toàn hơn nhưng làm mất phiên khi người dùng mở app từ link ngoài (email, Zalo) → chọn `Lax` + kiểm tra `Origin`.

## 5. Xoay vòng phiên & refresh token
- Bật **refresh token rotation** và **reuse detection** của Supabase Auth (mặc định trên dự án mới; kiểm tra ở Authentication → Sessions). Refresh token chỉ dùng **một lần**; dùng lại token cũ → Supabase thu hồi cả chuỗi phiên.
- Đặt cookie mới sau mỗi lần refresh và sau đăng nhập (chống session fixation).
- Giới hạn thời gian sống phiên (Supabase: time-box / inactivity timeout) — đề xuất: không hoạt động 30 ngày, tối đa 90 ngày; chủ dự án quyết.
- **Đăng xuất:** route handler gọi `signOut` (scope `local`, tùy chọn `global` "đăng xuất mọi thiết bị"), xóa cookie, client xóa access token trong RAM + IndexedDB/Cache của người dùng (D-022).
- Nhiều tab: khóa refresh bằng Web Locks (đã dùng cho sync) để tránh hai tab cùng dùng một refresh token (sẽ kích hoạt reuse detection).

## 6. Khác domain — các phương án và lựa chọn
| Phương án | Ưu | Nhược | Dùng khi |
|---|---|---|---|
| **A. Cookie trên origin web + Bearer tới API (đề xuất, mục 3)** | Hoạt động cả khi khác site (Preview); API stateless; không phụ thuộc cookie bên thứ ba | Thêm 1 lượt gọi route handler khi refresh; access token trong RAM bị mất khi tải lại trang → refresh lại (≈ 1 RTT tới Vercel + Supabase) | Preview **và** production |
| B. Cùng site bằng tên miền riêng (`app.` + `api.`), API đặt cookie `Domain=<tên-miền>` | API đọc cookie trực tiếp | Cần tên miền riêng; phải chống CSRF trên **toàn bộ** API; không dùng được trên Preview `*.vercel.app` | Có thể cân nhắc sau khi có tên miền, không bắt buộc |
| C. BFF: mọi lời gọi API đi qua Next.js proxy | Một origin duy nhất | Thêm một hop mạng cho **mọi** request (trái D-032), tốn tài nguyên serverless | Không chọn |
| D. Token trong `localStorage` (hiện trạng) | Đơn giản | Lộ refresh token khi XSS — trái D-022 | Bỏ ở M1 |

**Hiệu năng (D-032):** phương án A giữ một RTT trực tiếp tới API cho mọi request học tập; chỉ refresh (≈ mỗi giờ hoặc khi tải lại trang) đi qua Vercel.

## 7. Offline & nhiều thiết bị
- Offline: thao tác học vẫn ghi vào IndexedDB + outbox; khi có mạng → refresh access token → sync. Không cần token để học offline.
- Hết phiên khi offline lâu: outbox giữ nguyên (gắn `userId`); sau khi đăng nhập lại **đúng tài khoản** thì sync; khác tài khoản → không gửi, hỏi người dùng (không trộn dữ liệu hai người).

## 8. Kiểm thử bắt buộc ở M1
- Cookie có `HttpOnly`, `Secure`, `SameSite=Lax`, tiền tố `__Host-`; JS không đọc được (`document.cookie`).
- Không có refresh token trong `localStorage`/`sessionStorage`/IndexedDB (quét trong E2E).
- POST cross-site tới `/auth/*` bị từ chối (Origin sai); GET không thay đổi trạng thái.
- Dùng lại refresh token cũ → bị từ chối, phiên bị thu hồi.
- Hai tab refresh đồng thời không làm mất phiên.
- Đăng xuất xóa cookie + dữ liệu cục bộ; API trả 401 với access token cũ sau khi hết hạn.
- E2E trên Chromium/Firefox/WebKit (Safari ITP) với web/API khác origin.
