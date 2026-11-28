# Component specification V2

Trạng thái: **ĐÃ DUYỆT 2026-11-24** (D-039). UI-2 đã triển khai Button, IconButton, Input, Password Input, Search, Card, Badge (+ Study Card) trong `apps/web/src/components/ui/`. UI-2B (`docs/design/UI2B_REPORT.md`) thêm Tabs, Tooltip, Progress Bar/Ring, Skeleton, Empty State, Error State, PageHeader V2. Token: `TOKENS_V2.md`. Breakpoint: `RESPONSIVE_V2.md`.

## 0. Quy ước chung (áp dụng cho mọi component)

- **Kỹ thuật:** React + Tailwind 4, HTML gốc trước (`<button>`, `<a>`, `<input>`, `<dialog>`, `<progress>`). Không thêm thư viện UI runtime. Variant khai báo bằng một map class tĩnh trong file component (như `Button` M0) — không dựng class động bằng chuỗi nối mà Tailwind không quét được.
- **Kích thước chuẩn:** `sm` cao 36 px (chỉ cho desktop dày đặc, vùng chạm vẫn mở rộng tới 44 px bằng padding ẩn), `md` 44 px (mặc định), `lg` 52 px (CTA chính trên mobile, phiên học).
- **Focus:** `:focus-visible` → vòng 2 px `border.focus` cách 2 px. Không xóa focus.
- **Disabled:** dùng thuộc tính `disabled` thật (hoặc `aria-disabled="true"` khi cần giữ khả năng focus để đọc lý do); chữ `fg.disabled`, nền `state.disabled.bg`.
- **Loading:** giữ kích thước, thay nội dung bằng spinner + `aria-busy="true"`, chặn bấm lặp; thông báo kết quả qua `role="status"`.
- **Ngôn ngữ:** chữ Hán luôn qua `HanziText` (`lang="zh-Hans"`), pinyin qua `Pinyin` (`lang="zh-Latn-pinyin"`).
- **Test id:** giữ nguyên mọi `data-testid` M0; component mới nhận `data-testid` qua props.
- **Motion:** theo `TOKENS_V2.md` mục 8; mọi animation có nhánh `motion-reduce:`.
- Cột "M0" cho biết component hiện có thể **tái dùng**, **thay thế**, hoặc **mới**.

| #   | Component                                                    | M0                                             | Milestone cần                         |
| --- | ------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------- |
| 1   | Button                                                       | Thay (`ui.tsx › Button`)                       | PR-2                                  |
| 2   | Input                                                        | Mới (đang dùng `<input>` rải rác)              | PR-2                                  |
| 3   | Password Input                                               | Mới (thay ô mật khẩu ở `/lab/session`)         | PR-2                                  |
| 4   | Search                                                       | Mới                                            | PR-2 (dùng thật ở M2)                 |
| 5   | Tabs                                                         | Mới                                            | PR-2                                  |
| 6   | Navigation item                                              | Thay (trong `AppShell`)                        | PR-3                                  |
| 7   | Sidebar                                                      | Thay (sidebar + rail M0 → một component)       | PR-3                                  |
| 8   | Bottom Navigation                                            | Thay                                           | PR-3                                  |
| 9   | Card                                                         | Thay (`ui.tsx › Card`)                         | PR-2                                  |
| 10  | Flashcard                                                    | Mới                                            | Thiết kế PR-2; dữ liệu thật M3        |
| 11  | Badge                                                        | Thay (`StatusBadge` → Badge + StatusBadge)     | PR-2                                  |
| 12  | Progress Bar                                                 | Mới                                            | PR-2                                  |
| 13  | Streak Indicator                                             | Mới                                            | Chỉ hiển thị từ M7 (cần dữ liệu thật) |
| 14  | Dialog / Sheet                                               | Mới                                            | PR-4                                  |
| 15  | Toast                                                        | Mới                                            | PR-4                                  |
| 16  | Skeleton                                                     | Mới                                            | PR-2                                  |
| 17  | Empty State                                                  | Mới                                            | PR-2                                  |
| 18  | Error State                                                  | Mới                                            | PR-2                                  |
| 19  | Offline State                                                | Mới (thay đoạn chữ trong Phòng thử)            | PR-4                                  |
| 20  | Sync Indicator                                               | Thay (`SyncChip`, giữ logic G1)                | PR-4                                  |
| 21  | File Upload                                                  | Restyle (`/lab/upload`, giữ kiểm tra PDF)      | PR-5                                  |
| 22  | Audio Recorder                                               | Restyle (`/lab/audio`, giữ luồng AudioContext) | PR-5                                  |
| 23  | Handwriting Canvas                                           | Restyle khung (giữ `HandwritingCanvas.tsx`)    | PR-5                                  |
| +   | `HanziText`, `Pinyin`, `PageHeader`, `IconButton`, `Tooltip` | Mới/thay                                       | PR-2                                  |

