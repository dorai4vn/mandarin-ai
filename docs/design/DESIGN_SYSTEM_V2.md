# Mandarin AI — Design System V2 · Neo Minimal × Playful Learning

Ngày: 2026-11-24 · Trạng thái: **ĐỀ XUẤT — chờ chủ dự án duyệt** (D-039). Chưa áp dụng vào code. Sau khi duyệt, triển khai theo `UI_MIGRATION_PLAN.md`.

## 1. Bộ tài liệu

| File                             | Nội dung                                                                                                               | Ai dùng        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------- |
| `DESIGN_SYSTEM_V2.md` (file này) | Định hướng, nguyên tắc, nhận diện, quy tắc "vui có kiểm soát", phạm vi                                                 | Tất cả         |
| `TOKENS_V2.md`                   | Màu semantic light/dark (đã kiểm WCAG), typography, spacing, radius, shadow, motion, z-index, cách khai báo Tailwind 4 | Dev, designer  |
| `COMPONENT_SPEC_V2.md`           | Đặc tả 23 component: mục đích, variant, size, state, a11y, responsive, animation                                       | Dev            |
| `SCREEN_BLUEPRINTS_V2.md`        | IA + wireframe desktop/tablet/mobile cho 6 màn hình trọng tâm + định hướng 5 màn hình sau; M0 vs M1+                   | Dev, chủ dự án |
| `RESPONSIVE_V2.md`               | Breakpoint, điều hướng theo thiết bị, safe-area, bàn phím, touch, landscape, scroll                                    | Dev, QA        |
| `UI_MIGRATION_PLAN.md`           | Hiện trạng code, mapping token, cấu trúc file, chuỗi PR nhỏ, kiểm thử, rủi ro, tiêu chí nghiệm thu                     | Dev, reviewer  |

Không thay thế: `WEB_COMPATIBILITY.md` (khả năng trình duyệt), `PERFORMANCE.md` (budget), `ACCESS_CONTROL.md` (D-037/D-038). Tài liệu V2 tham chiếu, không chép lại.

## 2. Định hướng

**Neo Minimal (70%)** là nền: bố cục sạch, nhiều khoảng trắng có chủ đích, typography rõ ràng, card và điều hướng tinh tế, màu chủ đạo là xanh `primary` trên nền sáng mát.
**Playful Learning (30%)** là lớp động lực, chỉ xuất hiện **ở khoảnh khắc học**: phản hồi đúng/sai, hoàn thành phiên, chuỗi ngày, XP, tiến độ. Màu nhấn (coral, lavender, mint) và micro-animation dành cho các khoảnh khắc đó, không rải khắp giao diện.

Tính cách sản phẩm: _thông minh, bình tĩnh, khích lệ_. Như một gia sư giỏi: gọn gàng khi làm việc, ấm áp khi bạn tiến bộ.

### Thay đổi so với giao diện M0

| M0                                                          | V2                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Nền kem `#FAF7F0`, đỏ gạch `#B8322A` làm màu chính          | Nền mát `#F7F9FD`, xanh `#476DFF` làm màu chính; đỏ chỉ dùng cho **lỗi** |
| Sidebar dày như phần mềm quản trị, có cả mục "Phòng thử M0" | Sidebar gọn, thu gọn được; Phòng thử chuyển vào _Thêm_                   |
| Ba kiểu điều hướng (sidebar / rail / bottom bar) viết riêng | Một component Sidebar (mở rộng/thu gọn) + Bottom Navigation              |
| Chữ Hán dùng font serif (Song)                              | Noto Sans SC, gắn `lang="zh-Hans"`                                       |
| Font hệ thống cho UI                                        | Inter (có subset tiếng Việt)                                             |
| Breakpoint desktop 1280 px                                  | 1024 px (sidebar thu gọn 1024–1279)                                      |
| Không có hệ thống trạng thái trống/lỗi/offline thống nhất   | Empty / Error / Offline / Skeleton thống nhất                            |

## 3. Nguyên tắc thiết kế

1. **Nội dung học là nhân vật chính.** Chữ Hán, pinyin, nghĩa tiếng Việt luôn có độ ưu tiên thị giác cao nhất trên màn hình học; khung UI lùi lại.
2. **Một hành động chính mỗi màn hình.** Mỗi màn hình có tối đa một nút `primary`; phần còn lại là `secondary`/`ghost`.
3. **Trung thực về trạng thái.** Không hiển thị số liệu, streak, XP hay "đã đồng bộ" khi không có dữ liệu thật (G1, D-035). Tính năng chưa có thì hiện empty state ghi rõ milestone, không hiện dữ liệu mẫu giả như thật.
4. **Vui có kiểm soát.** Mỗi animation phải trả lời được: _nó cho người học biết điều gì?_ Nếu không trả lời được thì bỏ.
5. **Chạm, chuột, bút, bàn phím đều là công dân hạng nhất** (D-028, D-030). Mọi thao tác chính dùng được bằng bàn phím; mục tiêu chạm ≥ 44×44 px.
6. **Tiếp cận được mặc định:** WCAG 2.2 AA; tôn trọng `prefers-reduced-motion`, `prefers-color-scheme`, cỡ chữ người dùng.
7. **Nhanh là một phần của thiết kế** (D-032): không thêm thư viện UI nặng; font tự host; animation chỉ dùng `transform`/`opacity`.
8. **Không dùng PWA làm điều kiện:** mọi màn hình chạy trong tab trình duyệt thường.

