# Smoke test thủ công — Preview (M0-PWA)

Ghi lại cho **mỗi** thiết bị: tên thiết bị, hệ điều hành + phiên bản, trình duyệt + phiên bản, URL Preview, commit (hiện ở Vercel), ngày giờ. Mỗi dòng ghi **ĐẠT / KHÔNG ĐẠT / KHÔNG ÁP DỤNG** + ảnh chụp (hoặc quay màn hình) khi không đạt.

Ký hiệu cột "Cần": `—` = không cần tài khoản/khóa · `SB` = cần Supabase dev (đăng nhập) · `MOCK` = cần `ALLOW_MOCKS_IN_PREVIEW=true` · `KEY` = cần khóa OpenAI/Azure thật.

## A. Chrome hoặc Edge trên máy tính (Windows/macOS), cửa sổ ≥ 1280 px
| # | Bước | Kỳ vọng | Cần | Kết quả |
|---|---|---|---|---|
| A1 | Mở URL Preview (đăng nhập Vercel nếu được hỏi) | Trang chủ, **sidebar bên trái** có 6 mục | — | |
| A2 | Thu hẹp cửa sổ dần từ rộng → hẹp | ≥1280: sidebar; 768–1279: thanh rail biểu tượng; <768: thanh tab dưới. Không có thanh cuộn ngang | — | |
| A3 | Dùng phím Tab/Enter để đi tới "Từ điển" | Có viền focus rõ ràng; Enter mở trang | — | |
| A4 | Phòng thử → Khả năng trình duyệt | Không có cảnh báo đỏ; bảng hiện "Kết nối bảo mật: Có" | — | |
| A5 | Phòng thử → Viết chữ Hán: vẽ bằng chuột | Nét vẽ mượt; "Thiết bị nhập vừa dùng: mouse"; trang không cuộn | — | |
| A6 | Bấm "Nộp bài" khi chưa đăng nhập | Thông báo "Bạn chưa đăng nhập" (không treo, không lỗi trắng) | — | |
| A7 | Phòng thử → Micro: Bắt đầu ghi → trình duyệt hỏi quyền → Cho phép → nói 2 giây → Dừng → Nghe lại (thử 0.5×) | Hiện "WAV 16000 Hz · 1 kênh · 16-bit"; nghe lại được | — | |
| A8 | Chặn quyền micro (biểu tượng ổ khóa cạnh địa chỉ) → tải lại → Bắt đầu ghi | Thông báo "Quyền micro bị từ chối" + hướng dẫn bật lại | — | |
| A9 | Phòng thử → Tải PDF: kéo-thả một PDF vào khung; thử thêm một tệp .txt đổi tên thành .pdf | PDF thật: chuyển sang bước gửi (chưa đăng nhập → thông báo đăng nhập); tệp giả: "Tệp không phải PDF" | — | |
| A10 | Phòng thử → Offline: DevTools → Network → Offline → lưu một ghi chú → đóng tab → mở lại tab → bỏ Offline | Ghi chú còn; "chờ" > 0 khi chưa đăng nhập (không mất dữ liệu) | — | |
| A11 | Biểu tượng cài đặt trên thanh địa chỉ (Chrome/Edge) → Cài đặt | App mở trong cửa sổ riêng; **không cài vẫn dùng được mọi thứ** | — | |
| A12a | Nhập email **chưa được mời** ở Phiên đăng nhập | App hiện **cùng thông báo trung tính** như email được mời ("Nếu email này đã được quản trị viên cấp quyền…"); không nhận được mã; **không** có user mới trong Supabase → Users (D-037) | SB | |
| A12b | Gọi trực tiếp Auth API đăng ký bằng publishable key (Claude cung cấp lệnh `curl` mẫu, không cần secret) | Bị từ chối (`Signups not allowed`) | SB | |
| A12c | Trong app không có nút/đường dẫn "Đăng ký"; mở `/signup`, `/register` | Chỉ có "Đăng nhập bằng mã qua email" + ghi chú "chỉ dành cho người được mời"; hai đường dẫn trả trang 404 | — | |
| A12 | Đăng nhập bằng mã OTP với email **đã được admin mời** (Hồ sơ → Phiên đăng nhập) | Email có mã 6 số; đăng nhập thành công | SB | |
| A13 | Sau khi đăng nhập: Offline → Đồng bộ ngay | `applied=…`, "chờ=0", `source=mock` (sync server **in-memory**, mất khi API khởi động lại) | SB + MOCK | |
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
| B7 | Tải PDF từ ứng dụng **Tệp** | Chọn được tệp; tệp giả bị từ chối | — | |
| B8 | Offline: lưu ghi chú → bật **Chế độ máy bay** → lưu thêm → đóng hẳn Safari → mở lại | Ghi chú còn, "chờ" đúng số | — | |
| B9 | Chia sẻ → **Thêm vào MH chính** → mở từ icon | Chạy toàn màn hình (không thanh địa chỉ); có nút điều hướng trong app | — | |
| B10 | Trong app đã cài: bật Chế độ máy bay → mở lại app | Trang chủ vẫn hiện (app shell offline). **Bắt buộc kiểm tay** vì Playwright WebKit không tự động hóa được (CI) | — | |
| B11 | Đăng nhập OTP **trong app đã cài** | Nhập mã 6 số ngay trong app; không phải mở link email | SB | |
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
| C7 | Đăng nhập OTP | Như A12 | SB | |

## D. Kết luận cho mỗi thiết bị
- Tổng ĐẠT / KHÔNG ĐẠT; liệt kê lỗi kèm ảnh.
- Ghi rõ những mục **không kiểm** vì thiếu Supabase/khóa (SB/MOCK/KEY).
