# UI-5 — Các màn M0 trên V2

Nhánh `feat/ui-5a-learning-screens`. Phạm vi: chuyển các màn M0 sang component V2, theo `SCREEN_BLUEPRINTS_V2.md` và `COMPONENT_SPEC_V2.md`. Không đổi Auth (D-037/D-038), API, Supabase, Railway hay Vercel. Không thêm dependency. Giữ mọi `data-testid`.

**Nguyên tắc nội dung (không có dữ liệu giả):**

- Không có streak, XP, số thẻ đến hạn hay từ mẫu nào được trình bày như số liệu thật.
- Tính năng chưa làm hiện "Sắp có" / "Ra mắt ở Mx" và không bấm được.
- "Thư viện" vẫn là thư viện tài liệu, không giả làm trang "Học bài".

## UI-5a — Màn học (`/`, `/practice`, `/dictionary`, `/library`, `/profile`)

- **Trang chủ:**
  - Card "Lịch ôn hằng ngày" là EmptyState với nhãn "Ra mắt ở M3", không có số liệu giả.
  - Card Đồng bộ dùng dữ liệu thật.
  - "Hôm nay học gì?" gồm 3 Study Card (Blue/Lavender/Mint) với nhãn "Sắp có", không phải liên kết.
  - Có các liên kết vào Phòng thử M0.
- **Luyện tập:** 6 chế độ, mỗi chế độ có Badge mốc ra mắt. Chỉ có một liên kết thật tới `/lab/handwriting`; không có quiz mô phỏng.
- **Từ điển:** EmptyState "M2" và danh sách "Sắp có". Đã bỏ các từ mẫu.
- **Thư viện:** Tabs gạch chân. "Giáo trình" ra mắt ở M2. "Tài liệu của tôi" ra mắt ở M4 và có nút tới `/lab/upload`.
- **Hồ sơ:** nội dung theo D-038 — email và mật khẩu do quản trị viên cấp, không có OTP, không có đăng ký.

## UI-5b — Màn Lab

### `/lab/session`

- Dùng `Input` và `PasswordInput` V2 với nhãn hiển thị và `autocomplete` `username` / `current-password`.
- Giữ **mọi lớp bảo vệ X1:**
  - `method="post"`, không có `name` trên ô nhập;
  - ô nhập bị vô hiệu cho tới khi hydrate xong, kèm `aria-busy`;
  - xóa mật khẩu sau mỗi lần thử.
- Mới:
  - mật khẩu luôn bị **ẩn lại** sau mỗi lần thử (`concealSignal`);
  - khi đăng nhập thất bại, focus về ô mật khẩu (lúc này đã trống);
  - nút đăng nhập dùng trạng thái `loading`.

### `/lab/upload` (§21)

- Vùng thả:
  - nền `sunken`, viền nét đứt `border.strong`, có icon;
  - trên điện thoại chỉ có nút lớn "Chọn tệp PDF";
  - trên máy tính: "Kéo thả PDF vào đây hoặc **Chọn tệp PDF**".
- Dòng tệp hiển thị tên, kích thước, Badge trạng thái (Đang kiểm tra · Đang tải · Đã lưu · Lỗi) và Progress Bar không xác định khi đang gửi. Không hiện phần trăm giả, vì `fetch` không báo tiến độ tải lên.
- Viền đỏ khi tệp bị từ chối.
- Khi offline, vùng chọn tệp bị vô hiệu và có lời nhắn cần mạng.
- Kiểm tra `%PDF-` và kích thước vẫn như M0.

### `/lab/handwriting` (§23)

- **Khung:** 360 / 420 / 480 px theo thiết bị, bo 20, viền `border.strong`, màu nét `stroke.ink`. Logic Pointer Events giữ nguyên.
- `aria-label` của canvas có số nét.
- **Thanh công cụ** (`role="toolbar"`) gồm Hoàn tác nét, Xóa và Nộp bài, mỗi nút có icon; trên điện thoại nhãn chữ chỉ dành cho trình đọc màn hình.
- Ứng viên nhận dạng hiển thị thành ô chữ Hán 48 px.

### `/lab/audio` (§22)

- **Nút ghi tròn 64 px**, tên đổi theo trạng thái: "Bắt đầu ghi" / "Dừng ghi".
- **Thời lượng là thời gian thật.** Không có thanh mức âm giả, vì M0 không có dữ liệu analyser.
- **Vòng "thở"** khi đang ghi; tắt khi người dùng bật giảm chuyển động, lúc đó chỉ còn chữ "Đang ghi" và chấm đỏ.
- **Tốc độ nghe lại** là nhóm radio dạng segmented.
- **Quyền micro** hiển thị bằng tiếng Việt.

### Dọn dẹp

- Các trang `/lab`, `/lab/offline` và `/lab/realtime` cùng skip-link không còn dùng alias màu M0 (`ink-2`, `jade`, `amber`, `paper`) (FU-4).

## Sai khác có chủ đích so với spec

- **§22 `aria-pressed` cho nút ghi:** không dùng. Tên của nút đã đổi theo trạng thái; dùng thêm `aria-pressed` thì trình đọc màn hình đọc trạng thái hai lần (APG khuyên chọn một trong hai).
- **§22 Tabs segmented cho tốc độ:** đổi sang nhóm radio. Tốc độ là một giá trị cần chọn, không phải bảng nội dung, nên vai trò `tab` không đúng nghĩa. Bề ngoài vẫn là segmented.
- **Hoãn lại:**
  - chế độ tập trung (ẩn bottom nav) trong phiên luyện viết → M5, khi có phiên luyện thật;
  - tiêu đề trang trong top bar mobile → để sau. Spec §24 ghi "có thể"; top bar hiện vẫn giữ logo.

## Kiểm thử

- **`e2e/ui5-screens.spec.ts`:**
  - **Axe** (không có lỗi mức serious/critical) và không cuộn ngang trên 9 trang, gồm 4 trang Lab. Chỉ quét sau khi hydrate xong và mọi transition đã dừng, để không đo màu ở giữa transition.
  - **Không có số liệu giả.**
  - **Màn học:** tabs Thư viện; 6 chế độ luyện tập; nội dung Hồ sơ.
  - **Đăng nhập:** nhãn ô nhập, mật khẩu bị ẩn lại và focus về ô mật khẩu khi thất bại.
  - **Tải PDF:** trạng thái dòng tệp; vô hiệu khi offline.
  - **Viết tay:** kích thước khung, toolbar, số nét.
  - **Ghi âm:** nút 64 px, nhóm radio tốc độ.
- **Các test M0 giữ nguyên, không sửa:**
  - X1: `auth-credential-leak`, `auth-invite-only`;
  - `upload`, `upload-limits`, `handwriting`, `audio`.
- **Tại máy (Chromium):** 331 E2E pass.
- **Ảnh xem trước** (390 px và 1440 px): `docs/design/previews/ui5/`.