---

## 1. Button

- **Mục đích:** kích hoạt hành động. Link điều hướng dùng `<a>`/`Link` với cùng kiểu (`ButtonLink`), không dùng `<button>` để đổi trang.
- **Variant:** `primary` (nền `primary.solid`, chữ `primary.on`) · `secondary` (nền `surface`, viền `border.strong`, chữ `fg.default`) · `ghost` (trong suốt, hover `state.hover`) · `danger` (nền `error.solid`) · `success` (chỉ cho "Tiếp tục" sau câu đúng trong phiên học). Tối đa một `primary` mỗi màn hình.
- **Size:** `sm` 36 (px 12, chữ 14) · `md` 44 (px 20, chữ 16/600) · `lg` 52 (px 24, chữ 16/600, full-width trên mobile trong phiên học/form). Radius `sm` (12) cho sm/md, `md` (16) cho lg. Icon 20, cách nhãn 8.
- **State:** hover (`*.hover`), active (`*.active`, `scale(0.98)` 120 ms), focus-visible, disabled, loading (spinner 16 thay icon trái, nhãn giữ nguyên để không nhảy chiều rộng).
- **A11y:** `type="button"` mặc định; nút chỉ có icon dùng `IconButton` với `aria-label` bắt buộc; không dùng màu làm tín hiệu duy nhất cho `danger` (nhãn rõ: "Xóa tài liệu").
- **Responsive:** trong form/phiên học trên mobile, nút chính full-width và dính đáy vùng nội dung (trên bottom nav, tính safe-area).
- **M0 → V2:** thay `Button` trong `ui.tsx`; API `variant="primary|ghost"` giữ tương thích, `ghost` cũ ánh xạ sang `secondary`.

## 2. Input

- **Mục đích:** nhập văn bản một dòng (email, ghi chú, tên tài liệu).
- **Cấu trúc:** `<label>` hiển thị (không chỉ placeholder) · ô nhập · dòng gợi ý (`fg.subtle`, 14) · dòng lỗi (`error.text` + icon, liên kết bằng `aria-describedby`).
- **Style:** cao 44 (md) / 52 (lg), radius 12, nền `surface`, viền 1 px `border.strong`, chữ 16 (≥ 16 để iOS không zoom), padding ngang 14. Hover: viền `fg.subtle`. Focus: viền `primary.base` + vòng focus. Lỗi: viền `error.base`, `aria-invalid="true"`. Disabled: nền `state.disabled.bg`.
- **A11y:** `autocomplete` đúng (`username`, `current-password`, `new-password`, `email`); lỗi hiển thị sau khi rời ô hoặc khi gửi, không đỏ ngay khi đang gõ; thông báo lỗi tổng hợp đầu form có `role="alert"`.
- **Responsive:** full-width trên mobile; form tối đa 400 px trên tablet/desktop.

## 3. Password Input

- **Mục đích:** đăng nhập (D-038) và đổi mật khẩu (M1).
- **Cấu trúc:** Input + `IconButton` "Hiện/ẩn mật khẩu" bên phải (đổi `type` giữa `password`/`text`, `aria-pressed`, nhãn đổi theo trạng thái). Không có nút "copy".
- **Biến thể "mật khẩu mới" (M1):** dòng yêu cầu "Ít nhất 12 ký tự" cập nhật trực tiếp (✓ khi đạt, đọc qua `aria-live="polite"` chỉ khi trạng thái đổi); ô "Nhập lại mật khẩu". Không có thanh "độ mạnh" màu sắc gây hiểu nhầm; chỉ hiện các yêu cầu thật của chính sách (≥ 12 ký tự, khác mật khẩu hiện tại).
- **Bảo mật UI:** `autocomplete="current-password"` / `new-password`; `autocapitalize="none"`, `spellcheck="false"`; giá trị bị xóa khỏi state sau mỗi lần gửi (như M0); không log; khi chuyển sang "hiện" tự ẩn lại sau khi gửi.
- **M0:** dùng ngay cho `/lab/session` ở PR-5 (giữ `data-testid="login-password"`).

## 4. Search

