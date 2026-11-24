# Design tokens V2

Trạng thái: **ĐÃ DUYỆT 2026-11-24** (D-039), gồm `#335DFF` cho chữ và CTA. **Light triển khai trước (PR UI-1); token Dark đã đặc tả, kích hoạt ở giai đoạn Dark mode riêng (PR UI-6).** Light đã hiện thực trong `apps/web/src/design/tokens.css` (UI-1); `scripts/check-contrast.mjs` kiểm trong CI. Giá trị dưới đây đã qua kiểm tra độ tương phản (mục 3). Nguồn sự thật khi triển khai: `apps/web/src/design/tokens.css` (PR-1). Không dùng mã màu trực tiếp trong component; chỉ dùng token semantic.

## 1. Bảng màu gốc (primitive) và điều chỉnh WCAG

| Màu đề xuất                       | Tương phản trên nền trắng | Kết luận                                                                | Điều chỉnh                                                                                                                                                     |
| --------------------------------- | ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary `#476DFF`                 | 4.29:1                    | **Không đạt** AA cho chữ thường (cần 4.5:1); đạt cho UI/chữ lớn (≥ 3:1) | Giữ `#476DFF` làm **brand/UI** (icon, viền focus, thanh tiến độ, chữ ≥ 24 px). Thêm `#335DFF` (5.06:1, gần như cùng màu) cho **chữ, link và nút có chữ trắng** |
| Coral `#FF806B`                   | 2.46:1                    | Không đạt cho chữ hay icon đơn lẻ                                       | Chỉ dùng làm **nền/minh họa**; chữ trên nền coral dùng `#18243A` (6.32:1). Chữ màu coral: `#C2412D` (5.14:1)                                                   |
| Lavender `#A78BFA`                | 2.72:1                    | Không đạt                                                               | Nền/minh họa; chữ `#6D4FD8` (5.58:1)                                                                                                                           |
| Mint `#2FC9A1`                    | 2.10:1                    | Không đạt                                                               | Nền/minh họa; chữ/icon thành công `#0B7A5E` (5.30:1)                                                                                                           |
| Text `#18243A`                    | 15.53:1                   | Đạt AAA                                                                 | Giữ                                                                                                                                                            |
| Page `#F7F9FD`, Surface `#FFFFFF` | —                         | —                                                                       | Giữ                                                                                                                                                            |
| Border `#E6EBF4`                  | 1.20:1                    | Chỉ đạt vai trò **trang trí** (đường chia card)                         | Viền của control (input, checkbox) dùng `border.strong` `#7D899E` (3.53:1) theo WCAG 1.4.11                                                                    |

Lý do giữ `#476DFF`: đó là nhận diện chủ dự án chọn và đạt chuẩn ở mọi chỗ không phải chữ nhỏ. `#335DFF` chỉ đậm hơn 7% độ sáng nên nhìn cùng một màu xanh, nhưng chữ đọc được theo chuẩn.

## 2. Token semantic

Đặt tên: `<nhóm>.<vai trò>`; CSS variable tương ứng `--<nhóm>-<vai trò>` (ví dụ `bg.page` → `--bg-page`, lớp Tailwind `bg-page`).

### 2.1 Nền và bề mặt

| Token             | Light                   | Dark               | Dùng cho                                   |
| ----------------- | ----------------------- | ------------------ | ------------------------------------------ |
| `bg.page`         | `#F7F9FD`               | `#0E1422`          | Nền trang                                  |
| `bg.subtle`       | `#EEF2FA`               | `#121A2A`          | Vùng nhóm, hàng xen kẽ, nền track progress |
| `surface.default` | `#FFFFFF`               | `#161E2E`          | Card, sidebar, input                       |
| `surface.raised`  | `#FFFFFF` + `shadow.md` | `#1E2839`          | Dialog, popover, toast, flashcard          |
| `surface.sunken`  | `#F1F4FA`               | `#0B1120`          | Khung canvas, code, vùng thả tệp           |
| `surface.inverse` | `#18243A`               | `#E8EDF7`          | Tooltip, toast trung tính                  |
| `overlay.scrim`   | `rgb(24 36 58 / 0.45)`  | `rgb(0 0 0 / 0.6)` | Nền sau dialog/sheet                       |

