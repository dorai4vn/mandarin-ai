# Screen blueprints V2

Trạng thái: **ĐÃ DUYỆT 2026-11-24** (D-039) — chưa triển khai code. Wireframe là cấu trúc, không phải pixel. Component: `COMPONENT_SPEC_V2.md`.

**Ký hiệu phạm vi:** **[M0]** có trong code hiện tại (chỉ đổi giao diện) · **[M1]**, **[M2]**… thuộc milestone sau, chưa phát triển — chỉ thiết kế, **không làm giả** (không dữ liệu mẫu trông như thật, không nút không hoạt động trừ khi ghi rõ "Ra mắt ở Mx").
Nguồn milestone: `MILESTONES_CLAUDE_CODE.md`, `FEATURES.md` (từ vựng/thư viện M2, quiz + SRS M3, nhập PDF M4, viết tay M5, nghe/nói M6, gia sư AI + XP + nhắc học M7).

---

## 1. Đăng nhập (Invite Only, email + mật khẩu — D-037, D-038)

**Hiện trạng:** **[M0]** form ở `/lab/session` (`signInWithPassword`, lỗi chung, không đăng ký). **[M1]** route `/login` riêng + cổng xác thực toàn app, cookie session, màn hình bắt buộc đổi mật khẩu, màn hình "chưa được cấp quyền", đổi mật khẩu trong Hồ sơ.

**IA:** Logo + tên → tiêu đề "Đăng nhập" → mô tả riêng tư → Email → Mật khẩu (Password Input) → nút Đăng nhập → ghi chú "Chưa có tài khoản? Liên hệ chủ ứng dụng. Quên mật khẩu: nhờ quản trị viên cấp mật khẩu tạm." Không có link Đăng ký, không có "Quên mật khẩu?" tự phục vụ (tạm hoãn tới khi có SMTP).

```text
Desktop ≥1024 (không có sidebar khi chưa đăng nhập — M1)      Mobile 320–767
┌───────────────────────────┬──────────────────────────┐     ┌──────────────────────┐
│ [学] Mandarin AI          │                          │     │ [学] Mandarin AI     │
│                           │   Đăng nhập              │     │                      │
│  学 (hanzi.hero, mờ,      │   Ứng dụng riêng tư —    │     │ Đăng nhập            │
│   minh họa nét)           │   chỉ tài khoản được cấp │     │ Ứng dụng riêng tư…   │
│                           │   ┌──────────────────┐   │     │ ┌──────────────────┐ │
│  "Học tiếng Trung mỗi     │   │ Email            │   │     │ │ Email            │ │
│   ngày, theo nhịp của     │   └──────────────────┘   │     │ └──────────────────┘ │
│   bạn."                   │   ┌──────────────┬───┐   │     │ ┌──────────────┬───┐ │
│                           │   │ Mật khẩu     │ 👁 │   │     │ │ Mật khẩu     │ 👁 │ │
│  (panel bg.subtle,        │   └──────────────┴───┘   │     │ └──────────────┴───┘ │
│   chỉ trang trí)          │   [   Đăng nhập   ]      │     │ [    Đăng nhập     ] │
│                           │   ⓘ Chưa có tài khoản?…  │     │ ⓘ Chưa có tài khoản? │
└───────────────────────────┴──────────────────────────┘     └──────────────────────┘
Tablet: một cột giữa, card form rộng 400.
```

- **Component:** Card (form, `surface`, radius 16), Input, Password Input, Button `primary lg`, Error State inline, HanziText (minh họa).
- **State:** đang gửi (nút loading, ô khóa) · lỗi danh tính → một câu "Email hoặc mật khẩu không đúng." (ô mật khẩu xóa, focus về ô mật khẩu) · quá nhiều lần → thông điệp rate-limit · không kết nối máy chủ → Error State section "Không kết nối được máy chủ đăng nhập" + Thử lại · offline → Offline State ("Cần mạng để đăng nhập"; nếu đã có phiên vẫn vào app học offline) · BLOCKED (thiếu cấu hình Supabase — chỉ M0/dev, giữ `login-blocked`).
- **M1 — các màn hình tiếp theo cùng bố cục:**
  - _Đổi mật khẩu bắt buộc_: "Đặt mật khẩu mới để bắt đầu" · mật khẩu hiện tại · mật khẩu mới (yêu cầu ≥ 12 ký tự hiện trực tiếp) · nhập lại · nút "Lưu và đăng nhập lại". Không có điều hướng nào khác ngoài Đăng xuất.
  - _Chưa được cấp quyền_ (membership pending/disabled): Empty State "Tài khoản chưa được kích hoạt — liên hệ chủ ứng dụng" + Đăng xuất. Không lộ lý do cụ thể.