- **Mục đích:** tìm trong từ điển (Hán tự / pinyin có hoặc không dấu / tiếng Việt) và thư viện.
- **Style:** Input cao 48, radius `full` (pill), icon kính lúp trái, nút xóa phải khi có chữ, gợi ý phím tắt `/` (desktop, ẩn trên touch).
- **Hành vi:** `type="search"`, `enterkeyhint="search"`, `inputmode` mặc định; debounce 150 ms cho tìm cục bộ (IndexedDB, D-032 P2); kết quả dạng `role="listbox"` hoặc danh sách thường + đếm kết quả đọc qua `role="status"`. IME tiếng Trung: chỉ tìm khi `compositionend`, không tìm từng phím trong lúc soạn.
- **Responsive:** mobile — thanh tìm dính đầu màn hình Từ điển; desktop — trong cột danh sách. Phím `/` focus ô tìm, `Esc` xóa/thoát.
- **Trạng thái:** đang tìm (spinner trong ô), không có kết quả (Empty State gọn: "Không tìm thấy 'xyz'" + gợi ý thử pinyin không dấu), offline (vẫn tìm dữ liệu đã tải, ghi chú nhỏ).

## 5. Tabs

- **Mục đích:** chuyển giữa các chế độ xem cùng cấp (Từ điển: Nghĩa / Ví dụ / Chiết tự; Thư viện: Giáo trình / Tài liệu).
- **Style:** dạng **segmented** (nền `bg.subtle`, tab chọn nền `surface` + `shadow.xs`, radius 12) cho 2–4 tab ngắn; dạng **gạch chân** (2 px `primary.base`) cho tab nội dung dài. Cao 40 (segmented) / 44 (underline).
- **A11y:** mẫu WAI-ARIA Tabs: `role="tablist"`, `tab`, `tabpanel`, `aria-selected`, phím ←/→ đổi tab, Home/End; kích hoạt tự động.
- **Responsive:** quá rộng trên mobile → cuộn ngang trong tablist (không cuộn cả trang), có fade mép.
- **Motion:** chỉ báo trượt 200 ms; reduced-motion: đổi tức thì.

## 6. Navigation item

- **Cấu trúc:** icon 24 + nhãn. Trạng thái chọn: nền `primary.subtle`, chữ/icon `primary.text` (`#2A4FE0` trên subtle), `aria-current="page"`. Hover: `state.hover`.
- Nhãn ngắn (≤ 12 ký tự) để vừa bottom nav: _Hôm nay, Luyện tập, Từ điển, Thư viện, Thêm_.
- Huy hiệu số (ví dụ số thẻ đến hạn — M3) dùng Badge `count`, có văn bản ẩn "12 thẻ đến hạn".

## 7. Sidebar (desktop ≥ 1024 và tablet 768–1023)

- **Trạng thái:** `expanded` 248 px (logo + nhãn) · `collapsed` 72 px (icon, tooltip nhãn khi hover/focus). Tablet: luôn `collapsed`. Desktop 1024–1279: mặc định `collapsed`; ≥ 1280: mặc định `expanded`. Người dùng đổi bằng nút "Thu gọn/Mở rộng" (`aria-expanded`, `aria-controls`), lựa chọn lưu `localStorage` (tiện ích; lỗi thì dùng mặc định).
- **Nội dung:** logo · nhóm chính (Hôm nay, Luyện tập, Từ điển, Thư viện; Gia sư AI từ M7) · khoảng trống · nhóm phụ (Tiến độ M3+, Phòng thử chỉ khi M0/dev) · Sync Indicator · menu tài khoản (avatar chữ cái đầu → Hồ sơ, Cài đặt, Cài đặt app (PWA, tùy chọn), Đăng xuất).
- **Style:** nền `surface`, viền phải `border.default`, không shadow; item cao 44, radius 12, khoảng cách 4.
- **A11y:** `<nav aria-label="Điều hướng chính">`; tooltip ở trạng thái thu gọn phải đọc được bằng `aria-label`/`title` và hiện khi focus bàn phím.
- **Motion:** đổi chiều rộng bằng `grid-template-columns` có transition 200 ms là ngoại lệ duy nhất animate layout (một lần, do người dùng bấm); reduced-motion: tức thì.
- **Test:** giữ `data-testid="nav-sidebar"` (desktop) và `nav-rail` (tablet, chính là sidebar thu gọn) để test layout M0 vẫn có nghĩa; test được cập nhật cùng breakpoint trong PR-3.

## 8. Bottom Navigation (mobile < 768)

