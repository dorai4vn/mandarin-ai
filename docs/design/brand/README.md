# Logo Mandarin AI — bộ asset ảnh gốc (UI-7A)

Trạng thái: **chờ chủ dự án duyệt** (D-041). Chưa dùng trong ứng dụng; favicon, icon PWA và logo trong app chỉ thay ở **UI-7B** sau khi duyệt.

Phương án (theo chỉ đạo của chủ dự án, thay phương án SVG vẽ lại trước đó): **dùng trực tiếp biểu tượng trong hình tham chiếu đã duyệt** `docs/design/reference/visual-reference-v2.webp` — sách mở + chữ 草 + hai lá. Không vẽ lại, không đổi màu, không thay chữ 草 bằng font. Phần chữ bên cạnh là **text thật**.

## Biểu tượng (`raster/`)

| File                                  | Nội dung                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `mark-light.png` / `.webp`            | Biểu tượng Light, nền trong suốt, 210×202 px (độ phân giải gốc trong hình tham chiếu)   |
| `mark-dark.png` / `.webp`             | Biểu tượng Dark, nền trong suốt, 202×203 px                                             |
| `mark-*-square.png`                   | Như trên, căn giữa trên khung vuông trong suốt                                          |
| `favicon-16/32/48.png`                | Favicon trong suốt (biểu tượng Light)                                                   |
| `icon-light-*.png`, `icon-dark-*.png` | Icon app 192/512 px, nền trắng / navy `#0A1F37` (màu nền đo từ hình tham chiếu), bo góc |
| `icon-maskable-*.png`                 | Icon PWA maskable, biểu tượng nằm trong vùng an toàn                                    |
| `apple-touch-icon-180.png`            | Icon iOS                                                                                |

Cách tách nền (`source/extract_raster.py`): cắt đúng vùng biểu tượng; **phần thân** (sách, chữ, lá) giữ **nguyên màu từng điểm ảnh gốc** và đặc hoàn toàn; chỉ **viền khử răng cưa** (≤ 3 px) được tính độ trong suốt bằng "colour to alpha" theo màu nền đo tại chỗ, nên viền không có quầng trắng/xanh nền cũ. Đặt lại lên nền gốc, sai khác trung bình ≈ 1–1,6/255 mỗi kênh. Chạy lại script cho kết quả giống hệt từng byte.

## Chữ thương hiệu (text thật — đặc tả chính thức)

| Dòng                 | Font   | Weight | Khác                                                                   |
| -------------------- | ------ | ------ | ---------------------------------------------------------------------- |
| "Mandarin AI"        | Nunito | 800    | letter-spacing −0.02em, line-height 1.1                                |
| "TỰ HỌC TIẾNG TRUNG" | Nunito | 600    | uppercase, letter-spacing 0.08em, line-height 1.3, cỡ = 38 % dòng trên |

- Nunito: SIL Open Font License 1.1 (Copyright 2014 The Nunito Project Authors), có đủ dấu tiếng Việt ở cả 600 và 800 (đã kiểm tra toàn bộ nguyên âm có dấu + đ).
- Trong app (UI-7B) Nunito chỉ dùng cho lockup, tải qua `next/font/google` (tự host lúc build, subset latin + vietnamese, chỉ weight 600 + 800). Font giao diện giữ nguyên: Inter (Việt, Anh, Pinyin) và Noto Sans SC (chữ Hán trong nội dung học).
- Tỷ lệ: lockup lớn — cỡ chữ tên = 0,34 × chiều cao biểu tượng; sidebar — 0,52 × (đo theo hình tham chiếu).
- Màu chữ (đo từ hình): Light tên `#0A1B2F`, dòng phụ `#53617B`; Dark tên `#FFFFFF`, dòng phụ `#BACEED`. UI-7B sẽ kiểm tương phản WCAG AA với token thật.

## QC (`previews/`)

- `raster-01-compare-reference.png`: gốc ↔ đã tách nền (trên nền gốc, ô caro, nền hồng kiểm viền, nền app), phóng ×2.
- `raster-02-sizes.png`: 16/32/48/64/192/512 px trên nền Light/Dark (16–64 px kèm phóng ×4).
- `raster-03-icons.png`: icon 512/192 px, maskable cắt tròn, apple-touch, favicon trong thanh tab Light/Dark.
- `raster-04-lockup-real-text.png`: lockup lớn và sidebar (48 px @2x, 40 px @1x) cạnh hình tham chiếu.

## Giới hạn của ảnh gốc (báo cáo, không tự sửa)

1. **Độ phân giải gốc chỉ ≈ 205 px.** Đủ nét cho sidebar/header (40–48 px, cả màn hình 2x–3x), 192 px và nhỏ hơn. **512 px phải phóng to ≈ 2,5×** nên hơi mềm và lộ nhẹ nhiễu nén WebP của ảnh tham chiếu. Muốn icon 512 px sắc nét cần **file logo gốc độ phân giải cao** (≥ 1024 px) từ nguồn đã tạo hình tham chiếu.
2. **16 px:** chữ 草 không đọc được (9 nét trong ≈ 9 điểm ảnh); chỉ nhận ra hình sách + lá + màu. 32 px đọc được, 48 px trở lên rõ. Không có biến thể đơn giản hoá vì yêu cầu không vẽ lại.
3. **Bản Dark có bóng đổ tối** quanh chữ 草 và lá — đúng như ảnh gốc; trên nền tối không thấy, nhưng bản Dark không dùng được trên nền sáng (dùng bản Light).

## Dựng lại

```bash
cd docs/design/brand/source
./fetch_fonts.sh                  # Nunito 600/800 (chỉ cho ảnh xem trước lockup)
python3 extract_raster.py         # -> ../raster  (cần pillow, numpy, scipy)
node render_lockup.mjs /tmp/lk    # lockup chữ thật (Playwright)
python3 qc_raster.py /tmp/lk      # -> ../previews
```
