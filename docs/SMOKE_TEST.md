# Smoke test thủ công — Preview (M0-PWA)

Ghi lại cho **mỗi** thiết bị: tên thiết bị, hệ điều hành + phiên bản, trình duyệt + phiên bản, URL Preview, commit (hiện ở Vercel), ngày giờ. Mỗi dòng ghi **ĐẠT / KHÔNG ĐẠT / KHÔNG ÁP DỤNG** + ảnh chụp (hoặc quay màn hình) khi không đạt.

Ký hiệu cột "Cần": `—` = không cần tài khoản/khóa · `SB` = cần Supabase dev (đăng nhập) · `MOCK` = cần `ALLOW_MOCKS_IN_PREVIEW=true` · `KEY` = cần khóa OpenAI/Azure thật.

## A. Chrome hoặc Edge trên máy tính (Windows/macOS), cửa sổ ≥ 1280 px
| # | Bước | Kỳ vọng | Cần | Kết quả |
|---|---|---|---|---|
| A1 | Mở URL Preview (đăng nhập Vercel nếu được hỏi) | Trang chủ, **sidebar bên trái** có 6 mục | — | |
| A2 | Thu hẹp cửa sổ dần từ rộng → hẹp | ≥1280: sidebar; 768–1279: thanh rail biểu tượng; <768: thanh tab dưới. Không có thanh cuộn ngang | — | |
| A3 | Dùng phím Tab/Enter để đi tới "Từ điển cá nhân" | Có viền focus rõ ràng; Enter mở trang | — | |
| A4 | Phòng thử → Khả năng trình duyệt | Không có cảnh báo đỏ; bảng hiện "Kết nối bảo mật: Có" | — | |
| A5 | Phòng thử → Viết chữ Hán: vẽ bằng chuột | Nét vẽ mượt; "Thiết bị nhập vừa dùng: mouse"; trang không cuộn | — | |
| A6 | Bấm "Nộp bài" khi chưa đăng nhập | Thông báo "Bạn chưa đăng nhập" (không treo, không lỗi trắng) | — | |
| A7 | Phòng thử → Micro: Bắt đầu ghi → trình duyệt hỏi quyền → Cho phép → nói 2 giây → Dừng → Nghe lại (thử 0.5×) | Hiện "WAV 16000 Hz · 1 kênh · 16-bit"; nghe lại được | — | |
| A8 | Chặn quyền micro (biểu tượng ổ khóa cạnh địa chỉ) → tải lại → Bắt đầu ghi | Thông báo "Quyền micro bị từ chối" + hướng dẫn bật lại | — | |
| A9 | Phòng thử → Tải PDF: kéo-thả một PDF thật **gần 50 MB** (ví dụ 45–49,9 MB) vào khung; thử một PDF **lớn hơn 50 MB**; thử tệp .txt đổi tên thành .pdf | PDF ≤ 50 MB: chuyển sang bước gửi, hiện "Đang gửi … MB" (chưa đăng nhập → thông báo đăng nhập); > 50 MB: thông báo tên tệp, dung lượng và giới hạn 50 MB, **không** gửi; tệp giả: "Tệp không phải PDF"; trang không đơ khi chọn tệp lớn | — | |
| A10 | Phòng thử → Offline: DevTools → Network → Offline → lưu một ghi chú → đóng tab → mở lại tab → bỏ Offline | Ghi chú còn; "chờ" > 0 khi chưa đăng nhập (không mất dữ liệu) | — | |
| A11 | Biểu tượng cài đặt trên thanh địa chỉ (Chrome/Edge) → Cài đặt | App mở trong cửa sổ riêng; **không cài vẫn dùng được mọi thứ** | — | |
| A12a | Phiên đăng nhập: email **chưa được cấp** + mật khẩu bất kỳ | "Email hoặc mật khẩu không đúng."; **không** có user mới trong Supabase → Users (D-037, D-038) | SB | |
| A12b | Gọi trực tiếp Auth API đăng ký bằng publishable key (Claude cung cấp lệnh `curl` mẫu, không cần secret) | Bị từ chối (`signup_disabled`) | SB | |
| A12c | Trong app không có nút/đường dẫn "Đăng ký", không có ô "mã 6 số"; mở `/signup`, `/register` | Chỉ có form email + mật khẩu và ghi chú "chỉ dành cho người được chủ ứng dụng cấp quyền"; hai đường dẫn trả trang 404 | — | |
| A12d | Email **đã được cấp** + mật khẩu **sai** | **Cùng** thông báo như A12a; ô mật khẩu được xóa | SB | |
| A12 | Email đã được cấp + mật khẩu tạm đúng (Hồ sơ → Phiên đăng nhập) | "Đã đăng nhập"; không cần mở email. DevTools → Application → Local/Session Storage: **không** có mật khẩu (chỉ có phiên của Supabase — giới hạn M0) | SB | |
| A13 | Sau khi đăng nhập: Offline → lưu ghi chú → Đồng bộ ngay | Trên Preview sync server **TẮT** (D-035): chip "Lưu trên thiết bị" + thông báo "Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt."; thao tác vẫn "chờ", **không** hiện "Đã đồng bộ", không mất dữ liệu; DevTools Network **không** có `POST /v1/sync/push`, Console không có 503. (Chỉ môi trường development mới có sync mock in-memory.) | SB | |
| A14 | Sau khi đăng nhập: Tải PDF | Nhãn LIVE, đường dẫn `…/imports/….pdf`; tệp có trong bucket private `documents` | SB | |
| A15 | Viết chữ → Nộp bài sau khi đăng nhập | Nhãn MOCK (adapter mock) hoặc thông báo "chưa được cấu hình" (adapter tắt) | SB (+MOCK) | |
| A16 | Micro → Gửi chấm / Realtime → Xin khóa | MOCK có nhãn hoặc "chưa được cấu hình"; LIVE chỉ khi có khóa | SB (+MOCK/KEY) | |