- **Mục:** 5 ô: **Hôm nay · Luyện tập · Từ điển · Thư viện · Thêm**. _Thêm_ mở bottom sheet: Hồ sơ, Tiến độ (M3+), Gia sư AI (M7, có thể lên thanh chính sau), Cài đặt, Cài đặt ứng dụng (tùy chọn), Phòng thử (M0/dev), Đăng xuất.
- **Style:** cao 64 + `env(safe-area-inset-bottom)`, nền `surface` 95% + blur nhẹ, viền trên `border.default`; nhãn 12/500 luôn hiện (không chỉ icon); item chọn: icon `primary.base` + chấm/pill nền `primary.subtle` sau icon.
- **Hành vi:** ẩn khi bàn phím ảo mở; ẩn trong "chế độ tập trung" (phiên flashcard/quiz/viết) — thay bằng nút "Thoát" ở top bar; bấm lại tab đang chọn → cuộn về đầu.
- **A11y:** `<nav aria-label="Điều hướng chính">`, `aria-current="page"`; vùng chạm ≥ 64 × 48.
- **Test:** giữ `data-testid="nav-bottom"`.

## 9. Card

- **Variant:** `default` (nền `surface`, viền `border.default`, không shadow) · `interactive` (cả card là một link/nút: hover `shadow.sm` + viền `border.strong`, focus-visible vòng ngoài; chỉ **một** vùng bấm, không lồng nút trong link) · `subtle` (nền `bg.subtle`, không viền — nhóm thông tin phụ) · `highlight` (viền trái 4 px màu nhấn theo ý nghĩa — dùng cho "Gợi ý AI" (lavender) hoặc "Chuỗi ngày" (coral); tối đa một card highlight mỗi màn hình).
- **Cấu trúc:** header (tiêu đề `h3` + hành động phụ bên phải) · nội dung · footer tùy chọn. Padding 16/20/24 theo breakpoint, radius 16.
- **M0 → V2:** thay `Card` (`bg-paper-2/60`) — API `title`, `className` giữ nguyên; thêm `variant`, `as`.

## 9b. Study Card (UI-2, theo hình tham chiếu)

- **Mục đích:** ô lối vào nhanh cho một kỹ năng ("Hôm nay học gì?"): Từ vựng mới · Nghe hiểu · Luyện viết.
- **Style:** nền pastel `study.blue` `#E2EDFD` / `study.lavender` `#F0EAFE` (Nghe hiểu — chủ dự án chốt lavender, không dùng hồng/coral) / `study.mint` `#D4F8F0`, icon đặc cùng tông (`#1881FE` / `#8259DD` / `#08BD8D`, trang trí, `aria-hidden`; lavender đạt 4.05:1 trên nền), radius 20, tỉ lệ ≈ 13:10, nội dung căn giữa; tiêu đề 18/700 (20 từ tablet), dòng phụ `fg.muted`. Không viền, không bóng; hover (khi là link): nhích lên 2 px + `shadow.md` (tắt khi reduced-motion).
- **Dữ liệu:** dòng phụ chỉ nhận số liệu thật; tính năng chưa có → `comingSoon` (nhãn "Sắp có", không phải link). Không bao giờ hiện số giả.
- **Responsive:** 2 cột trên điện thoại (kể cả 320 px), 3 cột từ 768.
- **A11y:** cả ô là một link (một vùng bấm), tên truy cập = tiêu đề + dòng phụ.

## 10. Flashcard

- **Mục đích:** ôn từ vựng (M3, theo QuizType registry). Mặt trước: chữ Hán (`hanzi.hero`) ± pinyin tùy chế độ; mặt sau: pinyin, nghĩa tiếng Việt, ví dụ, nút nghe.
- **Style:** `surface.raised`, radius 20, `shadow.md`, tỉ lệ ~ 4:5 trên mobile (chiều cao tối đa 60vh), 3:2 trên desktop; chữ căn giữa.
- **Tương tác:** chạm/click/Space để lật; sau khi lật hiện 3–4 nút đánh giá (Quên · Khó · Nhớ · Dễ) dạng `secondary` lớn, phím tắt 1–4 trên desktop. Vuốt trái/phải trên touch **chỉ** là phím tắt bổ sung, luôn có nút tương đương.
- **A11y:** mặt đang hiện là nội dung đọc được; mặt ẩn có `aria-hidden`; nút lật có nhãn "Lật thẻ — hiện nghĩa"; thông báo "Thẻ 3/20" qua `role="status"`.
- **Motion:** lật 3D `rotateY` 320 ms `ease.standard`; reduced-motion: đổi mặt tức thì (opacity 120 ms). Không lắc thẻ khi sai.
- **Dữ liệu:** chỉ hiển thị dữ liệu thật từ lịch ôn (M3). Trước M3 chỉ xuất hiện trong trang Component gallery (Phòng thử, dữ liệu mẫu ghi rõ "Ví dụ").

## 11. Badge