### 2.2 Chữ

| Token         | Light     | Dark      | Ghi chú                                 |
| ------------- | --------- | --------- | --------------------------------------- |
| `fg.default`  | `#18243A` | `#E8EDF7` | Nội dung chính, chữ Hán                 |
| `fg.muted`    | `#4F5D73` | `#A9B4C7` | Mô tả, pinyin phụ, nhãn                 |
| `fg.subtle`   | `#647186` | `#8D99AD` | Chú thích, metadata (≥ 4.5:1 vẫn đạt)   |
| `fg.disabled` | `#9AA6BC` | `#5A6577` | Chữ bị vô hiệu (WCAG miễn trừ)          |
| `fg.inverse`  | `#FFFFFF` | `#0E1422` | Chữ trên `surface.inverse`              |
| `fg.link`     | `#335DFF` | `#7B95FF` | Link luôn có gạch chân hoặc ngữ cảnh rõ |

### 2.3 Viền

| Token            | Light     | Dark      | Ghi chú                              |
| ---------------- | --------- | --------- | ------------------------------------ |
| `border.default` | `#E6EBF4` | `#2A3548` | Chia card/section (trang trí)        |
| `border.strong`  | `#7D899E` | `#5E6C84` | Viền input, checkbox, toggle (≥ 3:1) |
| `border.focus`   | `#476DFF` | `#8AA2FF` | Vòng focus                           |

### 2.4 Màu hành động và trạng thái

Mỗi nhóm có: `base` (thương hiệu/trang trí/UI ≥ 3:1), `solid` (nền nút, có `on` tương ứng), `hover`, `active`, `subtle` (nền nhạt), `text` (chữ/icon trên nền sáng), `on` (chữ trên `solid`).

| Nhóm                             | `base`    | `solid`   | `hover`   | `active`  | `subtle`  | `text`                            | `on`      |
| -------------------------------- | --------- | --------- | --------- | --------- | --------- | --------------------------------- | --------- |
| **primary** (light)              | `#476DFF` | `#335DFF` | `#2A4FE0` | `#2343C4` | `#EBF0FF` | `#335DFF` (`#2A4FE0` trên subtle) | `#FFFFFF` |
| primary (dark)                   | `#6887FF` | `#7B95FF` | `#94AAFF` | `#6887FF` | `#1C2650` | `#7B95FF` (`#B8C4FF` trên subtle) | `#0E1422` |
| **secondary** = lavender (light) | `#A78BFA` | `#6D4FD8` | `#5E41C4` | `#5034AE` | `#F3EFFF` | `#6D4FD8`                         | `#FFFFFF` |
| secondary (dark)                 | `#A78BFA` | `#BBA6FF` | `#CBBBFF` | `#A78BFA` | `#2A2250` | `#BBA6FF`                         | `#0E1422` |
| **accent** = coral (light)       | `#FF806B` | `#FF806B` | `#FF6B53` | `#F25A41` | `#FFF0EC` | `#C2412D` (`#B23A27` trên subtle) | `#18243A` |
| accent (dark)                    | `#FF806B` | `#FF9A88` | `#FFAD9E` | `#FF806B` | `#3A2220` | `#FF9A88`                         | `#0E1422` |
| **success** = mint (light)       | `#2FC9A1` | `#0B7A5E` | `#096A52` | `#075A45` | `#E6F8F2` | `#0B7A5E` (`#0A6E55` trên subtle) | `#FFFFFF` |
| success (dark)                   | `#2FC9A1` | `#4FD9B3` | `#6FE2C3` | `#2FC9A1` | `#10302A` | `#4FD9B3`                         | `#0E1422` |
| **warning** (light)              | `#F5A524` | `#F5A524` | `#E39512` | `#CC840A` | `#FFF6E5` | `#8F5800`                         | `#18243A` |
| warning (dark)                   | `#F5B451` | `#F5B451` | `#F8C578` | `#F5B451` | `#33270F` | `#F5B451`                         | `#0E1422` |
| **error** (light)                | `#E5484D` | `#C9252C` | `#B01F25` | `#951A1F` | `#FFECEC` | `#C9252C` (`#B42027` trên subtle) | `#FFFFFF` |
| error (dark)                     | `#F07075` | `#FF8A8A` | `#FFA3A3` | `#F07075` | `#3A1C20` | `#FF8A8A`                         | `#0E1422` |

