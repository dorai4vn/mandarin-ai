# UI-7B — Logo, favicon và icon PWA trong ứng dụng

Nhánh `feat/ui-7b-brand`, xếp chồng sau UI-6. Asset lấy từ bộ đã duyệt (D-041, `docs/design/brand/`): không vẽ lại, không đổi tỷ lệ hay màu. Không thêm dependency; Nunito tải qua `next/font/google`, có sẵn trong Next và tự host lúc build như Inter.

## Thay đổi

- **Biểu tượng trong app:**
  - Biểu tượng raster đã duyệt, bản Light hoặc Dark theo theme. Ảnh nằm trong token `--brand-mark`, khai báo trong cả khối Light và hai khối Dark, nên đổi theo theme mà không cần JavaScript.
  - File `public/brand/mark-*.webp` thu nhỏ từ ảnh gốc xuống 120 px (đủ 2× cho 48 px và 3× cho 40 px), dạng WebP lossless, khoảng 16 KB mỗi file.
- **Lockup (chữ thật):**
  - Tên "Mandarin AI": Nunito 800, −0.02em.
  - Dòng phụ "TỰ HỌC TIẾNG TRUNG": Nunito 600, chữ in hoa, 0.16em, cỡ bằng 38 % dòng tên.
  - Sidebar mở rộng: biểu tượng 40 px, tên 21 px (0.52 × chiều cao biểu tượng).
  - Rail hoặc sidebar thu gọn: chỉ biểu tượng.
  - Top bar điện thoại: biểu tượng 32 px, tên 17 px, **không có dòng phụ** vì không đủ chỗ.
  - Nunito chỉ dùng cho lockup (`--font-brand`); chữ giao diện vẫn là Inter.
- **Màu chữ lockup:** dùng màu đo từ hình (`--brand-name`, `--brand-tagline`). CI kiểm AA cho cả hai theme: Light 17.3 / 6.2, Dark 16.7 / 10.4.
- **Bỏ token logo đỏ cũ** (`--logo-bg`, `--logo-fg`, `bg-logo`).
- **Favicon:**
  - `favicon-16/32/48.png` khai báo trong `<head>`;
  - `app/favicon.ico` (16/32/48) phục vụ `/favicon.ico`;
  - `apple-touch-icon` 180 px.
- **PWA:** manifest có icon `any` 192/512 và `maskable` 192/512, đều từ bộ đã duyệt.
- **Service worker** lên phiên bản `m0-pwa-3`. Icon trong `/icons/` được cache theo kiểu cache-first; đổi phiên bản thì cache cũ bị xóa, nên thiết bị đã cài sẽ nhận icon mới.

## Kiểm thử

- **`e2e/ui7b-brand.spec.ts`:**
  - biểu tượng đổi theo theme, ảnh tải được;
  - tên dùng đúng Nunito 800 (`document.fonts.check`); dòng phụ in hoa, weight 600;
  - mỗi màn hình chỉ có một liên kết "Mandarin AI — Trang chủ" đang hiển thị;
  - favicon và apple-touch-icon được khai báo.
- **`e2e/pwa.spec.ts`:**
  - manifest có đủ 4 icon; mọi icon, favicon và ảnh biểu tượng trả về `image/*`;
  - test cache giờ đọc phiên bản trực tiếp từ `sw.js` thay vì viết cứng `m0-pwa-2`. Test vẫn kiểm như trước là chỉ còn cache của phiên bản hiện tại.
- **Kiểm tra tĩnh:** `check:contrast` 81 cặp × 2 theme; `check:css-vars` đã thêm `--font-nunito` (do `next/font` đặt).

## Lưu ý cho chủ dự án (theo README asset)

- **Icon 512 px** phóng to từ ảnh gốc khoảng 205 px nên hơi mềm. Cần file gốc ≥ 1024 px để sắc nét.
- **Ở 16 px** chữ 草 không đọc được; nhìn được hình sách, lá và màu.
- **Dòng phụ trong sidebar** chỉ khoảng 8 px nếu đúng tỷ lệ 38 %. Đọc được trên màn hình 2×, rất nhỏ trên màn hình 1×. Giữ đúng đặc tả; nếu muốn có thể tăng lên.

## Ảnh

`docs/design/previews/ui7b/` (Light / Dark × điện thoại / máy tính bảng / desktop, @2x).