- **Điều hướng:** sau đăng nhập → Hôm nay (M1: qua kiểm tra `GET /v1/me`). Giữ `data-testid`: `login-email`, `login-password`, `login-submit`, `login-message`, `invite-only-note`, `login-signed-in`.

---

## 2. Hôm nay (Dashboard học tập hằng ngày)

**Hiện trạng:** **[M0]** trang chủ chỉ có lời chào, card "Hôm nay" (chữ giải thích), card đồng bộ, lưới link Phòng thử. **[M3]** thẻ đến hạn, mục tiêu ngày, bắt đầu phiên ôn. **[M2]** từ mới trong ngày. **[M7]** streak, XP, nhắc học, gợi ý AI.

**IA (đích, M3+):** Lời chào + ngày → **Hành động chính: "Bắt đầu ôn (12 thẻ)"** → Mục tiêu hôm nay (Progress Ring) → Tiếp tục bài học (thư viện) → Từ mới hôm nay → Luyện kỹ năng (viết/nghe/nói) → (M7) chuỗi ngày + gợi ý gia sư AI.

```text
Desktop ≥1280 (sidebar mở)
┌──────────┬───────────────────────────────────────────────────────────────┐
│ [学]     │ Chào buổi sáng, Lan              (M7: 🔥 5 ngày) [Sync ●]      │
│ ▣ Hôm nay│ ┌─────────────────────────────────────┐ ┌───────────────────┐ │
│ ◇ Luyện  │ │ ÔN TẬP HÔM NAY (M3)                 │ │ Mục tiêu ngày (M3)│ │
│ ◇ Từ điển│ │ 12 thẻ đến hạn · ~6 phút            │ │   ◯ 8/20 thẻ      │ │
│ ◇ Thư    │ │ [ Bắt đầu ôn ]                      │ │                   │ │
│   viện   │ └─────────────────────────────────────┘ └───────────────────┘ │
│          │ ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐ │
│ ─────    │ │Tiếp tục bài (M2) │ │Từ mới hôm nay(M2)│ │Luyện kỹ năng   │ │
│ Phòng thử│ │HSK 1 · Bài 3     │ │ 山 shān · núi …  │ │ 写 Viết  听 Nghe│ │
│ [● Đồng  │ └──────────────────┘ └──────────────────┘ └────────────────┘ │
│  bộ]     │ (M7) ┌ Gợi ý từ gia sư AI (highlight lavender) ┐              │
│ (A) Lan ▾│      └──────────────────────────────────────────┘              │
└──────────┴───────────────────────────────────────────────────────────────┘
Tablet: sidebar 72 · lưới 2 cột (ôn tập full-width, các card 2 cột).
Mobile: top bar (logo, sync) · card Ôn tập full-width + nút lg · Mục tiêu · danh sách card 1 cột · bottom nav.
```

**Phiên bản M0 (sau PR-5 — trung thực):**