## B. Safari trên iPhone
| # | Bước | Kỳ vọng | Cần | Kết quả |
|---|---|---|---|---|
| B1 | Mở URL trong Safari | Thanh tab dưới cùng; tiêu đề không bị tai thỏ che; không cuộn ngang | — | |
| B2 | Xoay ngang rồi dọc | Bố cục không vỡ | — | |
| B3 | Viết chữ Hán: viết 山 bằng ngón tay | Trang **không cuộn/zoom** khi viết; "Thiết bị nhập vừa dùng: touch" | — | |
| B4 | Chạm vào ô nhập ghi chú | Không tự phóng to; bàn phím không che ô nhập | — | |
| B5 | Micro: ghi → cho phép → Dừng → Nghe lại | Hỏi quyền bằng hộp thoại của Safari; WAV 16 kHz; nghe được | — | |
| B6 | Từ chối micro (Cài đặt → Safari → Micro, hoặc "aA" → Cài đặt trang web) → thử lại | Thông báo bị từ chối + hướng dẫn | — | |
| B7 | Tải PDF từ ứng dụng **Tệp**: một tệp nhỏ và một tệp **gần 50 MB** (Wi-Fi và 4G nếu được) | Chọn được tệp; tệp ≤ 50 MB gửi được (ghi thời gian); > 50 MB và tệp giả bị từ chối rõ ràng | — | |
| B8 | Offline: lưu ghi chú → bật **Chế độ máy bay** → lưu thêm → đóng hẳn Safari → mở lại | Ghi chú còn, "chờ" đúng số | — | |
| B9 | Chia sẻ → **Thêm vào MH chính** → mở từ icon | Chạy toàn màn hình (không thanh địa chỉ); có nút điều hướng trong app | — | |
| B10 | Trong app đã cài: bật Chế độ máy bay → mở lại app | Trang chủ vẫn hiện (app shell offline). **Bắt buộc kiểm tay** vì Playwright WebKit không tự động hóa được (CI) | — | |
| B11 | Đăng nhập email + mật khẩu **trong app đã cài** | Đăng nhập ngay trong app; trình quản lý mật khẩu của iOS gợi ý/lưu được; không cần email | SB | |
| B12 | Đăng nhập **cùng một người** (tài khoản của chính mình) trên máy tính (A12) và iPhone — không dùng tài khoản của người khác | Cả hai đăng nhập được. (Đồng bộ dữ liệu giữa thiết bị: **chưa có** — M1) | SB | |

## C. Chrome trên Android
| # | Bước | Kỳ vọng | Cần | Kết quả |
|---|---|---|---|---|
| C1 | Mở URL | Thanh tab dưới; không cuộn ngang | — | |
| C2 | Viết chữ bằng ngón tay (và bút nếu máy có) | Không cuộn trang; "touch" hoặc "pen" | — | |
| C3 | Micro: ghi/nghe lại, từ chối rồi cấp lại quyền | Như A7–A8 | — | |
| C4 | Tải PDF từ trình chọn tệp | Như A9 | — | |
| C5 | Offline bằng Chế độ máy bay | Như B8 | — | |
| C6 | Menu ⋮ → **Cài đặt ứng dụng / Thêm vào màn hình chính** | Cài được; không cài vẫn dùng được | — | |
| C7 | Đăng nhập email + mật khẩu | Như A12, A12a, A12d | SB | |

## M1 — Tài khoản, đăng xuất, đồng bộ hai thiết bị (D-042)

Cần: dự án Supabase có migration `20261125100000_m1_sync_operations.sql`, API Railway có `SUPABASE_PUBLISHABLE_KEY`, hai tài khoản tạo trên Dashboard (A, B).

| # | Bước | Mong đợi |
|---|---|---|
| M1-1 | Chủ dự án tạo tài khoản A trên Dashboard (Add user → Create new user, Auto Confirm) | Tạo được, không cần email |
| M1-2 | Mở `/login` trên **điện thoại**, đăng nhập A | Về trang chủ; Hồ sơ hiện email A |
| M1-3 | Tải lại trang, đóng mở lại tab/ứng dụng đã cài | Vẫn đăng nhập |
| M1-4 | `/lab/offline`: bật chế độ máy bay, thêm ghi chú, tắt chế độ máy bay | "chờ=1" rồi "chờ=0"; chip không báo "Đã đồng bộ" trước khi gửi xong |
| M1-5 | Đăng nhập A trên **máy tính**, mở `/lab/offline` | Thấy ghi chú từ điện thoại (đúng một lần) |
| M1-6 | Hồ sơ → Đăng xuất trên máy tính | Về `/login`; `/lab/offline` yêu cầu đăng nhập |
| M1-7 | Đăng nhập B trên máy tính | Không thấy ghi chú của A |
| M1-8 | Thử đăng ký: không có nút đăng ký; (tùy chọn) gọi `POST <Project URL>/auth/v1/signup` bằng publishable key | Bị từ chối |

Ghi kết quả từng bước (đạt/không đạt + thiết bị/trình duyệt). Trước khi có kết quả này, M1 ghi "smoke thiết bị thật: chưa xác minh".

## D. Kết luận cho mỗi thiết bị
- Tổng ĐẠT / KHÔNG ĐẠT; liệt kê lỗi kèm ảnh.
- Ghi rõ những mục **không kiểm** vì thiếu Supabase/khóa (SB/MOCK/KEY).