- **Variant:** `neutral` (nền `bg.subtle`, chữ `fg.muted`) · `primary` · `success` · `warning` · `error` · `accent` — đều dùng nền `*.subtle` + chữ `*.text`; `count` (pill nhỏ nền `primary.solid`, chữ trắng, tối thiểu 20 px). Cao 24, radius `full`, chữ 12/600, padding 8.
- **StatusBadge (giữ nghĩa M0):** VERIFIED → success, LIVE_UNCONFIRMED → primary, MOCKED → warning, BLOCKED → error, UNTESTED → neutral; luôn có chữ (MOCK/LIVE/…), không chỉ màu. `data-status` giữ nguyên.
- Nhãn trình độ (HSK 1…, M2) dùng `neutral`, không gán màu cầu vồng theo cấp.

## 12. Progress Bar

- **Mục đích:** tiến độ phiên học (câu 7/20), tải tệp, mục tiêu ngày (M3+).
- **Style:** track `bg.subtle` cao 8 (mặc định) / 4 (mỏng, đầu phiên học), radius `full`; fill `primary.base`; biến thể `success` khi đạt mục tiêu. Nhãn số bên cạnh hoặc trên ("7 / 20"), `tabular-nums`.
- **A11y:** `<progress>` gốc hoặc `role="progressbar"` + `aria-valuenow/min/max` + `aria-label`; không xác định → `aria-busy` và hoạt ảnh chạy (tắt khi reduced-motion → thanh tĩnh + chữ "Đang xử lý…").
- **Motion:** fill đổi `transform: scaleX` 200 ms.
- **Biến thể vòng (Progress Ring)** cho mục tiêu ngày trên Dashboard (M3+): SVG 56–80 px, nét 6, cùng màu; số ở giữa.

## 13. Streak Indicator

- **Mục đích:** số ngày học liên tiếp — **chỉ hiển thị khi engine gamification (M7) có dữ liệu thật** (D-003). Trước đó không render (không hiện "0 ngày" giả).
- **Style:** pill nền `accent.subtle`, icon ngọn lửa đơn sắc `accent.text`, số `text.body-strong` `tabular-nums` ("5 ngày"). Trạng thái "hôm nay chưa học": icon viền, chữ `fg.muted` — **không** cảnh báo đỏ hay đếm ngược.
- **Tương tác:** bấm mở popover lịch 7 ngày (chấm đã học / chưa), có văn bản cho trình đọc màn hình.
- **Motion:** khi tăng ngày — icon "bật" 1 lần (`ease.spring` 300 ms); reduced-motion: không.
- **Vị trí:** top bar (mobile), đầu Dashboard (desktop). XP hiển thị cùng kiểu Badge `primary` ("+20 XP") chỉ ở thẻ tổng kết phiên.

## 14. Dialog / Bottom Sheet

- **Kỹ thuật:** `<dialog>` gốc với `showModal()` (focus trap, `Esc`, `inert` nền có sẵn trên Chrome/Edge/Firefox/Safari hiện đại); `::backdrop` = `overlay.scrim`.
- **Variant:** `dialog` (giữa màn hình, rộng tối đa 480, radius 20, `shadow.lg`) — xác nhận, cảnh báo · `sheet` (mobile: trượt từ dưới, radius trên 24, tay nắm, tối đa 90dvh, cuộn trong) — menu _Thêm_, chọn tùy chọn. Trên tablet/desktop `sheet` hiển thị như `dialog` hoặc popover neo nút.
- **Cấu trúc:** tiêu đề (`aria-labelledby`), mô tả (`aria-describedby`), hành động: chính bên phải (desktop) / dưới cùng full-width (mobile); hành động hủy là `secondary`. Hành động phá hủy dùng `danger` và nhắc rõ hậu quả.
- **Hành vi:** focus vào phần tử đầu tiên có nghĩa (không phải nút đóng) khi mở; trả focus về nút mở khi đóng; khóa cuộn nền; không tự đóng khi bấm scrim nếu có dữ liệu đang nhập.
- **Motion:** dialog fade + scale 0.98→1 (200 ms); sheet `translateY` (320 ms); reduced-motion: fade 120 ms.

## 15. Toast

- **Mục đích:** phản hồi ngắn không chặn (đã lưu, đã đồng bộ lại, tải lên xong). Lỗi cần hành động → Error State trong trang hoặc Dialog, không chỉ toast.
- **Style:** `surface.inverse` (trung tính) hoặc nền `*.subtle` + icon cho success/warning/error; radius 16, `shadow.lg`, rộng tối đa 400; mobile: phía trên bottom nav (tính safe-area), desktop: góc dưới phải.
- **Hành vi:** tự ẩn 4 s (6 s nếu có nút "Hoàn tác"); dừng hẹn giờ khi hover/focus; tối đa 3 cái xếp chồng; nút đóng.
- **A11y:** vùng `role="status"` (`aria-live="polite"`) có sẵn trong layout; lỗi dùng `role="alert"`. Không đặt focus vào toast.

