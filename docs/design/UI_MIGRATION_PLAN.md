# Kế hoạch chuyển sang Design System V2

Trạng thái: **ĐÃ DUYỆT 2026-11-24** (D-039). **Chưa triển khai.** Thứ tự đã chốt: nghiệm thu + merge PR #2 (`docs/M0_PWA_ACCEPTANCE.md`) → PR UI-1 … UI-5 từ nhánh mới tạo từ `main` → M1. Không bắt đầu M1 trong khi làm UI.

## 1. Hiện trạng frontend (kiểm tra 2026-11-24, `apps/web`)

- Stack: Next.js 16 App Router, React 19, Tailwind 4 (`@theme` trong `app/globals.css`), không thư viện UI, icon SVG nội tuyến.
- Token M0: `paper`, `paper-2`, `ink`, `ink-2`, `line`, `seal` (đỏ gạch), `jade`, `amber`, `sky`; dark mode qua `prefers-color-scheme`; font hệ thống + `Noto Serif SC` cho chữ Hán.
- Số lần dùng lớp màu M0: `ink` 38, `ink-2` 36, `seal` 21, `paper` 20, `line` 20, `paper-2` 7, `amber` 7, `jade` 4, `sky` 3. `seal` mang **hai nghĩa**: màu thương hiệu (logo, nút chính, mục đang chọn) **và** lỗi (chấm "lỗi đồng bộ", StatusBadge BLOCKED) → không thể đổi tên hàng loạt; phải thay theo ý nghĩa.
- 37 `data-testid` được E2E dùng; layout test dựa vào `nav-bottom` / `nav-rail` / `nav-sidebar` và breakpoint 768/1280 trong `e2e/helpers.ts › deviceClass`.
- Service worker cache `/_next/static/*` (font tự host qua `next/font` nằm ở đây → offline vẫn có font sau lần tải đầu).

| File                                                                             | Tái dùng                                                 | Thay/đổi                                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/components/ui.tsx` (`PageHeader`, `Card`, `Button`, `Mono`)                 | API (props) giữ                                          | Tách thành `components/ui/*`, style V2                                      |
| `src/components/AppShell.tsx`                                                    | Logic `isActive`, `SyncChip` (G1), `CompatibilityNotice` | Viết lại khung: Sidebar (mở rộng/thu gọn), BottomNav + sheet _Thêm_, TopBar |
| `src/components/StatusBadge.tsx`                                                 | Mapping trạng thái, `data-status`                        | Dựa trên Badge mới                                                          |
| `src/components/HandwritingCanvas.tsx`                                           | **Toàn bộ logic** (Pointer Events, DPR, nét)             | Chỉ màu nét/lưới lấy từ token                                               |
| `src/components/icons.tsx`                                                       | Giữ, mở rộng                                             | Thêm icon (Thêm, Thoát, Hiện mật khẩu, …)                                   |
| `OfflineProvider`, `PwaProvider`, `src/offline/*`, `src/platform/*`, `src/lib/*` | **Không đổi**                                            | —                                                                           |
| `app/**/page.tsx`                                                                | Nội dung, testid, luồng                                  | Bố cục + component V2; bỏ dữ liệu mẫu ở `/dictionary`                       |

## 2. Mapping token M0 → V2

| M0                                                    | V2                                            | Ghi chú                        |
| ----------------------------------------------------- | --------------------------------------------- | ------------------------------ |
| `bg-paper`                                            | `bg-page`                                     | Nền trang                      |
| `bg-paper-2`, `bg-paper-2/60`                         | `bg-surface` (card) hoặc `bg-subtle` (nhóm)   | Theo ngữ cảnh                  |
| `text-ink`                                            | `text-fg`                                     |                                |
| `text-ink-2`                                          | `text-fg-muted`                               |                                |
| `border-line`, `divide-line`                          | `border-default`                              | Viền control → `border-strong` |
| `bg-seal text-seal-ink` (nút, logo)                   | `bg-primary text-on-primary`                  | **Theo nghĩa thương hiệu**     |
| `text-seal` (mục chọn, link)                          | `text-primary` / `aria-current` style         |                                |
| `bg-seal` (chấm lỗi đồng bộ), `border-seal` (BLOCKED) | `bg-error` / `border-error`                   | **Theo nghĩa lỗi**             |
| `jade`                                                | `success`                                     |                                |
| `amber`                                               | `warning`                                     |                                |
| `sky` (focus, LIVE)                                   | `border-focus` / `primary`                    |                                |
| `.hanzi` (serif)                                      | `font-hanzi` + `HanziText` (`lang="zh-Hans"`) |                                |

Cách làm: PR-1 thêm token V2 **song song**; giữ tên M0 làm alias trỏ tới giá trị V2 tương ứng (trừ `seal`), thay `seal` theo nghĩa ngay trong PR-1 (21 chỗ, review từng chỗ); các PR sau thay dần alias bằng tên V2; PR cuối xóa alias. Như vậy mỗi PR nhỏ và app luôn hiển thị nhất quán.

## 3. Cấu trúc file đề xuất

```text
apps/web/
  app/
    globals.css                 # @import tokens + @theme inline (ánh xạ Tailwind), base styles
    layout.tsx                  # next/font (Inter, Noto Sans SC), script theme trước khi vẽ
    lab/design/page.tsx         # Component gallery (Phòng thử, dữ liệu "Ví dụ") — mục tiêu visual test
  src/
    design/
      tokens.css                # Biến runtime light/dark (nguồn sự thật)
      theme.ts                  # Đọc/ghi lựa chọn theme (try/catch localStorage)
    components/
      ui/                       # Button, IconButton, Input, PasswordInput, Search, Tabs, Card, Badge,
                                # ProgressBar, ProgressRing, Dialog, Sheet, Toast, Skeleton,
                                # EmptyState, ErrorState, Tooltip, PageHeader, index.ts
      shell/                    # AppShell, Sidebar, BottomNav, MoreSheet, TopBar, SyncIndicator,
                                # OfflineBanner, CompatibilityNotice
      learning/                 # HanziText, Pinyin, Flashcard, StreakIndicator, AnswerOption
      HandwritingCanvas.tsx     # giữ vị trí (import ổn định)
      StatusBadge.tsx           # giữ vị trí, dùng ui/Badge
      icons.tsx