Thông tin trung tính (info) dùng nhóm `primary`. Coral (accent) chỉ cho năng lượng/chuỗi ngày/điểm nhấn, **không** dùng cho lỗi để người học không nhầm với `error`.

### 2.5 Trạng thái tương tác

| Token               | Light                                       | Dark                      | Quy tắc                                                                                     |
| ------------------- | ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| `state.hover`       | `rgb(24 36 58 / 0.05)`                      | `rgb(232 237 247 / 0.06)` | Lớp phủ cho ghost button, hàng danh sách, nav item                                          |
| `state.pressed`     | `rgb(24 36 58 / 0.09)`                      | `rgb(232 237 247 / 0.10)` | Khi nhấn giữ                                                                                |
| `state.selected`    | `primary.subtle` + chữ `primary.text`       | như cột                   | Nav item đang chọn, tab                                                                     |
| `state.disabled.bg` | `#EEF2FA`                                   | `#1A2232`                 | Nền control bị vô hiệu; chữ `fg.disabled`; không đổi con trỏ thành "not-allowed" trên touch |
| Focus               | Vòng 2 px `border.focus` + khe 2 px màu nền |                           | Chỉ hiện khi `:focus-visible`; không bao giờ `outline: none` mà không thay thế              |

### 2.6 Màu nội dung học (ngữ nghĩa riêng)

| Token                         | Light                                                   | Dark      | Dùng                                                                                                    |
| ----------------------------- | ------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `tone.1` … `tone.4`, `tone.5` | dùng `fg.default`; **không** tô màu thanh điệu mặc định |           | Tô màu theo thanh là tùy chọn cài đặt (M2+); khi bật phải có thêm ký hiệu số/dấu, không chỉ dựa vào màu |
| `stroke.ink`                  | `#18243A`                                               | `#E8EDF7` | Nét viết người dùng trên canvas                                                                         |
| `stroke.guide`                | `#C9D2E3`                                               | `#33405A` | Lưới 米/田 và nét mẫu mờ                                                                                |
| `stroke.hint`                 | `#476DFF`                                               | `#8AA2FF` | Nét gợi ý, thứ tự nét                                                                                   |

### 2.7 Study Card (UI-2, đo từ hình tham chiếu)

| Token             | Light     | Ghi chú                      |
| ----------------- | --------- | ---------------------------- |
| `study.blue.bg`   | `#E2EDFD` | Từ vựng                      |
| `study.blue.icon` | `#1881FE` | Icon trang trí (aria-hidden) |
| `study.rose.bg`   | `#FEE9F2` | Nghe hiểu                    |
| `study.rose.icon` | `#FD5C6F` | Icon trang trí               |
| `study.mint.bg`   | `#D4F8F0` | Luyện viết                   |
| `study.mint.icon` | `#08BD8D` | Icon trang trí               |

Chữ trên các nền này dùng `fg.default` (≥ 13:1) và `fg.muted` (≥ 5.6:1), kiểm trong CI. Icon là trang trí (tên thẻ mang nghĩa) nên không thuộc WCAG 1.4.11. Giá trị Dark: làm ở UI-6 (hình tham chiếu Dark: `#153857` / `#2C2A50` / `#0F403D`).

