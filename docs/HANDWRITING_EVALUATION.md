# Đánh giá nhận dạng chữ viết tay (D-020, D-029)

**Kết luận hiện tại: CHƯA có số đo trên chữ viết tay thật. Không được khẳng định chất lượng nhận dạng.**

## 1. Adapter đang thử
| Thuộc tính | Giá trị |
|---|---|
| Adapter | `hanzilookup-mmah` (`HanziLookupRecognizer`, chạy trên `apps/api`) |
| Thư viện | `hanzilookup-js` 1.0.3 (npm ghi ISC; phái sinh từ HanziLookupJS — **GPL-3**) |
| Dữ liệu | `mmah.json` (9 507 chữ, phái sinh Make Me a Hanzi, **Arphic Public License**), SHA-256 `287943446fe52cef43df1ba47619a3c040e5924b6031b90939e880711dbc70ae`, không commit — tải bằng `pnpm fetch:handwriting-data` |
| Thang điểm | Cao hơn = khớp hơn (`scoreOrder: higher_is_better`) |
| Chạy ở đâu | Server (không gửi mã GPL xuống trình duyệt) |
| Giấy phép | **Chờ chủ dự án duyệt** (D-029) |

## 2. Kết quả đã có (chỉ nét tổng hợp)
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Unit test: nét thẳng tổng hợp của 山 | top-1 = 山 | `packages/adapters/src/server/hanzilookup.test.ts`; Node 22, 7–21 ms |
| E2E Chromium (mouse/touch/pen, 3 viewport): cùng nét tổng hợp vẽ trên canvas | top-1 = 山 | Kiểm tra đường đi canvas → API → adapter, **không** đo chất lượng |
| E2E: một nét ngang (一) | không được chấm là 山 | |

Nét tổng hợp là các đoạn thẳng lý tưởng — dễ hơn nhiều so với chữ viết tay thật.

## 3. Phương pháp đo (cần thực hiện)
1. Thu mẫu bằng trang `/lab/handwriting` (sẽ thêm nút "Lưu mẫu đánh giá" trong bước tiếp theo khi được duyệt) trên: iPhone (ngón tay), desktop (chuột/trackpad), tablet (bút nếu có).
2. Bộ chữ: ≥ 20 chữ HSK cơ bản (gồm 山, 水, 人, 口, 日, 月, 木, 火, 土, 大, 小, 中, 上, 下, 天, 女, 子, 学, 你, 好) × ≥ 5 lượt × mỗi loại thiết bị; ít nhất 2 người viết.
3. Chỉ số: top-1, top-5, độ trễ p50/p95 phía server và end-to-end, tỷ lệ lỗi; tách theo loại thiết bị nhập.
4. Ngưỡng đề xuất để dùng làm adapter mặc định (chủ dự án duyệt): top-1 ≥ 85%, top-5 ≥ 95% trên bộ trên; p95 end-to-end ≤ 800 ms trên 4G.
5. Không đạt → cân nhắc: chuẩn hóa nét (resample, smoothing) phía client; adapter đối chiếu theo chữ đích (Hanzi Writer data) cho chấm bài; dịch vụ thương mại (cần duyệt chi phí/giấy phép).

## 4. Bảng kết quả (điền khi có mẫu thật)
| Thiết bị nhập | Số mẫu | top-1 | top-5 | p50 / p95 (ms) | Người thu / ngày |
|---|---|---|---|---|---|
| iPhone – ngón tay | — | — | — | — | — |
| Desktop – chuột/trackpad | — | — | — | — | — |
| Tablet – bút | — | — | — | — | — |