scripts/check-contrast.mjs      # Kiểm WCAG các cặp token khai báo, chạy trong CI
```

`ui.tsx` cũ giữ làm file re-export trong giai đoạn chuyển tiếp để không phải sửa mọi import cùng lúc.

## 4. Chuỗi PR (nhỏ, review được, mỗi PR xanh CI riêng)

| PR                                                                       | Nội dung                                                                                                                                                                                                                                                                      | Không đụng                                                                 | Kiểm thử bắt buộc                                                                                     | Kích thước ước tính         |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- |
| **PR-1 Tokens & fonts (Light)**                                          | `tokens.css` (Light; token Dark để PR-6), `@theme inline`, alias M0, thay `seal` theo nghĩa, Inter + Noto Sans SC qua `next/font`, `HanziText`/`Pinyin`, `themeColor`, `scripts/check-contrast.mjs` + bước CI                                                                 | Bố cục, điều hướng, logic                                                  | Toàn bộ E2E hiện có; test glyph pinyin trên 3 engine; contrast CI; so sánh bundle/font với budget     | ~10 file                    |
| **PR-2 Primitives**                                                      | `components/ui/*` (Button, IconButton, Input, PasswordInput, Search, Tabs, Card, Badge, ProgressBar/Ring, Skeleton, Empty/ErrorState, Tooltip, PageHeader), `StatusBadge` dựa trên Badge, trang `/lab/design`                                                                 | Shell, trang nghiệp vụ                                                     | Unit component (mục 6), a11y tự động trên `/lab/design`, screenshot gallery                           | ~20 file nhỏ                |
| **PR-3 Shell & breakpoint**                                              | Sidebar (mở rộng/thu gọn, lưu lựa chọn), BottomNav + MoreSheet, TopBar, chế độ tập trung (hook), breakpoint 768/1024 (D-039), Phòng thử chuyển vào _Thêm_; cập nhật `deviceClass`, `layout.spec.ts`; thêm viewport 320×568, 844×390, 1024×768                                 | Trang nghiệp vụ                                                            | Layout E2E 3 engine × 6 viewport, không cuộn ngang, điều hướng bàn phím, sheet đóng bằng Esc/Back     | ~10 file                    |
| **PR-4 Trạng thái & phản hồi**                                           | SyncIndicator (logic G1 giữ nguyên, testid giữ), OfflineBanner/Offline State, Toast (vùng live), Dialog/Sheet (`<dialog>`)                                                                                                                                                    | Logic offline/sync                                                         | `offline.spec.ts` nguyên vẹn; test toast/dialog a11y; test chuỗi chữ sync                             | ~8 file                     |
| **PR-5 Màn hình M0**                                                     | Hôm nay (Empty State trung thực + Đồng bộ + Phòng thử), Luyện tập/Từ điển/Thư viện dạng `coming-soon` (bỏ dữ liệu mẫu ở Từ điển), `/lab/session` dùng Password Input, `/lab/upload` File Upload V2, `/lab/audio` Audio Recorder V2, `/lab/handwriting` khung canvas V2, Hồ sơ | Auth (`auth-password.ts`), API client, offline, canvas logic, AudioContext | Toàn bộ E2E (handwriting, audio, upload, offline, auth-invite-only) 3 engine; screenshot các màn hình | ~12 file, có thể tách 5a/5b |
| **PR-6 Dark mode & cài đặt** (giai đoạn riêng, sau khi Light hoàn thiện) | Kích hoạt token Dark, bộ chọn Sáng/Tối/Hệ thống, script đặt theme trước khi vẽ, trang Cài đặt tối thiểu, kiểm AA dark trên component thật                                                                                                                                     | —                                                                          | Không nháy màu (screenshot ngay sau tải), dark mode screenshots                                       | ~5 file                     |
| **PR-7 Logo/icon** (chỉ sau khi chủ dự án chọn một phương án đã trình)   | Favicon, PWA icons, manifest                                                                                                                                                                                                                                                  | —                                                                          | Manifest hợp lệ, `pwa.spec.ts`                                                                        | tài nguyên                  |
| **PR-8 Dọn dẹp**                                                         | Xóa alias M0, `ui.tsx` re-export, CSS chết                                                                                                                                                                                                                                    | —                                                                          | Toàn bộ CI                                                                                            | nhỏ                         |

Mỗi PR: mô tả "trước/sau" bằng ảnh 3 viewport (light + dark khi có), danh sách testid bị ảnh hưởng (mục tiêu: 0 testid bị đổi tên), bundle size so với trước.

## 5. Làm được trước M1 / phải chờ backend

| Trước M1 (sau khi duyệt tài liệu)                   | Chờ M1+                                                                                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-1 → PR-8 ở trên                                  | `/login` route + cổng xác thực, cookie session, màn hình đổi mật khẩu bắt buộc, "chưa được cấp quyền", Đổi mật khẩu trong Hồ sơ, Đăng xuất xóa dữ liệu cục bộ (**M1**) |
| Restyle form đăng nhập ở `/lab/session`             | Dashboard có dữ liệu thật: thẻ đến hạn, mục tiêu ngày (**M3**); từ mới (**M2**)                                                                                        |
| Empty State `coming-soon` cho mọi tính năng chưa có | Từ điển, Thư viện khóa học (**M2**); nhập PDF xử lý (**M4**)                                                                                                           |
| Component gallery với dữ liệu ghi rõ "Ví dụ"        | Phiên flashcard/quiz thật (**M3**); luyện viết có chấm (**M5**); nói/nghe (**M6**)                                                                                     |
| Cài đặt giao diện (theme, phím tắt)                 | Streak, XP, nhắc học, gia sư AI (**M7**)                                                                                                                               |

## 6. Kiểm thử

**Regression (bắt buộc mỗi PR):** lint, typecheck, unit, build, `check:secrets`, `check:deps`, E2E Chromium/Firefox/WebKit × viewport (giữ `failOnFlakyTests`), job database + Auth thật (không bị UI ảnh hưởng nhưng vẫn chạy).

**Visual testing:**

- Playwright `toHaveScreenshot` trên **Chromium** cho `/lab/design` (gallery) và các màn hình chính ở 390 / 820 / 1440 (light + dark). Ảnh chuẩn sinh **trong CI Linux** (font render khác nhau giữa hệ điều hành) và commit vào repo; cập nhật ảnh chuẩn chỉ qua commit riêng có ghi chú lý do. Ngưỡng `maxDiffPixelRatio` 0.01; tắt animation (`animations: 'disabled'`) và che vùng động (giờ, số chờ đồng bộ).
- Firefox/WebKit: không so pixel (khác biệt render hợp lệ), chỉ kiểm bố cục (không cuộn ngang, phần tử hiển thị đúng, kích thước vùng chạm).

**Accessibility tự động:** axe-core qua `@axe-core/playwright` (**dev dependency mới — cần duyệt**) trên gallery và từng màn hình; không có vi phạm mức `serious`/`critical`. Contrast token kiểm bằng `scripts/check-contrast.mjs` (không cần dependency).

**Unit component:** kiểm thuộc tính a11y (role, aria-*) bằng render React sang DOM trong vitest (`react-dom/client` + `happy-dom`/`jsdom` — **nếu cần thêm dev dependency sẽ xin duyệt**; phương án không thêm: kiểm qua Playwright component trong gallery).

**Responsive QC thủ công** (mỗi đợt PR-3, PR-5): mở rộng `docs/SMOKE_TEST.md` với mục giao diện: iPhone Safari (dọc/ngang, bàn phím trên form đăng nhập, safe-area), Android Chrome, iPad/tablet, desktop Chrome/Edge/Firefox/Safari; zoom 200%; VoiceOver/TalkBack đọc điều hướng; dark mode hệ thống.

**Hiệu năng (D-032):** đo JS/route (P10 ≤ 200 KB gzip) và font: Latin ≤ ~100 KB tải lần đầu (Inter variable, subset); CJK theo lát cần dùng; LCP không xấu hơn baseline; CLS ≤ 0.1 (font `size-adjust`).

## 7. Rủi ro và biện pháp

| Rủi ro                                                                                                                      | Ảnh hưởng                               | Biện pháp                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth:** đổi markup form đăng nhập làm mất testid/thuộc tính `autocomplete` → trình quản lý mật khẩu không điền, test hỏng | Không đăng nhập được trên thiết bị thật | Giữ nguyên `auth-password.ts`, testid, `name`/`autocomplete`; `auth-invite-only.spec.ts` phải xanh; smoke A12–A12d sau PR-5           |
| **Auth:** dữ liệu mật khẩu lọt vào state lâu hơn (Password Input hiện/ẩn)                                                   | Bảo mật                                 | Xóa giá trị sau gửi (như M0), không log; E2E kiểm storage giữ nguyên                                                                  |
| **API:** component mới gọi API khác cách cũ                                                                                 | Hành vi sai                             | Không đổi `api-client.ts`; component chỉ nhận dữ liệu qua props                                                                       |
| **Offline:** SyncIndicator hiển thị "đã đồng bộ" sai                                                                        | Mất dữ liệu (người dùng tưởng đã lưu)   | Giữ nguyên logic G1 trong hook, chỉ đổi giao diện; `offline.spec.ts` + test chuỗi chữ                                                 |
| **Offline:** font chưa cache khi offline lần đầu                                                                            | Chữ dùng font dự phòng                  | Fallback stack đầy đủ; SW đã cache `/_next/static/`; chấp nhận được                                                                   |
| **Browser API — Audio:** bọc nút ghi trong component làm `AudioContext` bị tạo sau `await`                                  | Firefox/Safari không ghi âm             | Handler `onClick` gọi thẳng hàm hiện có; `audio.spec.ts` trên Firefox với PulseAudio                                                  |
| **Browser API — Canvas:** đổi kích thước khung/`touch-action`                                                               | Cuộn trang khi viết, sai tọa độ         | Không sửa `HandwritingCanvas.tsx` ngoài màu; `handwriting.spec.ts` 3 engine; kiểm tay B3                                              |
| **Browser API — File:** vùng thả mới che input file                                                                         | Không chọn được tệp trên iOS            | Dùng `<label for>` + input thật; `upload.spec.ts`; kiểm tay B7                                                                        |
| **`<dialog>`**: khác biệt nhỏ giữa trình duyệt (focus, scroll lock)                                                         | A11y                                    | Test Esc/focus trả về trên 3 engine; không dùng `popover` cho chức năng chính                                                         |
| **Breakpoint mới** làm test layout và ảnh chuẩn đổi đồng loạt                                                               | PR lớn khó review                       | Tách PR-3 riêng, chỉ đổi shell + test layout                                                                                          |
| **Theme script inline** xung đột CSP sau này                                                                                | Chặn script                             | Script nhỏ có hash/nonce khi thêm CSP (M8); hoặc chấp nhận nháy và chỉ dùng `prefers-color-scheme`                                    |
| **Font CJK lớn**                                                                                                            | Chậm trên 4G                            | `preload: false`, lát `unicode-range`; đo P-metrics; phương án dự phòng: font hệ thống cho văn bản dài, web font cho chữ hiển thị lớn |
| **Glyph Nhật thay vì Trung**                                                                                                | Sai hình chữ khi học                    | `HanziText` bắt buộc + lint rule/grep trong CI: không render chữ Hán ngoài `HanziText` (kiểm tra đơn giản bằng regex trong test)      |

## 8. Tiêu chí nghiệm thu từng giai đoạn

| Giai đoạn    | Tiêu chí                                                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tài liệu** | ✅ Đã duyệt 2026-11-24 (D-039, mục 10)                                                                                                                                                   |
| PR-1         | Contrast CI 100% đạt; pinyin hiển thị đúng trên 3 engine; E2E xanh không sửa test; font ≤ budget; không còn chỗ dùng `seal` cho lỗi                                                      |
| PR-2         | Gallery hiển thị đủ variant/state; axe 0 lỗi serious/critical; mọi nút có tên truy cập; vùng chạm ≥ 44                                                                                   |
| PR-3         | Điều hướng đúng ở 6 viewport × 3 engine; không cuộn ngang ở 320; Tab/Shift+Tab đi hết điều hướng; sheet _Thêm_ đóng bằng Esc/Back; lựa chọn thu gọn sidebar được nhớ                     |
| PR-4         | Chuỗi trạng thái đồng bộ giữ nguyên G1; toast không cướp focus; dialog trả focus                                                                                                         |
| PR-5         | Mọi E2E nghiệp vụ M0 xanh không đổi testid; không có dữ liệu mẫu trông như thật ngoài gallery; smoke test thủ công (Safari iPhone + 1 desktop) cho đăng nhập, viết, ghi âm, PDF, offline |
| PR-6         | Không nháy màu khi tải; dark mode đạt contrast; lựa chọn theme được nhớ, lỗi storage không làm hỏng trang                                                                                |
| Toàn bộ      | Báo cáo trước/sau (ảnh 3 viewport, light/dark), số đo hiệu năng so baseline, danh sách giới hạn còn lại                                                                                  |

## 9. Ước lượng

PR-1 → PR-6: khoảng 6 PR nhỏ, mỗi PR một vòng review; PR-3 và PR-5 rủi ro cao nhất (layout test, browser API). Thời gian phụ thuộc tốc độ duyệt; không chạy song song với M1 trên cùng file shell để tránh xung đột.

## 10. Quyết định đã chốt (chủ dự án, 2026-11-24 — D-039)

| #   | Câu hỏi              | Quyết định                                                                                                                              | Ảnh hưởng kế hoạch                                                                           |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Bộ màu đã điều chỉnh | Duyệt (`#335DFF` cho chữ và CTA)                                                                                                        | PR UI-1; kiểm AA trên component thật (axe + contrast CI)                                     |
| 2   | Breakpoint 768/1024  | Duyệt                                                                                                                                   | PR UI-3                                                                                      |
| 3   | Font                 | Inter + Noto Sans SC, subset phù hợp                                                                                                    | PR UI-1; test tiếng Việt/pinyin/Hanzi                                                        |
| 4   | Dark mode            | Hỗ trợ, nhưng **Light trước**; Dark là giai đoạn riêng                                                                                  | PR UI-1 chỉ bật token Light (`color-scheme: light`); PR UI-6 = Dark mode + bộ chọn giao diện |
| 5   | Logo                 | Nghiên cứu hướng xanh, **trình phương án**; không tự thay                                                                               | PR UI-7 chỉ làm sau khi chọn phương án                                                       |
| 6   | Phòng thử M0         | Vào menu _Thêm_, vẫn truy cập được                                                                                                      | PR UI-3                                                                                      |
| 7   | Dev dependency       | `@axe-core/playwright` được duyệt. `happy-dom`/`jsdom` **chưa** được duyệt → unit test component kiểm qua Playwright trên `/lab/design` | PR UI-2                                                                                      |
| 8   | Chiến lược nhánh     | **Merge PR #2 trước**, PR UI tạo từ `main`                                                                                              | Không xếp chồng lên `claude/m0-pwa`                                                          |
| 9   | Thứ tự với M1        | UI Foundation + M0 Visual Refresh **trước** M1                                                                                          | PR UI-1 → UI-5 trước M1; UI-6 (Dark), UI-7 (logo), UI-8 (dọn dẹp) có thể sau                 |

Quy tắc cho mọi PR UI: phạm vi rõ, checklist QC (mục 8) và kết quả kiểm thử trong mô tả PR; giữ `data-testid`; không đổi Auth (D-037/D-038), API, Railway, Supabase, database, RLS; không merge/deploy thay đổi lớn khi chưa duyệt.

## 11. Trạng thái triển khai

### UI-1 — Tokens & fonts (Light) · PR #3 · đã merge

- `apps/web/src/design/tokens.css`: token semantic Light (nguồn duy nhất); `app/globals.css`: ánh xạ `@theme inline` (`bg-page`, `bg-surface`, `text-fg-muted`, `bg-primary`, `text-link`, `border-line-strong`, `bg-error`, …), alias tạm cho tên M0 (`paper`, `paper-2`, `ink`, `ink-2`, `line`, `jade`, `amber`, `sky`), focus ring 2 px, `prefers-reduced-motion`.
- `seal` (21 chỗ) thay theo nghĩa: thương hiệu → `primary*`, lỗi (chấm lỗi đồng bộ, BLOCKED, khả năng cốt lõi thiếu) → `error*`, logo → token `logo` **giữ nguyên màu cũ** (logo chưa được duyệt thay — D-039 quyết định 6).
- Font: Inter (preload `latin` + `vietnamese` ≈ 58 KB; `latin-ext` cho dấu thanh pinyin tải theo nhu cầu) + Noto Sans SC (lát `unicode-range`, không preload) qua `next/font` — tự host, không gọi Google lúc chạy. `HanziText`/`Pinyin`; mọi chữ Hán trên trang có `lang="zh-Hans"`.
- CI: `pnpm check:contrast` (44 cặp, đọc giá trị thật từ `tokens.css`), quét bundle trình duyệt với giá trị mồi (`scripts/check-bundle-secrets.mjs`).
- E2E mới: `typography.spec.ts` (glyph tiếng Việt/pinyin/Hanzi do đúng font đã tải, font tự host, `lang` cho chữ Hán), `ui1-viewports.spec.ts` (320/390/768/1024/1440: điều hướng không đổi, không cuộn ngang, token V2 có hiệu lực).

### UI-2 — Component primitives · PR #5 · **Completed** (merge `5b583ca`, 2026-11-24)

- PR #5 (nhánh `feat/ui-2-component-primitives`, HEAD cuối `01b6ac6`), merge squash vào `main` = `5b583ca` (cây mã giống hệt `01b6ac6`).
- CI PR (run 45485379874, HEAD `01b6ac6`): 7/7 xanh — E2E Chromium 168 pass / 27 skip, Firefox 168 / 27, WebKit 164 / 31 (skip theo engine), auth ×5 120/120 mỗi engine; Supabase/Auth, build, bundle secret scan, Vercel Preview xanh.
- CI `main` sau merge (run 45486981038, `5b583ca`): Build/Lint/Typecheck/Test, Supabase/Auth, Expo xanh; **E2E Chromium đỏ** vì `upload.spec.ts:33` lỗi lần đầu rồi đạt khi chạy lại (1 flaky, 167 pass, 27 skip; `failOnFlakyTests` tính là thất bại) → FU-7, issue #6. E2E Firefox (168 pass / 27 skip; auth ×5 120/120) và WebKit (164 pass / 31 skip; auth ×5 120/120) xanh. Vercel Production deploy `5b583ca`: success.
- Reviewer độc lập: lần 1 (`119ea87`) 0 Critical / 4 Important / 13 Minor; 4 Important (I1 id field, I2 focus tìm kiếm, I3 test loading không thể fail — kèm mutation test, I4 transition) sửa ở `01b6ac6`; lần 2 xác nhận FIXED, 0 Critical / 0 Important. Minor còn mở chuyển sang UI-2B (`docs/design/UI2B_PLAN.md`).
- Study Card chốt **Blue / Lavender / Mint** ("Nghe hiểu" = lavender `#F0EAFE`, icon `#8259DD`).

- `src/components/ui/`:
  - `Button` (primary / secondary / ghost / danger / success; sm 36 có vùng chạm 44, md 44, lg 52; hover, focus-visible, disabled, loading có spinner + `aria-busy` + chặn bấm lặp), `ButtonLink`, `IconButton` (bắt buộc `aria-label`).
  - `Card` (default / subtle / highlight, có `title`, `action`, `footer`), `CardLink` (cả card là một link), **`StudyCard`** (pastel xanh / lavender / mint — "Nghe hiểu" = lavender theo quyết định của chủ dự án; chỉ nhận số liệu thật qua `meta`, tính năng chưa có dùng `comingSoon` → nhãn "Sắp có", không bấm được).
  - `Badge` (7 biến thể), `CountBadge`, `StatusDot` (chỉ báo trạng thái chấm + chữ); `StatusBadge` dùng cùng token (giữ `role`, `data-status`, chữ của M0).
  - Form: `Input`, `Textarea`, `PasswordInput` (hiện/ẩn, `aria-pressed`), `SearchInput` (pill 48, nút xóa, `Esc`); nhãn luôn hiển thị, gợi ý/lỗi nối bằng `aria-describedby`, lỗi có `aria-invalid`.
- `ui.tsx` giữ API M0 (`Card title`, `Button variant="ghost"` → `secondary`) nên các màn hình M0 không phải sửa.
- Token mới: `--study-*` (6 màu) và thang bo góc `rounded-control/card/panel/sheet` (12/16/20/24 — đóng FU-6). `check:contrast` thêm 18 cặp (62 cặp).
- Trang gallery `/lab/design` (dữ liệu ghi rõ "Ví dụ"); E2E `ui2-primitives.spec.ts`: axe (WCAG 2.2 A/AA, 0 lỗi serious/critical), không cuộn ngang ở 320 px, vùng chạm ≥ 44, tên truy cập, focus ring, loading, form a11y, mật khẩu, tìm kiếm, Study Card. `@axe-core/playwright` (dev dependency, đã duyệt D-039 quyết định 7).
- Chưa làm trong UI-2 (đề xuất UI-2b): Tabs, Progress Bar/Ring, Skeleton, Empty/Error State, Tooltip, PageHeader V2.
- Ảnh duyệt: `docs/design/previews/ui2/`.

### UI-2B — Kế hoạch đã duyệt (issue #6) · triển khai ở PR #9

Xem `docs/design/UI2B_PLAN.md` (Tabs, ProgressBar/Ring, Skeleton, EmptyState/ErrorState, Tooltip, PageHeader V2 + Minor của UI-2). Báo cáo triển khai: `docs/design/UI2B_REPORT.md` (PR #9).

### UI-3 — Shell & breakpoint · nhánh `feat/ui-3-shell`

Breakpoint D-039:

- phone < 768: top bar + bottom nav 5 mục, có sheet "Thêm";
- tablet 768–1023: sidebar thu gọn;
- desktop ≥ 1024: sidebar thu gọn ở 1024–1279, mở rộng từ 1280, người dùng đổi được và lựa chọn được ghi nhớ.

Thêm Sheet trên `<dialog>`. Đã sửa FU-1 (tràn ngang 320 px). Thêm project E2E 320×568, 844×390, 1024×768. Chi tiết: `docs/design/UI3_REPORT.md`.

### UI-4 — Trạng thái & phản hồi · nhánh `feat/ui-4-feedback`

- **Sync Indicator:** logic G1 và testid giữ nguyên, thêm popover "Đồng bộ ngay".
- **Offline banner:** lời nhắn trung thực theo trạng thái sync.
- **Toast:** vùng `aria-live`, không lấy focus.
- **Dialog:** dựa trên Sheet / `<dialog>`.

Chi tiết: `docs/design/UI4_REPORT.md`.

### UI-5 — Các màn M0 trên V2 · nhánh `feat/ui-5a-learning-screens`

- **Màn học:** trang chủ, luyện tập, từ điển, thư viện, hồ sơ — nội dung trung thực, không số liệu giả.
- **Màn Lab:** đăng nhập, tải PDF, viết tay, ghi âm theo §21–§23; X1 giữ nguyên.

Chi tiết: `docs/design/UI5_REPORT.md`.

### UI-6 — Dark mode · nhánh `feat/ui-6-dark`

- **Token Dark** đã kích hoạt (theo hệ thống / Sáng / Tối trong Hồ sơ & cài đặt), không nháy màu.
- **CI** kiểm AA cho 80 cặp ở cả hai theme; axe ở chế độ tối trên 12 trang.

Chi tiết: `docs/design/UI6_REPORT.md`.

### UI-7B — Logo, favicon, icon PWA · nhánh `feat/ui-7b-brand`

- **Logo:** biểu tượng raster đã duyệt (D-041), đổi Light/Dark theo theme.
- **Lockup:** chữ thật Nunito.
- **Icon:** favicon 16/32/48 và `.ico`; icon PWA any/maskable 192/512.
- **Service worker:** `m0-pwa-3`.

Chi tiết: `docs/design/UI7B_REPORT.md`.

### UI-8 — Dọn dẹp · nhánh `feat/ui-8-cleanup`

- **Alias M0:** đã xóa alias màu M0 (FU-4).
- **API M0:** đã bỏ entry `ui.tsx`; `@/components/ui` = V2.
- **FU-2:** `offline.html` có chế độ tối và nội dung trung thực.

Chi tiết: `docs/design/UI8_REPORT.md`.

### Follow-up phát hiện trong UI-1 (không sửa — ngoài phạm vi)

| ID   | Vấn đề                                                                                                                                                                                                         | Đề xuất                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| FU-1 | **Đã sửa ở UI-3.** Tràn ngang ở 320 px **có từ M0** (đo trên `main`): `/lab` 23 px (bảng khả năng), `/lab/offline` 73 px (khối trạng thái; V2 giảm còn 59 px); `/lab/session` 93 px khi chưa cấu hình Supabase | Sửa trong UI-3/UI-5 (`min-w-0`, xuống dòng chuỗi dài)   |
| FU-2 | `public/offline.html` đã đổi màu V2 nhưng thiết bị đã cài giữ bản cũ trong cache của service worker tới lần đổi phiên bản SW; câu "Dữ liệu học chưa gửi sẽ tự đồng bộ khi có mạng" chưa đúng khi sync đang tắt | **Đã sửa ở UI-8** (SW `m0-pwa-4`)                       |
| FU-3 | M0 có dark mode theo hệ thống; UI-1 chỉ Light → người dùng đặt hệ điều hành ở chế độ tối thấy giao diện sáng (đã chấp nhận, D-039 quyết định 5)                                                                | **Đã làm ở UI-6**                                       |
| FU-4 | Alias token M0 còn trong code                                                                                                                                                                                  | **Đã xong ở UI-8**                                      |
| FU-5 | Chữ Hán trong nội dung người dùng nhập (ghi chú offline) và placeholder `Ví dụ: 山 = núi` không gắn `lang` theo đoạn                                                                                           | Tách đoạn tự động khi làm Input/HanziText ở UI-2+       |
| FU-6 | Thang radius V2 (12/16/20/24) chưa áp vào thang Tailwind (giữ để không đổi hình logo/thành phần)                                                                                                               | **Đã xong ở UI-2** (`rounded-control/card/panel/sheet`) |
| FU-7 | E2E upload kéo-thả lỗi không ổn định — nguyên nhân gốc: 429 của bộ giới hạn IP thiếu CORS (trình duyệt báo "không kết nối được") + mọi trình duyệt E2E chung IP 127.0.0.1 dưới mức 300/phút                    | **Đã sửa** — PR #12 (merge `c759a76`), issue #6 đã đóng |
