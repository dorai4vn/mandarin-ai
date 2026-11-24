# Logo Mandarin AI — bộ SVG (UI-7A)

Trạng thái: **CHỜ CHỦ DỰ ÁN DUYỆT SVG** (concept đã duyệt — D-041). Chưa dùng trong ứng dụng; favicon, icon PWA và logo trong app chỉ thay ở **UI-7B** sau khi duyệt.
Hình tham chiếu chính thức: `docs/design/reference/visual-reference-v2.webp`.

## Thành phần (theo hình tham chiếu, không thêm chi tiết)

- Quyển sách mở cách điệu: trang trái có cạnh trên cong, trang phải là nét đứng nối lên thân cây, đáy sách lượn sóng + một nét lượn phụ.
- Chữ Hán giản thể **草** (U+8349) trong sách. Hình chữ lấy từ font **LXGW WenKai TC Bold** (kiểu Khải, SIL OFL 1.1), chuyển thành đường vector và làm đậm nhẹ bằng viền cùng màu; cấu trúc 艹 + 早 (日 + 一 + 丨) giữ nguyên.
- Hai chiếc lá mọc từ góc trên trang phải.
- Chữ thương hiệu hai dòng: **Mandarin AI** (Inter ExtraBold) / **TỰ HỌC TIẾNG TRUNG** (Inter SemiBold, giãn chữ). Cả hai đã chuyển thành vector — SVG không phụ thuộc font. Không dùng "Thảo" làm tên.

## File (`svg/`)

| File                                                  | Dùng cho                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `mark-light.svg`, `mark-dark.svg`                     | Biểu tượng đầy đủ (≥ 32 px), nền trong suốt                                                                           |
| `mark-light-small.svg`, `mark-dark-small.svg`         | Biến thể cỡ nhỏ 16–32 px: cùng concept, chữ 草 chiếm nhiều diện tích hơn, nét sách dày hơn, bỏ vân lá và nét lượn phụ |
| `lockup-light.svg`, `lockup-dark.svg`                 | Lockup ngang (tỷ lệ như hình tham chiếu) — trang đăng nhập, tài liệu                                                  |
| `lockup-compact-light.svg`, `lockup-compact-dark.svg` | Lockup cho sidebar/header (chữ lớn hơn so với biểu tượng để tagline còn đọc được khi lockup cao 40–48 px)             |
| `app-icon-light.svg`, `app-icon-dark.svg`             | Icon app vuông bo góc (192/512 px)                                                                                    |
| `app-icon-maskable.svg`                               | Icon PWA maskable (biểu tượng nằm trong vùng an toàn 80 %)                                                            |
| `favicon-small.svg`                                   | Favicon 16/32 px (biến thể cỡ nhỏ trên nền trắng)                                                                     |

## Màu

|                 | Light                             | Dark                              |
| --------------- | --------------------------------- | --------------------------------- |
| Sách (gradient) | `#0A8F67` → `#16A453` → `#86D41C` | `#33DDFB` → `#2FD9B0` → `#72E36A` |
| Lá              | `#3BAA2F` → `#9BE21C`             | `#2FC45A` → `#8FEA3C`             |
| Chữ 草          | `#0B7347`                         | `#FFFFFF`                         |
| "Mandarin AI"   | `#0A1B2F` (navy)                  | `#FFFFFF`                         |
| Tagline         | `#3E4E64`                         | `#B9C8DC`                         |

## QC (ảnh trong `previews/`)

- `01-compare-reference.png`: đặt cạnh hình tham chiếu (Light/Dark).
- `02-sizes-16-64.png`: 16/24/32/48/64 px, kích thước thật + phóng điểm ảnh. Kết quả: **48–64 px** chữ 草 rõ; **32 px** đọc được (biến thể nhỏ rõ hơn); **24 px** nhận ra hình dáng, nét chữ mờ; **16 px** chữ 草 thành một mảng (9 nét trong ≈ 9 điểm ảnh — giới hạn vật lý), chỉ nhận diện được qua hình sách + lá + màu.
- `03-app-icons-192-512.png`: icon 192/512 px, Light/Dark, maskable cắt tròn.
- `04-sidebar-lockup.png`: lockup gọn ở 44 px cạnh sidebar trong hình tham chiếu.

## Khác biệt có chủ đích so với hình tham chiếu

- Hình tham chiếu là ảnh raster có nét bút thuôn, bóng nhẹ và hiệu ứng sáng (glow); bản vector dùng nét đều + gradient phẳng để sắc nét ở mọi kích thước và nhẹ (≈ 3–15 KB mỗi file).
- Kiểu chữ "Mandarin AI" trong hình là một font hình học tròn không xác định; bản vector dùng Inter (font giao diện của app, OFL) với độ đậm và tỷ lệ đo theo hình.

## Dựng lại

```bash
cd docs/design/brand/source
./fetch_fonts.sh
python3 extract_glyph.py fonts wenkai
python3 build_logo.py   # ghi vào ../svg (kết quả giống hệt bản đã commit)
```

Cần `fonttools`, `brotli`, `uharfbuzz` (Python). Font không commit (tải lại bằng `fetch_fonts.sh`).