## 4. Quy tắc Playful Learning

| Được dùng                                                                                               | Không dùng                                                  |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Phản hồi đúng: viền + nền `success.subtle`, icon check, "bật" nhẹ 200 ms                                | Rung lắc mạnh, nhấp nháy, âm thanh tự phát                  |
| Phản hồi sai: viền `error`, hiện đáp án đúng ngay, giọng khích lệ ("Gần đúng rồi! Chú ý thanh 3")       | Màn hình đỏ toàn trang, chữ "SAI!"                          |
| Hoàn thành phiên: thẻ tổng kết + hiệu ứng mừng **một lần** (CSS)                                        | Confetti sau mỗi câu, popup liên tục                        |
| Streak/XP khi engine M7 có dữ liệu thật                                                                 | Streak/XP giả lập, đếm ngược gây áp lực, "mất chuỗi" đe dọa |
| Minh họa nhỏ trong empty state                                                                          | Mascot hoạt hình chiếm màn hình, màu cầu vồng               |
| Màu nhấn theo ý nghĩa: coral = năng lượng/chuỗi ngày, lavender = AI/gợi ý, mint = thành công/thành thạo | Dùng cả 4 màu nhấn trong cùng một card                      |

Giới hạn định lượng: trên một màn hình, tối đa **1** màu nhấn ngoài `primary` chiếm diện tích > 5%; tối đa **1** animation chạy cùng lúc ngoài chỉ báo loading; không gradient trên vùng chữ; gradient chỉ cho tối đa 1 hero/thẻ tổng kết, 2 điểm màu cùng họ.

## 5. Nhận diện

- **Logo hiện tại:** chữ 学 trắng trên ô vuông bo góc đỏ gạch. **Không thay** khi chưa được duyệt.
- **Đề xuất (chờ duyệt — mục 7):** giữ ký tự 学 làm biểu tượng, đổi nền sang `primary.base` `#476DFF`, chữ trắng Noto Sans SC Bold, bo góc theo tỉ lệ 28%; tùy chọn thêm một chấm nhỏ màu coral ở góc trên phải (gợi "AI/tia sáng"). Tên chữ: "Mandarin AI", Inter SemiBold, "AI" cùng màu chữ (không tô màu riêng).
- Khi duyệt cần làm lại: favicon, `icon-192/512`, maskable icon, `apple-touch-icon`, `theme_color` trong manifest và `viewport.themeColor`. Đây là một PR riêng (PR-7 trong kế hoạch).

## 6. Phạm vi và ranh giới

- V2 là **lớp trình bày**: không đổi nghiệp vụ, API, Auth (D-038: email + mật khẩu, không đăng ký), invite-only (D-037), offline/sync (IndexedDB + outbox), các spike trình duyệt (canvas viết, ghi âm WAV, kiểm tra PDF).
- Giữ nguyên mọi `data-testid` hiện có; test E2E hiện tại phải xanh sau từng PR.
- Không thêm dependency runtime cho UI (dùng React + Tailwind 4 + HTML gốc như `<dialog>`). Dev dependency cho kiểm thử a11y cần duyệt riêng.
- Màn hình phụ thuộc backend M1+ chỉ được thiết kế, không làm giả.

## 7. Quyết định cần chủ dự án duyệt

Xem D-039 trong `docs/DECISIONS.md` và mục 10 của `UI_MIGRATION_PLAN.md`. Tóm tắt:

1. Bộ màu đã điều chỉnh WCAG (giữ `#476DFF` cho thương hiệu/UI; dùng `#335DFF` cho chữ và nút có chữ trắng; màu nhấn chỉ làm nền/trang trí, có bản "text" đậm hơn).
2. Breakpoint 768/1024 thay cho 768/1280 của D-030; tablet dùng sidebar thu gọn.
3. Font Inter + Noto Sans SC tự host bằng `next/font`.
4. Dark mode và nút chọn giao diện (Sáng/Tối/Theo hệ thống) trong đợt đầu.
5. Đề xuất làm mới logo (mục 5).
6. "Phòng thử M0" chuyển vào menu _Thêm_.
7. Kiểm thử visual + a11y: thêm dev dependency `@axe-core/playwright`.
8. Chiến lược nhánh: chờ PR #2 merge hay xếp PR UI chồng lên `claude/m0-pwa`.