## 3. Kết quả kiểm tra độ tương phản (WCAG 2.2)

Phương pháp: công thức độ chói tương đối WCAG; yêu cầu 4.5:1 cho chữ thường, 3:1 cho chữ lớn (≥ 24 px hoặc ≥ 18.66 px đậm), thành phần UI và vòng focus. Kiểm ngày 2026-11-24 bằng script (công thức WCAG), **94/94 cặp đạt** — gồm mọi tổ hợp `on`/`solid`/`hover`/`active`, `text`/`subtle`, chữ/nền ở cả hai theme; bảng dưới là các cặp chính (chữ `fg.disabled` được WCAG miễn trừ, không tính). PR-1 sẽ đưa phép kiểm này vào CI (`scripts/check-contrast.mjs`) để token mới không làm giảm chuẩn.

| Cặp (light)                                                                                             | Tỉ lệ                     | Yêu cầu |
| ------------------------------------------------------------------------------------------------------- | ------------------------- | ------- |
| `fg.default` / `surface`, `bg.page`, `bg.subtle`                                                        | 15.53 / 14.73 / 13.84     | 4.5     |
| `fg.muted` / `surface`, `bg.page`, `bg.subtle`                                                          | 6.68 / 6.33 / 5.95        | 4.5     |
| `fg.subtle` / `surface`, `bg.page`                                                                      | 4.94 / 4.69               | 4.5     |
| `border.strong` / `surface`, `bg.page`                                                                  | 3.53 / 3.35               | 3       |
| `primary.base` (focus/UI) / `surface`, `bg.page`                                                        | 4.29 / 4.07               | 3       |
| `primary.on` / `primary.solid`, `hover`, `active`                                                       | 5.06 / 6.38 / 7.86        | 4.5     |
| `primary.text` / `surface`, `bg.page`                                                                   | 5.06 / 4.80               | 4.5     |
| `#2A4FE0` / `primary.subtle`                                                                            | 5.60                      | 4.5     |
| `secondary.text` / `surface`, `secondary.subtle`; `#FFF` / `secondary.solid`                            | 5.58 / 4.95 / 5.58        | 4.5     |
| `accent.text` / `surface`; `#B23A27` / `accent.subtle`; `fg.default` / coral                            | 5.14 / 5.37 / 6.32        | 4.5     |
| `success.text` / `surface`; `#0A6E55` / `success.subtle`; `#FFF` / `success.solid`; `fg.default` / mint | 5.30 / 5.65 / 5.30 / 7.39 | 4.5     |
| `warning.text` / `surface`, `warning.subtle`; `fg.default` / `warning.solid`                            | 5.89 / 5.49 / 7.61        | 4.5     |
| `error.text` / `surface`, `bg.page`; `#B42027` / `error.subtle`; `#FFF` / `error.solid`                 | 5.55 / 5.26 / 5.81 / 5.55 | 4.5     |

| Cặp (dark)                                                                                       | Tỉ lệ                            | Yêu cầu |
| ------------------------------------------------------------------------------------------------ | -------------------------------- | ------- |
| `fg.default` / `bg.page`, `surface`, `surface.raised`                                            | 15.67 / 14.20 / 12.62            | 4.5     |
| `fg.muted` / `bg.page`, `surface.raised`                                                         | 8.79 / 7.08                      | 4.5     |
| `fg.subtle` / `surface`, `surface.raised`                                                        | 5.79 / 5.14                      | 4.5     |
| `border.strong` / `surface`, `bg.page`                                                           | 3.14 / 3.46                      | 3       |
| `primary.text` / `bg.page`, `surface.raised`                                                     | 6.64 / 5.35                      | 4.5     |
| `primary.on` / `primary.solid`, `hover`                                                          | 6.64 / 8.28                      | 4.5     |
| `border.focus` / `surface`                                                                       | 6.90                             | 3       |
| `secondary.text`, `accent.text`, `success.text`, `warning.text`, `error.text` / `surface.raised` | 7.06 / 7.22 / 8.40 / 8.13 / 6.53 | 4.5     |
| `on` / `success.solid`, `error.solid`                                                            | 10.43 / 8.10                     | 4.5     |
| `#B8C4FF` / `primary.subtle`                                                                     | 8.58                             | 4.5     |

