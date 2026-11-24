# Responsive architecture V2

Trạng thái: **ĐỀ XUẤT — chờ duyệt** (D-039; phần breakpoint thay D-030 khi được duyệt). Khả năng trình duyệt: `docs/WEB_COMPATIBILITY.md`. App vẫn là web app chạy trong tab thường; PWA tùy chọn (D-018, D-028).

## 1. Breakpoint và lớp thiết bị

| Lớp     | Chiều rộng  | Tailwind | Điều hướng                                                                                      | Bố cục nội dung                                               |
| ------- | ----------- | -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Mobile  | 320–767 px  | mặc định | Top bar + **Bottom Navigation** (5 mục)                                                         | 1 cột; lề 16 (12 ở < 360)                                     |
| Tablet  | 768–1023 px | `md:`    | **Sidebar thu gọn** 72 px                                                                       | 1–2 cột; lề 24                                                |
| Desktop | ≥ 1024 px   | `lg:`    | Sidebar: thu gọn mặc định ở 1024–1279, **mở rộng** 248 px ở ≥ 1280 (`xl:`), người dùng đổi được | 2–3 cột, danh sách + chi tiết; lề 32–40; nội dung tối đa 1120 |

So với D-030 (768/1280): desktop bắt đầu từ **1024** để iPad ngang, laptop nhỏ và cửa sổ chia đôi có bố cục desktop; vùng 1024–1279 dùng sidebar thu gọn để giữ chỗ cho nội dung. Bố cục đổi theo **chiều rộng viewport**, không theo loại thiết bị (một laptop thu cửa sổ nhỏ dùng bố cục mobile — đúng mong đợi). Trong component dùng container query (`@container`, Tailwind 4) khi card cần đổi bố cục theo chỗ chứa thay vì theo màn hình.

Ma trận kiểm thử (E2E, mỗi engine Chromium/Firefox/WebKit):

| Viewport       | Vì sao                                 | Hiện tại    |
| -------------- | -------------------------------------- | ----------- |
| 390 × 844      | Điện thoại phổ biến                    | Có          |
| 820 × 1180     | Tablet dọc                             | Có          |
| 1440 × 900     | Desktop                                | Có          |
| **320 × 568**  | Màn nhỏ nhất hỗ trợ — không cuộn ngang | Thêm (PR-3) |
| **844 × 390**  | Điện thoại ngang (chiều cao thấp)      | Thêm (PR-3) |
| **1024 × 768** | Ranh giới desktop / sidebar thu gọn    | Thêm (PR-3) |

## 2. Hành vi điều hướng

- **Mobile:** Bottom Navigation: Hôm nay · Luyện tập · Từ điển · Thư viện · Thêm. _Thêm_ (bottom sheet): Hồ sơ, Tiến độ (M3+), Gia sư AI (M7), Cài đặt, Cài đặt ứng dụng (tùy chọn), Phòng thử (M0/dev), Đăng xuất (M1). Top bar 56 px: tiêu đề trang (hoặc logo ở Hôm nay), Sync Indicator, (M7) Streak.
- **Tablet/desktop:** Sidebar chứa đủ mục chính và phụ; menu tài khoản ở đáy sidebar. Không có bottom nav.
- **Chế độ tập trung** (phiên flashcard/quiz, luyện viết, ghi âm chấm điểm): ẩn bottom nav và thu sidebar; top bar tối giản: nút "Thoát" (hỏi xác nhận nếu đang dở và chưa lưu), Progress Bar, tùy chọn. Kết thúc phiên → thẻ tổng kết → quay lại màn trước.
- **Lịch sử trình duyệt:** mỗi màn hình chính là một URL thật (chia sẻ/tải lại được); sheet và dialog không đẩy URL trừ khi là nội dung có thể chia sẻ (chi tiết từ điển: `/dictionary/[id]` ở M2); nút Back của trình duyệt/Android đóng sheet đang mở trước khi rời trang.
- **Phím tắt desktop** (hiện trong Cài đặt → Phím tắt, tắt được): `/` tìm, `g h` Hôm nay, `g p` Luyện tập, `g d` Từ điển, `g l` Thư viện; trong phiên học: Space lật, 1–4 đánh giá, Enter tiếp tục. Không chiếm phím khi đang gõ trong ô nhập hoặc đang soạn IME.

## 3. Safe-area và viewport

- `viewport-fit=cover` (đã có). Top bar: `padding-top: max(8px, env(safe-area-inset-top))`; Bottom nav và nút dính đáy: `padding-bottom: env(safe-area-inset-bottom)`; landscape: `padding-left/right: env(safe-area-inset-left/right)` cho top bar và nội dung.
- Chiều cao: dùng `dvh` (`min-h-dvh`) cho khung; `svh` cho phần tử phải luôn vừa khi thanh địa chỉ hiện (flashcard tối đa `60svh`); không dùng `100vh`.
- PWA standalone (`display-mode: standalone`): không có thanh địa chỉ → top bar tự chứa nút quay lại khi không ở màn hình gốc (iOS standalone không có nút Back hệ thống).

## 4. Bàn phím ảo

