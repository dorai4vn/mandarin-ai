# Ma trận tương thích trình duyệt & thiết bị (M0-PWA)

Ngày: 2026-11-23 · Phạm vi: D-028 (Chrome, Edge, Firefox, Safari bản hiện đại; Windows, macOS, iOS, Android; desktop, tablet, phone).

Nhãn: **VERIFIED (auto)** = Playwright chạy thật trong môi trường này · **CI** = đã viết test, chạy trên GitHub Actions (chưa có kết quả tại thời điểm viết) · **MANUAL** = cần kiểm thử trên thiết bị thật · **BLOCKED** = thiếu tài nguyên · **MOCKED** = chạy bằng adapter giả có nhãn.

## 0. Kết quả CI chính thức
| Commit | Chromium | Firefox | WebKit |
|---|---|---|---|
| `cd855ed` (run 45241745204) | PASS | **FAIL** 68 pass / 7 skip / 3 fail — ghi âm treo (AudioContext tạo sau `await`, bị chính sách autoplay giữ `suspended`) | **FAIL** 64 pass / 11 skip / 3 fail — `page.reload()` khi offline: "WebKit encountered an internal error" |
| `15620cc` (run 45243746422) | PASS | xem `docs/M0_PWA_REPORT.md` | **PASS** 67 pass / 11 skip — test SW trên WebKit kiểm precache + controller; **điều hướng offline trên Safari là mục kiểm tay** (SMOKE_TEST B10) |

## 1. Kiểm thử tự động (Playwright 1.63)
Viewport: mobile 390×844 (touch, isMobile*), tablet 820×1180 (touch), desktop 1440×900 (chuột). *Firefox không hỗ trợ giả lập `isMobile`.

| Bộ test | Chromium mobile | Chromium tablet | Chromium desktop | Firefox ×3 | WebKit ×3 |
|---|---|---|---|---|---|
| Layout: đúng kiểu điều hướng, không cuộn ngang (6 trang) | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Desktop không phải bản mobile phóng to; điều hướng bằng bàn phím | — | — | VERIFIED | CI | CI (bàn phím: skip, Safari mặc định không Tab tới link) |
| Capability report, không có cảnh báo thiếu tính năng cốt lõi | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Canvas: chuột / chạm / bút → nhận dạng 山 (nét tổng hợp) qua API | VERIFIED (touch, pen) | VERIFIED (3 loại) | VERIFIED (3 loại) | CI | CI |
| Chữ khác không được chấm đúng; chưa đăng nhập có thông báo | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Offline: ghi khi mất mạng → đóng tab → mở lại → gửi đúng 1 lần | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Mất phản hồi server → thử lại → `duplicate`, không trùng | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Không có IndexedDB → bộ nhớ tạm, app vẫn chạy online | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Upload PDF (chọn tệp), chặn tệp giả PDF trước khi gửi | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Kéo-thả PDF | — | — | VERIFIED | CI | CI |
| Ghi âm micro giả → WAV 16 kHz mono 16-bit → chấm (MOCK) | VERIFIED | VERIFIED | VERIFIED | CI | skip (Playwright WebKit không có micro giả) → MANUAL |
| Từ chối quyền micro → hướng dẫn khôi phục | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Không có getUserMedia → thông báo tương thích, app khác vẫn chạy | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Realtime client secret (MOCK) | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Manifest hợp lệ; cài đặt là tùy chọn | VERIFIED | VERIFIED | VERIFIED | CI | CI |
| Service worker active; app shell mở khi offline; trang chưa mở → `offline.html` | VERIFIED | VERIFIED | VERIFIED | CI (skip nếu engine không bật SW) | CI (skip nếu engine không bật SW) |

Firefox và WebKit **không cài sẵn** trong môi trường cloud này (không được phép `playwright install`) → chạy trong job `e2e` của CI (`chromium`, `firefox`, `webkit`).

## 2. Kiểm thử thủ công trên thiết bị thật (bắt buộc trước nghiệm thu)
| Thiết bị / trình duyệt | Trạng thái |
|---|---|
| iPhone — Safari (tab) | MANUAL — BLOCKED: cần URL HTTPS + thiết bị của chủ dự án |
| iPhone — Home Screen (đã cài) | MANUAL — BLOCKED (như trên) |
| Desktop — Chrome/Edge (Windows hoặc macOS) | MANUAL — BLOCKED (như trên) |
| Desktop — Firefox / Safari macOS | MANUAL — khuyến nghị |
| Android — Chrome | MANUAL — khuyến nghị |
| iPad/tablet + bút | MANUAL — khuyến nghị (Pointer `pen`, áp lực) |

## 3. Khác biệt đã biết giữa các trình duyệt (đầu vào thiết kế)
Xem bảng "Browser constraints" trong `docs/ARCHITECTURE.md`. Điểm chính: Safari/Firefox không có Background Sync; Web Push trên iOS chỉ cho app đã thêm vào Màn hình chính (iOS ≥ 16.4); MediaRecorder khác định dạng (đã tránh bằng WAV từ AudioWorklet); private mode có thể chặn IndexedDB (đã có fallback); `navigator.permissions.query({name:'microphone'})` không có ở mọi trình duyệt (UI xử lý trạng thái "chưa rõ").