Còn phải kiểm khi triển khai (không tính được trước): chữ trên ảnh/minh họa, trạng thái disabled trong ngữ cảnh thật, màu canvas trên màn hình thật, chế độ tương phản cao của Windows (`forced-colors: active` — dùng `CanvasText`/`Highlight`, không mất viền focus).

## 4. Typography

### 4.1 Font

| Vai trò                          | Font                                                       | Nạp                                                                                                                                       | Lý do                                                                                                            |
| -------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| UI tiếng Việt/Anh + pinyin       | **Inter** (variable, trục `wght` 400–700)                  | `next/font/google`, subset `latin`, `latin-ext`, `vietnamese`; tự host; `display: swap`                                                   | Hỗ trợ dấu tiếng Việt; chữ số dạng bảng (`tnum`) cho thống kê; có `size-adjust` fallback tự động, ít nhảy layout |
| Chữ Hán                          | **Noto Sans SC** (400, 500, 700)                           | `next/font/google`, `preload: false` (Google chia font CJK thành nhiều lát `unicode-range`, trình duyệt chỉ tải lát chứa ký tự đang dùng) | Hình chữ nhất quán giữa các thiết bị (quan trọng khi học nét); đủ chữ giản thể                                   |
| Mono (code, log trong Phòng thử) | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | Hệ thống                                                                                                                                  | Không cần tải                                                                                                    |

Fallback: `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; chữ Hán: `"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`.
Geist được cân nhắc nhưng chưa chọn vì chưa xác minh đủ glyph tiếng Việt và pinyin — Inter an toàn hơn.

**Bắt buộc:**

- Mọi chữ Hán đặt trong phần tử có `lang="zh-Hans"` (component `HanziText`). Nếu thiếu, trình duyệt có thể chọn glyph tiếng Nhật cho chữ thống nhất mã Unicode (ví dụ 直, 骨) → sai hình chữ cho người học.
- Pinyin đặt trong `lang="zh-Latn-pinyin"` và dùng Inter. Phải hiển thị đúng: `ā á ǎ à ē é ě è ī í ǐ ì ō ó ǒ ò ū ú ǔ ù ǖ ǘ ǚ ǜ ü`, kể cả chữ hoa (`Ā Ǎ`). Dùng ký tự **dựng sẵn (NFC)**, không ghép dấu tổ hợp. PR-1 có test hiển thị chuỗi này trên 3 engine (glyph không bị thay bằng font dự phòng, đo độ rộng).
- Không ép `font-synthesis` cho chữ Hán (in đậm giả làm dính nét).

### 4.2 Thang chữ (rem, gốc 16 px; tôn trọng cỡ chữ người dùng)