## 16. Skeleton

- **Mục đích:** giữ chỗ khi tải lần đầu > 300 ms (dưới mức đó không hiện để tránh nháy).
- **Style:** khối `bg.subtle`, radius theo phần tử thật; shimmer gradient nhẹ 1.2 s (tắt khi reduced-motion). Hình dạng khớp layout thật để không nhảy (CLS).
- **A11y:** vùng chứa `aria-busy="true"`, một nhãn ẩn "Đang tải…"; skeleton bản thân `aria-hidden`.
- **Ưu tiên:** dữ liệu cục bộ (IndexedDB) hiển thị ngay — skeleton chủ yếu cho lần tải đầu và nội dung mạng.

## 17. Empty State

- **Mục đích:** chưa có dữ liệu, **hoặc tính năng chưa ra mắt** (M0: ghi rõ milestone thay vì dữ liệu giả).
- **Cấu trúc:** minh họa nhỏ (≤ 96 px, đơn sắc + 1 màu nhấn, hoặc chữ Hán lớn mờ như 学) · tiêu đề `h3` · mô tả 1–2 câu · tối đa 1 hành động chính + 1 phụ.
- **Biến thể:** `first-use` ("Thêm từ đầu tiên của bạn") · `no-results` (gọn, không minh họa) · `coming-soon` (badge `neutral` "Ra mắt ở M3", không có nút giả) · `filtered` ("Không có mục khớp bộ lọc — Xóa bộ lọc").
- Căn giữa trong card/vùng, tối đa 360 px.

## 18. Error State

- **Mục đích:** lỗi tải hoặc thao tác thất bại cần người dùng biết/hành động.
- **Mức:** `inline` (dưới field) · `section` (trong card: icon `error.text`, tiêu đề ngắn, giải thích bằng ngôn ngữ thường, nút "Thử lại") · `page` (không tải được trang: kèm "Về Hôm nay").
- **Nội dung:** nói điều gì xảy ra + làm gì tiếp; không hiện stack trace, mã lỗi nội bộ chỉ trong "Chi tiết" thu gọn (Phòng thử). Lỗi xác thực dùng thông điệp chung (D-038).
- Phân biệt rõ với Offline State (không phải lỗi của người dùng).
- **A11y:** `role="alert"` cho lỗi mới xuất hiện sau thao tác; nút "Thử lại" nhận focus khi lỗi cấp trang.

## 19. Offline State

- **Mục đích:** cho biết đang offline và **điều gì vẫn làm được** (học offline vẫn ghi vào IndexedDB + outbox).
- **Mức:** banner mảnh dưới top bar (nền `warning.subtle`, chữ `warning.text`: "Đang offline — tiến độ sẽ đồng bộ khi có mạng") hiện khi chuyển offline, có thể thu gọn thành Sync Indicator · trạng thái trong section cho nội dung cần mạng (AI tutor, chấm phát âm, tải PDF): Empty State "Cần kết nối mạng" + nút "Thử lại khi có mạng".
- Không khóa toàn app; không xóa dữ liệu đã nhập.
- **A11y:** thông báo chuyển trạng thái qua `role="status"` một lần.

## 20. Sync Indicator

- **Logic giữ nguyên M0 (G1, D-035):** "Đã đồng bộ" **chỉ** khi không có thao tác chờ **và** không có thao tác bị từ chối; thứ tự ưu tiên: lỗi đồng bộ > offline > đang chờ > đã đồng bộ. Không coi xác nhận mock là đã lưu.
- **Style:** pill cao 28: chấm 8 px + chữ 12/500. Màu chấm: `error.base` (n lỗi), `warning.base` (offline), `primary.base` (n chờ), `success.base` (đã đồng bộ). Chữ luôn có (trừ dạng thu gọn khi mọi thứ ổn — vẫn có `sr-only`).
- **Tương tác:** bấm mở popover: số chờ, số lỗi, lần đồng bộ cuối, nút "Đồng bộ ngay", liên kết xem lỗi (M1).
- **Vị trí:** đáy sidebar (desktop/tablet), top bar (mobile).
- **Test:** giữ `data-testid="sync-chip"` và chuỗi chữ hiện có ("Đã đồng bộ", "… chờ đồng bộ", "… lỗi đồng bộ", "Offline").

## 21. File Upload