- Thêm `interactive-widget=resizes-content` vào meta viewport (Chrome Android thu nội dung khi bàn phím mở; Safari bỏ qua, dùng phương án dưới).
- Ẩn Bottom Navigation khi một ô nhập đang focus trên mobile (lắng nghe `focusin/focusout` + `visualViewport.resize` khi có); nút chính của form đặt trong luồng nội dung (không `position: fixed` đáy) để không bị bàn phím che, hoặc dính theo `visualViewport` khi cần.
- Ô nhập được focus cuộn vào giữa vùng nhìn thấy (`scrollIntoView({ block: 'center' })` sau khi bàn phím mở); `scroll-margin` = chiều cao top bar.
- Input ≥ 16 px; `enterkeyhint` đúng (`search`, `next`, `done`, `go`); `inputmode` phù hợp (không dùng `numeric` cho mật khẩu).
- Gõ tiếng Trung bằng IME: không bắt phím tắt và không tìm kiếm trong lúc `isComposing`.

## 5. Touch, chuột, bút, bàn phím

- Mục tiêu chạm ≥ 44 × 44 px, cách nhau ≥ 8 px; vùng chạm có thể lớn hơn phần nhìn thấy.
- Hover chỉ là trang trí bổ sung: bọc trong `@media (hover: hover) and (pointer: fine)` (Tailwind 4 `hover:` đã làm vậy); không giấu chức năng sau hover.
- `touch-action: manipulation` cho nút (bỏ trễ double-tap); `touch-action: none` **chỉ** trên canvas viết; vuốt ngang trên flashcard chỉ khi trang không có cuộn ngang khác.
- Không bắt cử chỉ vuốt từ mép màn hình (xung đột Back của iOS/Android).
- Bút (tablet): canvas dùng áp lực khi có (`pointerType === 'pen'`); bàn tay tì lên màn hình không vẽ khi đang có nét bút (palm rejection đơn giản theo `pointerType`).
- Bàn phím: thứ tự Tab theo thứ tự đọc; skip link "Bỏ qua tới nội dung" (đã có); không bẫy focus ngoài dialog.

## 6. Viewport hẹp (320–359 px)

- Bottom nav vẫn 5 mục, nhãn 11–12 px có thể xuống 2 dòng không được → rút gọn nhãn ≤ 9 ký tự (đã chọn nhãn ngắn).
- Lề 12; card padding 12; `hanzi.hero` 72; thanh công cụ canvas chỉ icon (có `aria-label`); bảng → danh sách xếp chồng.
- Không cuộn ngang ở mọi màn hình (test tự động `expectNoHorizontalScroll` đã có — mở rộng cho 320).

## 7. Landscape

- **Điện thoại ngang** (chiều cao < 500 px): bottom nav thu thành 48 px, chỉ icon + nhãn `sr-only`; top bar 44 px; trong chế độ tập trung bố cục 2 cột: flashcard/canvas trái (theo chiều cao, tối đa `100svh − 88`), điều khiển phải.
- **Tablet ngang ≥ 1024**: bố cục desktop với sidebar thu gọn.
- Không khóa hướng màn hình (manifest không đặt `orientation`).

## 8. Cuộn

- Cuộn trang bằng document (không lồng nhiều vùng cuộn dọc trên mobile). Trên desktop, danh sách + chi tiết (từ điển, thư viện) cho phép hai cột cuộn độc lập với `overscroll-behavior: contain`.
- Header dính (`position: sticky`), không `fixed` (trừ bottom nav), để tránh lỗi bàn phím iOS.
- Khôi phục vị trí cuộn khi quay lại danh sách (Next.js App Router làm mặc định; danh sách ảo hóa M2 phải giữ chỉ mục).
- Danh sách dài (từ điển, thư viện ≥ 200 mục): ảo hóa hoặc phân trang (M2, theo `PERFORMANCE.md`); không phụ thuộc thư viện mới khi chưa đo.
- `scroll-behavior: smooth` chỉ khi không reduced-motion.

## 9. Accessibility theo thiết bị

- Zoom trình duyệt 200% và cỡ chữ hệ thống lớn: không cắt chữ, không chồng lấn (dùng `rem`, `min-height` thay `height`); ở 200% trên desktop bố cục có thể rơi về tablet/mobile — chấp nhận.
- Trình đọc màn hình: VoiceOver (iOS/macOS), TalkBack (Android), NVDA (Windows) — đọc nhãn điều hướng, trạng thái đồng bộ, kết quả quiz.
- `prefers-reduced-motion`, `prefers-color-scheme`, `forced-colors` (viền và focus vẫn thấy), `prefers-contrast: more` (tùy chọn: dùng `border.strong` cho card).
- Ngôn ngữ trang `lang="vi"`; chữ Hán `zh-Hans`; pinyin `zh-Latn-pinyin`.

## 10. Không thay đổi tính chất web app

- Không có màn hình nào yêu cầu cài PWA; nút "Cài đặt ứng dụng" chỉ nằm trong _Thêm_/Hồ sơ và chỉ hiện khi trình duyệt hỗ trợ.
- Offline navigation vẫn theo service worker hiện có; font tự host được cache theo quy tắc `/_next/static/` hiện tại của `sw.js`.
