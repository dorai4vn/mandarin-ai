# Kế hoạch UI-2B — Component primitives (đợt 2) + dọn Minor của UI-2

Trạng thái: **CHỜ CHỦ DỰ ÁN DUYỆT.** Chưa viết code. Không bắt đầu UI-3, UI-7B hoặc M1.
Nền: `main` `5b583ca` (UI-2, PR #5). Nhánh dự kiến: `feat/ui-2b-primitives` từ `main` mới nhất.

## 1. Nguyên tắc (giữ nguyên quyết định đã duyệt)

- Study Card **Blue / Lavender / Mint** giữ nguyên (token `--study-*`, icon, typography).
- Không đổi logo, typography (Inter / Noto Sans SC; Nunito chỉ cho lockup ở UI-7B), màu thương hiệu, shell, Dark mode.
- Không đổi Auth, API, DB/RLS, Service Worker, offline/sync, logic nghiệp vụ. Không thêm dependency.
- Mọi `data-testid` giữ nguyên. Không nới tiêu chí test để đạt PASS.
- FU-7 (upload flaky, issue #6) **không** sửa trong UI-2B.

## 2. Phạm vi

### 2A. Component mới (COMPONENT_SPEC_V2)

| #   | Component       | Spec             | Nội dung chính                                                                                                                                                                                                                                                                                                         |
| --- | --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Tabs`          | §5               | Dạng **segmented** (cao 40, nền `bg.subtle`, tab chọn `surface` + `shadow.xs`) và **underline** (cao 44, gạch 2 px `primary.base`); WAI-ARIA Tabs (`tablist`/`tab`/`tabpanel`, ←/→, Home/End, kích hoạt tự động, roving `tabIndex`); quá rộng → cuộn ngang trong tablist; chỉ báo trượt 200 ms, tắt khi reduced-motion |
| 2   | `ProgressBar`   | §12              | Track `bg.subtle` cao 8 / 4 (mỏng), fill `primary.base`, biến thể `success`; `role="progressbar"` + `aria-valuenow/min/max` + `aria-label` (hoặc nhãn hiển thị `aria-labelledby`); không xác định → `aria-busy` + hoạt ảnh (reduced-motion: thanh tĩnh + "Đang xử lý…"); `tabular-nums`                                |
| 3   | `ProgressRing`  | §12              | SVG 56–80 px, nét 6, cùng màu, số ở giữa; cùng ARIA như ProgressBar. Chỉ hiển thị dữ liệu thật (dashboard M3+); gallery ghi "Ví dụ"                                                                                                                                                                                    |
| 4   | `Skeleton`      | §16              | Khối `bg.subtle`, radius theo phần tử; shimmer 1.2 s tắt khi reduced-motion; `aria-hidden`; vùng chứa `SkeletonGroup` có `aria-busy="true"` + nhãn ẩn "Đang tải…"; tiện ích trì hoãn 300 ms để không nháy                                                                                                              |
| 5   | `EmptyState`    | §17              | Biến thể `first-use` · `no-results` · `coming-soon` (badge neutral "Ra mắt ở M…", **không nút giả**) · `filtered`; minh họa ≤ 96 px (chữ Hán mờ qua `HanziText`), tối đa 1 hành động chính + 1 phụ, rộng tối đa 360                                                                                                    |
| 6   | `ErrorState`    | §18              | Mức `inline` · `section` · `page`; nói rõ chuyện gì xảy ra + làm gì tiếp; `role="alert"` khi xuất hiện sau thao tác; cấp trang: nút "Thử lại" nhận focus; "Chi tiết" thu gọn (`<details>`) cho mã lỗi (Phòng thử)                                                                                                      |
| 7   | `Tooltip`       | §24              | Chỉ bổ sung (không chứa thông tin duy nhất); hiện khi hover **và** focus, `Esc` đóng, `aria-describedby`; nền `surface.inverse`; không là kênh chính trên touch; không thêm thư viện                                                                                                                                   |
| 8   | `PageHeader` V2 | §24, TOKENS §4.2 | Giữ API M0 (`title`, `lead`, `aside`); `h1` theo thang mới (26/34 mobile, 30/38 desktop, 700, −0.015em); dùng token V2 (`text-fg-muted` thay alias `ink-2`); thêm `eyebrow?`/`actions?` tùy chọn không bắt buộc                                                                                                        |

### 2B. Minor từ nghiệm thu UI-2 (ưu tiên theo yêu cầu: contrast → a11y → API → test)

| Ưu tiên | ID  | Vấn đề                                                                                                                   | Phương án                                                                                                                                                                                                                                                           |
| ------- | --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | M8  | `fg-subtle` trên `read-only:bg-sunken` 4.49:1, trên Card `subtle` 4.41:1 (< 4.5)                                         | Hint/placeholder dùng `fg-muted` khi nằm trên nền tô (`read-only`, Card subtle); hoặc chỉ dùng `fg-subtle` trên `surface`/`bg-page`. Thêm các cặp vào `check:contrast` để CI chặn                                                                                   |
| 2       | M4  | Nút hiện/ẩn mật khẩu vừa đổi nhãn vừa đổi `aria-pressed` (báo hai lần)                                                   | Giữ **một** nhãn cố định "Hiện mật khẩu" + `aria-pressed` (mẫu toggle button chuẩn)                                                                                                                                                                                 |
| 2       | M6  | `aria-disabled` trên `div` "Sắp có" không có role → bị bỏ qua                                                            | Bỏ `aria-disabled`; dùng `data-state="coming-soon"` làm móc test; chữ "Sắp có" giữ nguyên                                                                                                                                                                           |
| 2       | M10 | `title` của IconButton trùng `aria-label`                                                                                | Bỏ `title` mặc định; dùng `Tooltip` mới (hover + focus) khi cần                                                                                                                                                                                                     |
| 2       | N3  | `stroke="var(--surface-default)"` trong thuộc tính SVG có thể không chạy trên Safari                                     | Chuyển sang `style={{ stroke: 'var(--surface-default)' }}` hoặc lớp `stroke-surface`; kiểm trên WebKit                                                                                                                                                              |
| 3       | M2  | `Button.tsx` không `'use client'`; `<Button loading>` lỗi trong Server Component; `controlClasses` xuất từ module client | Tách `ui/styles.ts` (thuần, server-safe: `buttonClasses`, `controlClasses`); `Button`/`IconButton` vào file `'use client'`; `ButtonLink` server-safe; `index.ts` xuất như cũ (API không đổi)                                                                        |
| 3       | M3  | `variant="ghost"` khác nghĩa giữa `@/components/ui` (M0 → outlined) và `ui/index`                                        | Giữ ánh xạ M0 (tương thích), thêm JSDoc `@deprecated` cho wrapper ở `ui.tsx`, quy ước code mới import `@/components/ui/index`; lint `no-restricted-imports` (cấu hình ESLint có sẵn, không thêm package) cảnh báo import `Button`/`Card` từ đường cũ trong file mới |
| 4       | N1  | Test loading phụ thuộc cửa sổ 1.5 s                                                                                      | Kiểm "bấm lặp" trên nút **luôn loading** (như form); giữ kiểm 0 → 1 cho nút demo                                                                                                                                                                                    |
| 4       | N2  | Chưa test implicit submit (Enter trong ô nhập)                                                                           | Thêm ô nhập vào form loading; nhấn Enter trong ô → `data-submits` vẫn 0; sửa chú thích test                                                                                                                                                                         |
| 4       | N4  | Test id riêng chỉ phủ `Input`                                                                                            | Phủ cả `Textarea`, `PasswordInput` (kèm `aria-controls`), `SearchInput`                                                                                                                                                                                             |
| 4       | M13 | Selector còn rộng; test 320 px chỉ hàng đầu, so `y` tuyệt đối                                                            | `exact: true` ở mọi `getByRole(name)`; test 320 px kiểm **mọi** thẻ trong grid nằm trong biên, cùng hàng so với dung sai 1 px                                                                                                                                       |
| —       | M9  | Icon mint 2.13:1                                                                                                         | **Giữ nguyên** (icon trang trí, quyết định đã duyệt) — chỉ ghi nhận                                                                                                                                                                                                 |

## 3. File dự kiến thay đổi

| File                                                                                     | Thay đổi                                                                                                         |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/ui/Tabs.tsx` (mới)                                              | Tabs segmented/underline                                                                                         |
| `apps/web/src/components/ui/Progress.tsx` (mới)                                          | ProgressBar, ProgressRing                                                                                        |
| `apps/web/src/components/ui/Skeleton.tsx` (mới)                                          | Skeleton, SkeletonGroup, hook trì hoãn 300 ms                                                                    |
| `apps/web/src/components/ui/States.tsx` (mới)                                            | EmptyState, ErrorState                                                                                           |
| `apps/web/src/components/ui/Tooltip.tsx` (mới)                                           | Tooltip                                                                                                          |
| `apps/web/src/components/ui/PageHeader.tsx` (mới)                                        | PageHeader V2                                                                                                    |
| `apps/web/src/components/ui/styles.ts` (mới)                                             | `buttonClasses`, `controlClasses` (server-safe) — M2                                                             |
| `apps/web/src/components/ui/Button.tsx`, `Field.tsx`, `Card.tsx`                         | M2, M4, M6, M8, M10                                                                                              |
| `apps/web/src/components/ui/index.ts`                                                    | Xuất thêm component mới (tên cũ giữ nguyên)                                                                      |
| `apps/web/src/components/ui.tsx`                                                         | `PageHeader` re-export từ V2 (API giữ); JSDoc `@deprecated` cho wrapper M0 — M3                                  |
| `apps/web/src/components/icons.tsx`                                                      | N3; thêm icon cần cho EmptyState/ErrorState/Tooltip (nếu thiếu)                                                  |
| `apps/web/app/globals.css`                                                               | Keyframes shimmer / progress không xác định (có nhánh reduced-motion)                                            |
| `apps/web/app/lab/design/page.tsx`                                                       | Thêm mục gallery cho component mới; form loading có ô nhập (N2)                                                  |
| `apps/web/eslint.config.mjs`                                                             | `no-restricted-imports` (cảnh báo) — M3                                                                          |
| `scripts/check-contrast.mjs`                                                             | Cặp M8, Tabs (chữ tab chọn/không chọn), Tooltip (`fg.inverse`/`surface.inverse`), ProgressBar (fill/track ≥ 3:1) |
| `apps/web/e2e/ui2-primitives.spec.ts`                                                    | N1, N2, N4, M13, M4/M6 cập nhật assertion tương ứng                                                              |
| `apps/web/e2e/ui2b-primitives.spec.ts` (mới)                                             | Test component mới                                                                                               |
| `docs/design/COMPONENT_SPEC_V2.md`, `UI_MIGRATION_PLAN.md`, `docs/design/previews/ui2b/` | Trạng thái, ảnh duyệt                                                                                            |

**Ảnh hưởng tới màn hình M0:** chỉ qua `PageHeader` (cỡ chữ `h1` theo thang V2 — mọi trang có tiêu đề) và các thay đổi nhỏ của Button/Field. Kèm ảnh trước/sau.

## 4. Phương án triển khai (thứ tự commit)

1. **Dọn Minor + tách server/client (M2, M3, M4, M6, M8, M10, N3)** — không đổi giao diện ngoài các điểm đã nêu; chạy toàn bộ regression.
2. **Ổn định test UI-2 (N1, N2, N4, M13)** — kèm mutation check cho guard loading và liên kết id.
3. **Tabs + Tooltip** (tương tác bàn phím phức tạp nhất).
4. **ProgressBar/Ring + Skeleton** (ARIA + reduced-motion).
5. **EmptyState / ErrorState + PageHeader V2.**
6. Gallery, ảnh QC 320/390/768/1024/1440, tài liệu.

Mỗi bước một commit; một PR duy nhất `UI-2B` (nếu diff quá lớn, tách UI-2B-1 = bước 1–2, UI-2B-2 = bước 3–6 — sẽ báo trước).

## 5. Test plan

- **Regression (bắt buộc):** lint, typecheck, unit, build, `check:secrets`, `check:deps`, `check:contrast`, bundle secret scan, E2E Chromium/Firefox/WebKit × mobile/tablet/desktop, job Supabase/Auth; `failOnFlakyTests` giữ nguyên.
- **Tabs:** role/aria đầy đủ; ←/→ vòng, Home/End; chỉ tab chọn có `tabIndex=0`; panel liên kết `aria-controls`/`aria-labelledby`; cuộn ngang trong tablist ở 320 px, trang không cuộn ngang.
- **Tooltip:** hiện khi hover (thiết bị có hover) **và** khi focus bàn phím; `Esc` ẩn; `aria-describedby` trỏ đúng; không che nội dung khi ở mép màn hình 320 px.
- **ProgressBar/Ring:** `aria-valuenow/min/max` đúng, giá trị ngoài [0, max] bị kẹp; trạng thái không xác định có `aria-busy`; reduced-motion (Playwright `reducedMotion: 'reduce'`) → không animation, có chữ "Đang xử lý…".
- **Skeleton:** vùng chứa `aria-busy="true"` + nhãn ẩn; skeleton `aria-hidden`; không hiện nếu tải < 300 ms; shimmer tắt khi reduced-motion.
- **EmptyState/ErrorState:** heading đúng cấp; `coming-soon` không có nút; ErrorState sau thao tác có `role="alert"`; cấp trang focus nút "Thử lại".
- **PageHeader V2:** đúng một `h1` mỗi trang (kiểm trên mọi route M0); cỡ chữ theo breakpoint.
- **Minor:** M4 (tên nút cố định + `aria-pressed`), M6 (không còn `aria-disabled` trên div), M8 (cặp mới trong CI), M10 (không `title`), N3 (nét trắng hiển thị trên WebKit — so pixel vùng icon), M2 (build có một Server Component render `ButtonLink` + dùng `buttonClasses`), N1/N2/N4/M13.
- **axe-core** WCAG 2.2 A/AA trên gallery: 0 serious/critical. Vùng chạm ≥ 44, tên truy cập cho mọi control (mở rộng test hiện có cho component mới).
- **Mutation check thủ công** (ghi kết quả trong PR): gỡ xử lý phím Tabs / `Esc` Tooltip / guard loading → test tương ứng phải FAIL, rồi khôi phục.
- **Ảnh QC:** gallery 320/390/768/1024/1440; trạng thái (hover, focus, selected, disabled, loading, reduced-motion); màn hình M0 trước/sau (PageHeader).

## 6. Acceptance criteria

1. Đủ 8 component mục 2A với mọi biến thể/trạng thái trong gallery `/lab/design`, dữ liệu ghi "Ví dụ"; không số liệu giả trên màn hình thật.
2. Minor M2, M3, M4, M6, M8, M10, N1–N4, M13 đã xử lý theo bảng 2B; M9 giữ nguyên có ghi nhận.
3. `check:contrast` thêm cặp mới, 100% đạt WCAG 2.2 AA; axe 0 serious/critical; vùng chạm ≥ 44; mọi control có tên truy cập; điều hướng bàn phím đầy đủ (Tabs, Tooltip).
4. Không cuộn ngang ở 320 px trên gallery và mọi route M0.
5. CI xanh trên Chromium, Firefox, WebKit (không flaky), job Supabase/Auth xanh, Vercel Preview xanh.
6. Không đổi Auth/API/DB/RLS/SW/offline/sync/logic nghiệp vụ; không thêm dependency; không đổi logo, typography, màu thương hiệu, Study Card.
7. Reviewer độc lập: 0 Critical, 0 Important còn mở.
8. Ảnh QC + báo cáo khác biệt với mockup; tài liệu cập nhật.

## 7. Ngoài phạm vi UI-2B

Dialog/Sheet, Toast, Offline/Sync Indicator (UI-4) · Shell, Sidebar, BottomNav (UI-3) · Màn hình M0 (UI-5) · Dark mode (UI-6) · Logo/favicon/PWA (UI-7B) · FU-7 (issue #6) · M1.