| Token              | Cỡ / line-height       | Weight                | Mobile (< 768) | Dùng                                                        |
| ------------------ | ---------------------- | --------------------- | -------------- | ----------------------------------------------------------- |
| `text.display`     | 40 / 48                | 700, tracking -0.02em | 32 / 40        | Tiêu đề màn hình chào, thẻ tổng kết                         |
| `text.h1`          | 30 / 38                | 700, -0.015em         | 26 / 34        | Tiêu đề trang                                               |
| `text.h2`          | 22 / 30                | 600                   | 20 / 28        | Tiêu đề section/card lớn                                    |
| `text.h3`          | 18 / 26                | 600                   | 18 / 26        | Tiêu đề card                                                |
| `text.body`        | 16 / 24                | 400                   | 16 / 24        | Nội dung                                                    |
| `text.body-strong` | 16 / 24                | 600                   |                | Nhấn mạnh, nhãn nút                                         |
| `text.small`       | 14 / 20                | 400–500               |                | Mô tả phụ, metadata                                         |
| `text.caption`     | 12 / 16                | 500, +0.01em          |                | Nhãn bottom nav, badge; không dùng cho thông tin quan trọng |
| `hanzi.hero`       | 96 / 1.1 (tablet+ 120) | 400                   | 80             | Flashcard, màn hình viết                                    |
| `hanzi.xl`         | 56 / 1.15              | 400                   | 48             | Chi tiết từ điển                                            |
| `hanzi.lg`         | 32 / 1.25              | 500                   | 28             | Hàng kết quả, đáp án quiz                                   |
| `hanzi.inline`     | 1.125em                | 400                   |                | Chữ Hán trong câu tiếng Việt                                |
| `pinyin.lg`        | 20 / 28                | 500                   | 18             | Dưới `hanzi.hero`/`xl`                                      |
| `pinyin.md`        | 16 / 24                | 400                   |                | Dưới `hanzi.lg`                                             |

Input luôn ≥ 16 px (tránh iOS tự phóng to — đã có trong M0). Độ dài dòng văn bản 45–75 ký tự (`max-w-prose`). Số liệu dùng `font-variant-numeric: tabular-nums`.

## 5. Spacing (lưới 4 px)

Dùng thang mặc định Tailwind (1 đơn vị = 4 px): `0, 0.5 (2), 1 (4), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 8 (32), 10 (40), 12 (48), 16 (64), 20 (80)`.

| Ngữ cảnh                                | Giá trị                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| Khoảng cách trong control (icon ↔ nhãn) | 8                                                                  |
| Padding nút md                          | 12 × 20 (dọc × ngang)                                              |
| Padding card                            | 16 (mobile) / 20 (tablet) / 24 (desktop)                           |
| Khoảng cách giữa card                   | 12 (mobile) / 16 / 24                                              |
| Lề trang                                | 16 (mobile; tối thiểu 12 ở 320 px) / 24 (tablet) / 32–40 (desktop) |
| Khoảng cách section                     | 32 (mobile) / 40 / 48                                              |
| Chiều rộng nội dung tối đa              | 1120 px (màn hình nhiều cột), 720 px (đọc, form, phiên học)        |

## 6. Radius

| Token                                                                              | Giá trị | Dùng                                         |
| ---------------------------------------------------------------------------------- | ------- | -------------------------------------------- |
| `radius.sm`                                                                        | 12 px   | Input, button sm/md, nav item, chip vuông    |
| `radius.md`                                                                        | 16 px   | Card, button lg, toast                       |
| `radius.lg`                                                                        | 20 px   | Dialog, flashcard, khung canvas              |
| `radius.xl`                                                                        | 24 px   | Bottom sheet (cạnh trên), thẻ hero/tổng kết  |
| `radius.full`                                                                      | 9999 px | Badge, pill, avatar, thanh tiến độ, nút tròn |
| Lồng nhau: radius trong = radius ngoài − padding (tối thiểu 8 px) để góc đồng tâm. |

## 7. Shadow (nhẹ, một nguồn sáng từ trên)