- **Giữ nguyên nghiệp vụ M0:** kiểm tra loại/kích thước phía trình duyệt, kiểm tra `%PDF-`, server chọn đường dẫn, bucket private.
- **Cấu trúc:** vùng thả (`surface.sunken`, viền nét đứt 2 px `border.strong`, radius 16) chứa icon, "Kéo thả PDF vào đây hoặc **Chọn tệp**" (nút thật `<label for>` input file), giới hạn ("PDF, tối đa … MB"). Danh sách tệp: tên, kích thước, Progress Bar, trạng thái (Đang kiểm tra · Đang tải · Đã lưu · Lỗi — kèm lý do), nút hủy/xóa.
- **State:** kéo-qua (viền `primary.base`, nền `primary.subtle`) · từ chối (viền `error.base`, thông điệp "Tệp không phải PDF") · offline (vô hiệu, Offline State).
- **Responsive:** mobile ẩn câu "kéo thả", chỉ nút "Chọn tệp" lớn (mở trình chọn/ứng dụng Tệp).
- **A11y:** input file truy cập được bằng bàn phím; kết quả đọc qua `role="status"`.

## 22. Audio Recorder

- **Giữ nguyên kỹ thuật M0:** `AudioContext` tạo/resume **đồng bộ trong thao tác bấm** (fix Firefox), WAV 16 kHz mono, xin quyền tường minh, hướng dẫn khi bị từ chối.
- **Cấu trúc:** nút ghi tròn 64 px (`primary.solid`; đang ghi: `error.solid` + biểu tượng dừng) · thời lượng `tabular-nums` · dạng sóng/mức âm lượng đơn giản (thanh dọc, `primary.base`) · sau khi ghi: Nghe lại, tốc độ (0.5× / 0.75× / 1×, Tabs segmented), Ghi lại, Gửi chấm (M6).
- **State:** chưa có quyền · đang xin quyền · bị từ chối (Error State + hướng dẫn theo trình duyệt) · không hỗ trợ · đang ghi · đã ghi · đang gửi · kết quả (M6: điểm theo âm tiết, thanh điệu).
- **A11y:** nút có nhãn đổi theo trạng thái ("Bắt đầu ghi" / "Dừng ghi"), `aria-pressed`; trạng thái ghi đọc qua `role="status"`; phím Space bắt đầu/dừng khi nút có focus.
- **Motion:** vòng "thở" quanh nút khi đang ghi (opacity, 1.5 s) — tắt khi reduced-motion (thay bằng chữ "Đang ghi" + chấm đỏ tĩnh).

## 23. Handwriting Canvas

- **Giữ nguyên `HandwritingCanvas.tsx`:** Pointer Events, `touch-action: none`, `pointerType`, áp lực bút, cùng định dạng nét, xử lý devicePixelRatio. V2 chỉ đổi **khung và điều khiển xung quanh**.
- **Cấu trúc:** khung vuông `surface.sunken`, radius 20, lưới 米 hoặc 田 (`stroke.guide`, bật/tắt) · nét người dùng `stroke.ink` (độ dày theo kích thước khung) · thanh công cụ: Hoàn tác, Xóa, Gợi ý (M5), Nộp — dạng `IconButton` + nhãn trên tablet/desktop · khu kết quả: ứng viên nhận dạng (chữ Hán `hanzi.lg` dạng nút) hoặc nhãn MOCK/"chưa được cấu hình" (giữ StatusBadge).
- **Kích thước:** mobile: rộng = viewport − 32, tối đa 360; tablet: 420; desktop: 480 với cột gợi ý bên cạnh.
- **A11y:** canvas có `role="img"` + `aria-label` mô tả ("Khung viết chữ — 3 nét"); mọi chức năng có nút thay thế bằng bàn phím (trừ việc vẽ); thông báo kết quả qua `role="status"`. Ghi rõ trong UI: viết tay cần chuột/chạm/bút.
- **Hành vi:** trang không cuộn/zoom khi viết (đã có); trong phiên luyện viết ẩn bottom nav (chế độ tập trung); landscape điện thoại: khung theo chiều cao (xem `RESPONSIVE_V2.md`).

## 24. Thành phần hỗ trợ