```text
┌─────────────────────────────────────────────────────────────┐
│ Chào bạn 👋                                    [Sync ●]     │
│ ┌ Empty State "coming-soon" ─────────────────────────────┐  │
│ │  学  Lịch ôn hằng ngày sẽ có ở đây                     │  │
│ │  Thẻ đến hạn, mục tiêu ngày và từ mới — ra mắt ở M3.   │  │
│ │  [Ra mắt ở M3]                                          │  │
│ └────────────────────────────────────────────────────────┘  │
│ ┌ Đồng bộ (dữ liệu thật) ┐  ┌ Phòng thử nền tảng (M0) ──┐   │
│ │ 0 chờ · 0 lỗi          │  │ Viết · Micro · PDF · …     │   │
│ └────────────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **Component:** PageHeader, Card (`interactive` cho lối tắt), Button `primary lg` (một nút duy nhất), Progress Ring, Badge `count`, Streak Indicator (M7), Empty State, Skeleton, Sync Indicator.
- **State:** loading (skeleton các card, dữ liệu cục bộ hiện ngay) · không có thẻ đến hạn (Empty State tích cực "Bạn đã ôn xong hôm nay" + "Học thêm từ mới") · người mới (first-use: "Chọn giáo trình đầu tiên") · offline (vẫn ôn được thẻ đã tải; banner offline) · lỗi tải (Error State từng card, không chặn cả trang).
- **Quy tắc:** không hiện XP/streak/mục tiêu bằng số 0 hay số mẫu trước khi có engine thật.

---

## 3. Từ điển tiếng Trung

**Hiện trạng:** **[M0]** khung bố cục với 3 từ mẫu ghi "bản xem trước bố cục" — V2 bỏ dữ liệu mẫu khỏi trang này (chuyển sang Component gallery) và hiện Empty State "coming-soon". **[M2]** lexicon dùng chung + từ vựng cá nhân, tìm theo Hán tự/pinyin (có/không dấu)/tiếng Việt, ghi chú, tag. **[M5]** chiết tự có nguồn. **[M6]** nghe phát âm.

**IA:** Ô tìm → bộ lọc (Tất cả · Của tôi · HSK · Tag) → danh sách kết quả (Hán tự, pinyin, nghĩa ngắn, badge "Đã lưu") → chi tiết: chữ lớn + pinyin + nghe · nghĩa · Tabs (Ví dụ · Chiết tự · Ghi chú) · hành động "Thêm vào ôn tập" / "Luyện viết".

```text
Desktop ≥1024: danh sách + chi tiết
┌──────┬──────────────────────────┬──────────────────────────────────────┐
│ nav  │ (⌕ Tìm Hán tự, pinyin, Việt)│  山   shān  🔈                      │
│      │ [Tất cả|Của tôi|HSK▾]    │  hanzi.xl  pinyin.lg                 │
│      │ ───────────────────────  │  núi; ngọn núi                       │
│      │ 山 shān   núi        ●   │  [Ví dụ | Chiết tự | Ghi chú]        │
│      │ 水 shuǐ   nước           │  · 山上 shānshàng — trên núi          │
│      │ 人 rén    người          │  [+ Thêm vào ôn tập] [写 Luyện viết] │
└──────┴──────────────────────────┴──────────────────────────────────────┘
Tablet (768–1023): như desktop, cột danh sách 280 px.
Mobile: tìm dính đầu → danh sách → chạm mục → trang chi tiết /dictionary/[id] (Back về danh sách, giữ vị trí cuộn).
```

- **Component:** Search, Tabs (segmented lọc + underline chi tiết), danh sách (hàng 64 px, HanziText `lg`, Pinyin, nghĩa 1 dòng cắt), Badge, Button, Empty/No-results, Skeleton hàng, Audio (M6).
- **State:** chưa nhập (gợi ý: lịch sử tìm, từ mới đây) · không kết quả ("Thử pinyin không dấu: shan") · offline (tìm trên dữ liệu đã tải; nghe phát âm/AI cần mạng) · lỗi đồng bộ từ cá nhân → Sync Indicator.
- **Bàn phím:** `/` focus tìm, ↑/↓ chọn kết quả, Enter mở chi tiết.

---

## 4. Luyện tập (flashcard / quiz)

**Hiện trạng:** **[M0]** trang liệt kê 6 dạng bài + milestone, link tới khung viết. Registry `QuizType` (6 loại) và mapping kỹ năng đã có trong `packages/contracts`/`domain`. **[M3]** phiên ôn SRS theo kỹ năng, flashcard, chọn nghĩa/Hán tự/ghép pinyin. **[M5]** viết. **[M6]** nghe. **[M7]** XP.

**IA:** Trang Luyện tập: "Ôn tập đến hạn" (CTA) → chọn kỹ năng (Nghĩa · Hán tự · Pinyin · Nghe · Viết · Nói) với số thẻ đến hạn mỗi kỹ năng → luyện tự do theo bài/tag. **Phiên** (chế độ tập trung): Progress Bar → câu hỏi → trả lời → phản hồi → tiếp → thẻ tổng kết.

```text
Phiên quiz — Desktop (nội dung tối đa 720, giữa)        Mobile (chế độ tập trung)
┌───────────────────────────────────────────────┐       ┌──────────────────────┐
│ ✕ Thoát      ━━━━━━━━━░░░░░  7/20             │       │ ✕   ━━━━━░░░░  7/20  │
│                                               │       │                      │
│            Chọn nghĩa đúng                    │       │  Chọn nghĩa đúng     │
│                 山                            │       │        山            │
│               shān 🔈                          │       │      shān 🔈         │
│  ┌──────────────┐  ┌──────────────┐           │       │ ┌──────────────────┐ │
│  │ 1  núi       │  │ 2  nước      │           │       │ │ núi              │ │
│  └──────────────┘  └──────────────┘           │       │ ├──────────────────┤ │
│  ┌──────────────┐  ┌──────────────┐           │       │ │ nước             │ │
│  │ 3  người     │  │ 4  cây       │           │       │ │ …                │ │
│  └──────────────┘  └──────────────┘           │       │ └──────────────────┘ │
│ ── sau khi trả lời: thanh phản hồi đáy ─────  │       │ ┌ ✓ Chính xác!  ───┐ │
│ ✓ Chính xác!  山 shān — núi    [Tiếp tục ↵]   │       │ │ [   Tiếp tục   ]  │ │
└───────────────────────────────────────────────┘       └──────────────────────┘
Flashcard: thẻ giữa màn hình, chạm/Space lật, sau khi lật: [Quên][Khó][Nhớ][Dễ] (phím 1–4).
Thẻ tổng kết: số câu, độ chính xác, thời gian, (M7) +XP, chuỗi ngày; nút "Xong" và "Ôn thêm 10 thẻ".
```

- **Component:** Progress Bar, Flashcard, đáp án (Card `interactive` dạng nút lớn, chọn → viền `primary`; đúng → `success.subtle` + check; sai → `error` viền + hiện đáp án đúng), thanh phản hồi (sheet nhỏ cố định đáy, `role="status"`), Button `success lg` "Tiếp tục", Audio (M6), Badge, Dialog xác nhận thoát.
- **State:** không có thẻ đến hạn (Empty State + luyện tự do) · đang tải phiên (skeleton thẻ) · offline (phiên chạy trên dữ liệu cục bộ; kết quả vào outbox; Sync Indicator) · lỗi lưu kết quả (không mất câu trả lời — giữ trong outbox, báo trong Sync Indicator).
- **Playful:** "bật" nhẹ khi đúng, gợi ý thân thiện khi sai, thẻ tổng kết với một hiệu ứng mừng. Không giới hạn mạng sống/"tim".
- **M0 (PR-5):** trang Luyện tập hiển thị 6 dạng bài thành card `coming-soon` có milestone + lối vào khung viết M0; không mô phỏng phiên quiz.

---

## 5. Thư viện giáo trình và tài liệu

**Hiện trạng:** **[M0]** trang khung (2 card mô tả) + spike tải PDF ở Phòng thử (kiểm tra loại/kích thước/`%PDF-`, lưu bucket private khi có Supabase). **[M2]** khóa học → chương → bài, starter fixture có nguồn (D-012). **[M4]** nhập giáo trình PDF: hàng đợi xử lý, trích xuất, người dùng duyệt/sửa, xuất bản bài.

**IA:** Tabs **Giáo trình** (khóa học đang học + tiến độ) · **Tài liệu của tôi** (PDF đã tải + trạng thái xử lý) → chi tiết khóa học: danh sách chương/bài, nút "Học bài tiếp theo" → bài học: từ vựng, hội thoại, luyện tập.

```text
Desktop
┌──────┬──────────────────────────────────────────────────────────────────┐
│ nav  │ Thư viện                                   [+ Nhập PDF] (M4)    │
│      │ [Giáo trình | Tài liệu của tôi]                                  │
│      │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│      │ │ HSK 1 (M2)   │ │ Starter (M2) │ │ + Thêm khóa  │               │
│      │ │ ━━━━░░ 40%   │ │ ━░░░░░ 10%   │ │              │               │
│      │ │ Bài 3 › Tiếp │ │              │ │              │               │
│      │ └──────────────┘ └──────────────┘ └──────────────┘               │
│      │ Tài liệu: hàng | tên.pdf | 2,1 MB | ● Đang xử lý (M4) | ⋯        │
└──────┴──────────────────────────────────────────────────────────────────┘
Tablet: lưới 2 cột. Mobile: danh sách card 1 cột; "Nhập PDF" là nút trong tab Tài liệu.
```

- **Component:** Tabs, Card `interactive` (khóa học, Progress Bar), File Upload (sheet/dialog), danh sách tài liệu + Badge trạng thái (Đang tải · Đang kiểm tra · Đang xử lý (M4) · Sẵn sàng · Lỗi), Empty State, Skeleton.
- **State:** chưa có khóa học (first-use: "Chọn giáo trình khởi đầu" — M2) · tải lên offline (vô hiệu, giải thích) · xử lý lỗi (Error State theo tài liệu, "Thử lại") · tệp bị từ chối (lý do cụ thể).
- **M0 (PR-5):** tab Tài liệu = Empty State "coming-soon (M4)" + liên kết "Thử tải PDF (Phòng thử)"; File Upload V2 áp dụng trong `/lab/upload`, giữ nguyên kiểm tra và nhãn LIVE/MOCK.

---

## 6. Luyện viết chữ Hán

**Hiện trạng:** **[M0]** `/lab/handwriting`: canvas chạm/chuột/bút, nộp nét tới API; nhận dạng **TẮT** trên Preview/production (HanziLookup chỉ dev, D-029 chờ duyệt giấy phép) → nhãn MOCK/"chưa được cấu hình". **[M5]** trò chơi gợi ý → viết, thứ tự nét, chấm, lặp lại theo SRS kỹ năng viết.

**IA (M5):** chọn bộ chữ (từ ôn tập/bài học) → phiên viết: gợi ý (nghĩa + pinyin + nghe, chữ ẩn) → viết → nộp → kết quả (đúng/sai, so sánh nét, xem thứ tự nét) → tiếp.

```text
Desktop                                                   Mobile (tập trung)
┌───────────────────────────────────────────────┐        ┌──────────────────────┐
│ ✕ Thoát            ━━━━░░░░  3/10              │        │ ✕   ━━━░░░░  3/10    │
│ ┌──────────────────────┐  ┌──────────────────┐ │        │ "núi" · shān 🔈      │
│ │  ╲   │   ╱  (lưới 米) │  │ Gợi ý            │ │        │ ┌──────────────────┐ │
│ │ ───  ┼  ───  canvas   │  │ núi · shān 🔈     │ │        │ │                  │ │
│ │  ╱   │   ╲  480×480   │  │ [Xem nét đầu]    │ │        │ │  canvas vuông    │ │
│ │                       │  │ Kết quả:          │ │        │ │  (rộng − 32)     │ │
│ └──────────────────────┘  │ 山 ✓ (M5)         │ │        │ └──────────────────┘ │
│ [↶ Hoàn tác][⌫ Xóa][Nộp] │                   │ │        │ [↶] [⌫]   [ Nộp ]   │
│                           └──────────────────┘ │        └──────────────────────┘
└───────────────────────────────────────────────┘
Điện thoại ngang: canvas trái theo chiều cao, gợi ý + nút phải.
```

- **Component:** Handwriting Canvas (khung V2), IconButton toolbar, Card gợi ý, StatusBadge (MOCK/LIVE/BLOCKED giữ nguyên), Progress Bar (M5), Audio (M6), kết quả ứng viên (nút HanziText `lg`).
- **State:** chưa có nét (nút Nộp disabled) · đang gửi · nhận dạng tắt ("Nhận dạng chưa được cấu hình trên bản này" — trung thực) · offline (vẫn viết được; nộp cần mạng — Offline State) · lỗi API (Error State + Thử lại).
- **Ghi chú M0:** PR-5 chỉ đổi khung, toolbar và bố cục trang Phòng thử; không đổi xử lý nét, không bật nhận dạng.

---

## 7. Định hướng các màn hình sau

| Màn hình             | Milestone                                              | Định hướng                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gia sư AI**        | M7 (Realtime: D-004, sau test thật)                    | Giao diện chat tối giản: tin nhắn người dùng (nền `primary.subtle`), gia sư (nền `surface`, nhãn lavender "AI"); chữ Hán trong câu trả lời bấm được → tra từ điển; gợi ý câu hỏi dạng chip; streaming hiển thị dần; nút giọng nói (khi có). Ghi rõ "AI có thể sai"; chi phí/giới hạn hiển thị trung thực. Offline: Empty State "Cần mạng". Trước M7 không có mục này trên điều hướng. |
| **Luyện nói / nghe** | M6 (M0 có spike ghi âm, chấm Azure MOCK/TẮT)           | Audio Recorder lớn giữa màn hình; câu mẫu Hán tự + pinyin + nghe (tốc độ 0.5–1×); kết quả theo âm tiết: màu + ký hiệu (✓ / ~ / ✕) + điểm thanh điệu; nghe lại bản ghi và mẫu cạnh nhau. Không hiện điểm khi chấm là MOCK (nhãn rõ).                                                                                                                                                   |
| **Hồ sơ**            | M0 khung; M1 tài khoản                                 | Thông tin tài khoản (email, vai trò), **Đổi mật khẩu (M1)**, Đăng xuất (M1: xóa dữ liệu cục bộ), Cài đặt ứng dụng (PWA, tùy chọn), Kiểm tra kỹ thuật (Phòng thử). Không có xóa tài khoản tự phục vụ (admin làm — D-037).                                                                                                                                                              |
| **Tiến độ học**      | M3 (dữ liệu), M7 (XP)                                  | Biểu đồ đơn giản theo tuần (cột, 1 màu `primary`), độ thành thạo theo kỹ năng (thanh), từ khó nhất; mọi biểu đồ có bảng số thay thế cho trình đọc màn hình. Không có bảng xếp hạng giữa người dùng (app riêng tư, nhóm nhỏ) trừ khi chủ dự án yêu cầu.                                                                                                                                |
| **Cài đặt**          | Một phần trước M1 (giao diện, phím tắt); M7 (nhắc học) | Giao diện (Sáng/Tối/Theo hệ thống), cỡ chữ Hán, tô màu thanh điệu (M2+), hiển thị pinyin mặc định, phím tắt, nhắc học (M7: trong app bắt buộc, Web Push tùy chọn — D-024), dữ liệu offline (dung lượng đã dùng, xóa cache).                                                                                                                                                           |

## 8. Ma trận trạng thái chung

| Trạng thái               | Cách hiển thị                             | Component                     |
| ------------------------ | ----------------------------------------- | ----------------------------- |
| Loading lần đầu          | Skeleton đúng hình (sau 300 ms)           | Skeleton                      |
| Đang làm mới nền         | Không chặn; chỉ báo nhỏ trong header card | Spinner 16                    |
| Trống (chưa dùng)        | Empty State `first-use`                   | Empty State                   |
| Tính năng chưa có        | Empty State `coming-soon` + milestone     | Empty State + Badge           |
| Không kết quả            | Empty State `no-results`                  | Empty State                   |
| Lỗi tải/lưu              | Error State cấp section/page              | Error State                   |
| Offline                  | Banner + Offline State ở chỗ cần mạng     | Offline State, Sync Indicator |
| Chờ/lỗi đồng bộ          | Sync Indicator (G1)                       | Sync Indicator                |
| Không đủ quyền (M1)      | Màn hình "chưa được cấp quyền"            | Empty State                   |
| MOCK/BLOCKED (Phòng thử) | StatusBadge có chữ                        | Badge                         |