| Token                                                                                                                                                                    | Light                                                            | Dùng                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------- |
| `shadow.xs`                                                                                                                                                              | `0 1px 2px rgb(24 36 58 / 0.06)`                                 | Input, nút secondary         |
| `shadow.sm`                                                                                                                                                              | `0 1px 3px rgb(24 36 58 / 0.08), 0 1px 2px rgb(24 36 58 / 0.04)` | Card tương tác khi hover     |
| `shadow.md`                                                                                                                                                              | `0 4px 12px rgb(24 36 58 / 0.08)`                                | Flashcard, popover, dropdown |
| `shadow.lg`                                                                                                                                                              | `0 12px 32px rgb(24 36 58 / 0.12)`                               | Dialog, bottom sheet, toast  |
| Card tĩnh mặc định **không có shadow** — chỉ `border.default`. Dark mode: phân tầng bằng `surface.*` sáng dần + viền; shadow giữ hình dạng nhưng màu `rgb(0 0 0 / 0.4)`. |

## 8. Motion

| Token                | Giá trị                             | Dùng                               |
| -------------------- | ----------------------------------- | ---------------------------------- |
| `duration.fast`      | 120 ms                              | Hover, đổi màu, press              |
| `duration.base`      | 200 ms                              | Mở menu, toggle, phản hồi đúng/sai |
| `duration.slow`      | 320 ms                              | Dialog/sheet, lật flashcard        |
| `duration.celebrate` | 600–900 ms                          | Thẻ tổng kết phiên (một lần)       |
| `ease.standard`      | `cubic-bezier(0.2, 0, 0, 1)`        | Mặc định                           |
| `ease.exit`          | `cubic-bezier(0.4, 0, 1, 1)`        | Đóng/ẩn                            |
| `ease.spring`        | `cubic-bezier(0.34, 1.56, 0.64, 1)` | "Bật" nhẹ khi đúng, XP +n          |

- Chỉ animate `transform` và `opacity` (không animate `width/height/top` — D-032).
- `prefers-reduced-motion: reduce`: bỏ mọi chuyển động dịch/xoay/phóng; thay bằng đổi màu hoặc mờ dần ≤ 120 ms; flashcard lật = đổi mặt tức thì.
- Không animation tự lặp vô hạn ngoài spinner/skeleton; skeleton shimmer tắt khi reduced-motion.

## 9. Z-index, kích thước, breakpoint

- Z-index: `base 0` · `sticky 10` (top bar, bottom nav) · `sidebar 20` · `dropdown 30` · `overlay 40` (scrim) · `dialog 50` · `toast 60` · `skip-link 70`.
- Mục tiêu chạm tối thiểu 44 × 44 px (WCAG 2.5.8 yêu cầu 24; app dùng 44 cho touch). Icon 20 (dense) / 24 (mặc định).
- Breakpoint: xem `RESPONSIVE_V2.md` — `md` 768, `lg` 1024, `xl` 1280 (trùng mặc định Tailwind).

## 10. Khai báo trong Tailwind 4 (hướng dẫn cho PR-1)

```css
/* apps/web/src/design/tokens.css — biến runtime đổi theo theme */
:root {
  color-scheme: light;
  --bg-page: #f7f9fd;
  --surface-default: #ffffff;
  --fg-default: #18243a;
  --primary-base: #476dff;
  --primary-solid: #335dff; /* … đủ bảng mục 2 … */
}
:root[data-theme='dark'] {
  color-scheme: dark;
  --bg-page: #0e1422; /* … */
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    --bg-page: #0e1422; /* … */
  }
}

/* globals.css — ánh xạ sang lớp Tailwind; `inline` để lớp đọc biến runtime */
@theme inline {
  --color-page: var(--bg-page);
  --color-surface: var(--surface-default);
  --color-fg: var(--fg-default);
  --color-primary: var(--primary-solid);
  /* … */
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-hanzi: var(--font-noto-sc), 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
```

- Theme mặc định: **theo hệ thống**; người dùng chọn Sáng/Tối trong Cài đặt → `data-theme` trên `<html>`, lưu `localStorage` (tiện ích cá nhân; lỗi đọc/ghi thì về theo hệ thống). Đặt thuộc tính trước khi vẽ trang bằng script nhỏ trong `<head>` để không nháy màu.
- `viewport.themeColor` và `manifest.theme_color` lấy theo `bg.page`.