- **`HanziText`**: `<span lang="zh-Hans" class="font-hanzi">`; props `size` (`hero|xl|lg|inline`); không `font-synthesis`.
- **`Pinyin`**: `<span lang="zh-Latn-pinyin">`, NFC; prop `tone-color` (tắt mặc định).
- **`PageHeader`**: giữ API M0 (`title`, `lead`, `aside`); `h1` theo thang mới; trên mobile tiêu đề có thể nằm trong top bar thay vì nội dung.
- **`IconButton`**: 44 × 44 (sm 36 + vùng chạm 44), radius 12 hoặc tròn, `aria-label` bắt buộc, tooltip trên desktop.
- **`Tooltip`**: chỉ bổ sung (không chứa thông tin duy nhất), hiện khi hover **và** focus, `Esc` đóng; không dùng trên touch làm kênh chính.
- **Icon:** giữ bộ SVG nội tuyến (`icons.tsx`, lưới 24, nét 1.75–1.8, bo tròn); mở rộng cùng phong cách. Không thêm thư viện icon (có thể cân nhắc sau nếu số icon > 40).

## 25. Thẻ lưới đều chiều cao (Equal-height card grid) — M3.5

Quy tắc cho mọi lưới thẻ có nội dung dài ngắn khác nhau (ví dụ `/lab/visual-mnemonic`):

- `<ul>` dùng `grid items-stretch`; mỗi `<li>` là `flex h-full min-w-0 flex-col`, phần thẻ bọc `flex-1`.
- Vùng ảnh luôn `aspect-[4/3]` + `shrink-0`; không để nội dung đẩy vùng ảnh.
- Các "slot" cố định thứ tự: tiêu đề chữ (`min-h`) → ảnh 4:3 → câu gợi nhớ (`min-h` 2 dòng, được phép dài hơn, không cắt `overflow`) → nguồn/giấy phép (`mt-auto`) → chân thẻ (`min-h`, tên tệp).
- Cảnh báo lặp lại (ví dụ "không phải bằng chứng lịch sử") hiển thị một lần ở đầu trang; thẻ dùng riêng lẻ vẫn giữ cảnh báo (`showNotice`).
- Kiểm thử: e2e so sánh chiều cao thẻ, vị trí ảnh và chân thẻ trong cùng hàng ở mobile (1 cột), tablet (2 cột), desktop (3 cột), sáng/tối, không bị cắt, không tràn ngang.

## 26. Giao diện Sáng / Tối / Theo hệ thống — phạm vi toàn cục

- Nguồn duy nhất: `apps/web/src/design/theme.ts` (`useTheme`, `setTheme`, `applyTheme`); khoá `localStorage` `mandarin.theme`; script inline trong `app/layout.tsx` áp dụng trước khi vẽ. `ThemeCard` (Hồ sơ) và lab mnemonic dùng chung hook này → cùng lưu, cùng đồng bộ giữa các tab (sự kiện `storage`).
- Màu chỉ lấy từ token (`tokens.css`, `@theme inline`); không dùng màu cứng. Ảnh minh hoạ không đổi theo theme.

### Kiểm kê (audit) 2026-11-27

Đã đạt: toàn bộ token có biến thể `[data-theme=dark]` + `prefers-color-scheme`; quét mã nguồn `app/` và `src/` (trừ tokens) không còn màu hex/`bg-white`/`text-gray` cứng — ngoại lệ hợp lệ: `theme-color` meta và màu dự phòng của `HandwritingCanvas`; `ui6-dark.spec.ts` đã kiểm axe tương phản AA và không tràn ngang trên các màn hình thật.

Chưa đạt / còn lại (chưa sửa trong checkpoint này, không tuyên bố đã đủ):

1. ~~Chưa có điều khiển trong AppShell~~ — ĐÃ CÓ (checkpoint 2026-11-27 #2): `components/shell/ThemeToggle.tsx` (nút xoay vòng Theo hệ thống → Sáng → Tối; header điện thoại, rail, sidebar), dùng chung `design/theme.ts`. Bộ chọn đầy đủ vẫn ở Hồ sơ.
2. E2E hai theme: `/lab/visual-mnemonic`, `/profile` (`m3_5-global-theme.spec.ts`) và nay thêm `m3_5-global-theme-routes.spec.ts`: axe serious/critical + không tràn ngang trên `/login`, `/dictionary`, `/practice`, `/lab/hanzi-history`, `/lab/handwriting`, `/lab/design` (gallery gồm loading/skeleton/field-error), `/lab/design/error`; hộp thoại đồng bộ (đã đăng nhập giả lập) cả hai theme; một lựa chọn Tối bền qua điều hướng; Sáng ghi đè system dark. Chưa chạy cục bộ — chờ CI.
3. Chưa kiểm: dictionary có dữ liệu thật, màn quiz đang chơi, sheet "Thêm" trên điện thoại, toast, offline banner; axe chỉ quét `main` (header/nav chưa quét trên route mới).
4. Chưa xác minh trực quan focus ring ở cả hai theme cho mọi component.
5. Môi trường phiên này không có trình duyệt Playwright nên E2E mới chỉ chạy trên CI.
